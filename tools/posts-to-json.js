//
// Converts a StackExchange 'Posts.xml' file into a 'posts.json' file ready for Mighty
//

import fs from "fs";
import { Parser } from "xml2js";
import { stripHtml } from "string-strip-html";
import { program } from "commander";

program
  .option('-i, --infile <string>')
  .option('-o, --outfile <string>')
  .option('-s, --site <string>')
  .parse();

const options = program.opts();

if (!options.infile) {
    console.error("You must specify the infile with a valid Posts.xml file!")
    program.help()
    process.exit(1);
}

if (!options.outfile) {
    console.error("You must specify the outfile with a valid json filename!")
    program.help()
    process.exit(1);
}

if (!options.site) {
    console.error("You must specify the site name!")
    process.exit(1);
}

const site = options.site;

const keys = {
    "Id": "int",
    "PostTypeId": "int",
    "AcceptedAnswerId": "int",
    "CreationDate": "date",
    "Score": "int",
    "ViewCount": "int",
    "Body": "string",
    "OwnerUserId": "int",
    "LastEditorUserId": "int",
    "LastEditDate": "date",
    "LastActivityDate": "date",
    "Title": "string",
    "Tags": "string",
    "AnswerCount": "int",
    "CommentCount": "int",
    "FavoriteCount": "int",
    "ContentLicense": "string",
    "ParentId": "int",
    "CommunityOwnedDate": "date",
    "ClosedDate": "date",
    "LastEditorDisplayName": "string",
    "OwnerDisplayName": "string"
};


//Useful for field stats
//Not invoked by default but good to have on hand
function count_attributes(data) {
    let keycounter = {};    
    for(var i=0;i<data.length;i++) {
        let record = data[i].$;
        for(var k in record) {
            if (record.hasOwnProperty(k)) {
                if (!keycounter[k]) keycounter[k] = 0;
                keycounter[k]++;
            }
        }
    }
    console.log(JSON.stringify(keycounter,null,4));
    return keycounter;
}

//Formats a single post into JSON with an appropriate datatype (uses the keys above)
function get_objects(data) {
    let records = [];
    let questions = [];
    for(let i=0;i<data.length;i++) {
        let record = data[i].$;
        let obj = {};

        //Read the properties from the record as specified in the keys schema
        for (var k in keys) {
            if (keys.hasOwnProperty(k) && record.hasOwnProperty(k)) {
                //Cast the value to the key/property type
                if(keys[k] == "int") {
                    obj[k] = parseInt(record[k])
                } else {
                    obj[k] = record[k];
                }
            }
        }
        records.push(obj);

        //Ignore posts with negative scores
        if (obj.PostTypeId == 1 && obj.Score>0) {
            questions[obj.Id] = obj;
        }
    }
    return {
        records:records,
        questions:questions
    };
}

//Useful for paragraph grouping
//Guesses the number of tokens in a block of text
//Assume 4 tokens per presence of a non-word character by default.
//Change tokens_per_non_word to a lower number to live dangerously.
const re_non_word = /([\W]+)/g;
function guess_token_count(text,tokens_per_non_word) {
    tokens_per_non_word = tokens_per_non_word||4;
    return ((text || '').match(re_non_word) || [""]).length * tokens_per_non_word;
}


//Naively splits text into paragraphs using line-breaks and token count guesses
//Tries to find and group so the model doesn't split text in strange places
function get_paragraphs(doc) {
    let paragraphs = doc.Body.split(/[\n][\s]*[\n]/).map((p)=>stripHtml(p).result);
    let paragraph_token_count = paragraphs.map(guess_token_count);
    let texts = [];
    let chunk = [];
    let total = 0;
    for (let p=0;p<paragraphs.length;p++) {       
        //maximum 512 token inputs for the sentence-transformer model we're using.         
        if (total + paragraph_token_count > 512) {
            if (total == 0) {
                //This is a really long paragraph!
                //Todo:  Maybe it needs to be split up somehow?
                texts.push(paragraphs[p]);
                total = 0;
                chunk = [];
            } else {
                //New paragraph pushes length over the limit
                //Save whats there and start a new chunk
                texts.push(chunk.join('\n'));
                total = paragraph_token_count;
                chunk = [paragraphs[p]];
            }
        } else {
            //Add the current paragraph to the chunk!
            total += paragraph_token_count;
            chunk.push(paragraphs[p]);
        }
    }
    if (chunk.length) texts.push(chunk.join('\n'));
    return texts;
}

function get_document(questions,doc) {
    let paragraphs = get_paragraphs(doc);
    let title = questions[doc.ParentId].Title;
    let username = doc.OwnerDisplayName;
    let userid = doc.OwnerUserId;

    //For inference
    doc.Paragraphs = paragraphs;
    doc.Entailed = paragraphs.map(p=>title + ' ' + p);
    doc.Context = stripHtml(doc.Body).result;
    doc.Question = title;
    doc.IsAccepted = (questions[doc.ParentId].AcceptedAnswerId==doc.Id?1:0);

    //For display
    doc.docid = doc.Id;
    doc.url = `https://${site}.stackexchange.com/a/${doc.Id}`;
    doc.author = userid||username||"anonymous";
    doc.published = doc.CreationDate;
    doc.title = title;

    return doc;
}

//Parses the xml2js results into well-typed JSON objects
function get_documents(result) {

    let objects = get_objects(result.posts.row);
    let records = objects.records;
    let questions = objects.questions;
    let documents = [];
    for(let i=0;i<records.length;i++) {
        let rec = records[i];
        if (rec.PostTypeId == 2 && rec.Score>0 && questions[rec.ParentId]) {
            let doc = get_document(questions,rec);
            documents.push(JSON.stringify(doc));
        }
    }

    return documents;

}


//Read the XML file
fs.readFile(options.infile, function(err, raw) {

    if (err) {
        console.log(err);
        process.exit(1);
    }

    //Parse the XML file
    const parser = new Parser();
    parser.parseString(raw, function (err, result) {

        if (err) {
            console.log(err);
            process.exit(1);
        }

        //Convert the posts from XML to JSON
        let documents = get_documents(result)

        //Save to disk
        console.log(documents.length);
        fs.writeFileSync(options.outfile,`[${documents.join(',\n')}]`,"utf-8");

    });

});