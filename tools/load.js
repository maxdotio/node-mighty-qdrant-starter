//
// Formats and loads vector files into Qdrant as points
//

import fs from "fs";
import progress from "progress";
import { v4 as uuidv4} from "uuid";
import { Qdrant } from "qdrant";
import { program } from "commander";

//Qdrant Client
const qdrant = new Qdrant("http://localhost:6333/");

program
  .option('-f, --files <string>')
  .option('-s, --site <string>')
  .parse();

const options = program.opts();

if (!options.files) {
    console.error("You must specify the path to the vector files!")
    process.exit(1);
}

if (!options.site) {
    console.error("You must specify the site name!")
    process.exit(1);
}

//Globals
const vector_files = options.files; //"vectors/outdoors_posts.json/";
const site = options.site //"outdoors";
const ignore_fields = ["vectors","texts","entailed","paragraphs","context","body"];
const batch_size = 10;

//Index name and schema
const name = "ask_life";
const schema = {
    "name":name,
    "vector_size": 384,
    "distance": "Cosine"
};

//Make a new collection
async function create_collection(DELETE) {

	let exists_result = await qdrant.get_collection(name);
	let exists = exists_result.response.result?true:false;

	if (DELETE && exists) {
		let delete_result = await qdrant.delete_collection(name);
		console.log('Collection Deleted')
		exists = false;
	}
	
	if (exists_result.err || !exists) {
	    let create_result = await qdrant.create_collection(name,schema);
	    console.log('Collection Created');
	}
}

function get_files(path) {
    let files = [];
    let filenames = fs.readdirSync(path);
    for(var j=0;j<filenames.length;j++) {
        if(filenames[j].indexOf(".json")>0) {
            files.push({
                "filename":path + filenames[j],
            });
        }
    }
    return files;
}

function get_documents(files,ignore) {
	let payloads = [];
	let documents = [];

	let id = 0;
	for (var i=0;i<files.length;i++) {
	    let doc = JSON.parse(fs.readFileSync(files[i].filename,"utf-8"));
	    if (doc && doc && doc.vectors && doc.vectors.length) {

	    	//Qdrant doesn't accept true/false - convert to an int.
	    	doc.IsAccepted = doc.IsAccepted?1:0;

			//Construct the metadata parent for all sub-points.
			let metadata = {};
			for(var key in doc) {
				if (doc.hasOwnProperty(key) && (ignore.indexOf(key.toLowerCase())<0)) {
					metadata[key] = doc[key];
				}
			}

	    	//For each vector and text pair, create a Qdrant point that we will eventually send to the search engine
	        for(var j=0;j<doc.vectors.length;j++) {
	            let vec = doc.vectors[j];
	            let txt = doc.texts[j];
	            if (vec.length) {
	            	//Each document body might have been split up if it was long.
	            	//We'll create a separate point for each part of the vectorized content.
	                for(var v=0;v<vec.length;v++) {
	                    let vector = vec[v];
	                    let text = txt[v];
	                    let docid = uuidv4();

	                    //Clone the doc metadata into payload and add point-specific data
	                    let payload = JSON.parse(JSON.stringify(metadata));
	                    payload.text = text;
	                    payload.site = site;


	                    //Add it to the main list to be batched later
	                    documents.push({
	                        "id":docid,
	                        "vector":vector,
	                        "payload":payload
	                    });

	                    //IMPORTANT - this is the Qdrant point ID and may change if the file order changes!
	                    id++;
	                }
	            }
	            
	        }
	    }
	}

	return documents;
}


//Create the collection!
await create_collection(false);

//Get and transform the files into Qdrant load-able points.
let files = get_files(vector_files);
let documents = get_documents(files,ignore_fields);

let bar = new progress("Indexing [:bar] :percent remaining::etas elapsed::elapsed (:current/:total)", {complete: "=", incomplete: " ", width: 50, total: parseInt(documents.length/batch_size)+1});
for(var p=0;p<documents.length;p+=batch_size) {
    let batch = documents.slice(p,p+batch_size);
    let response = await qdrant.upload_points(name,batch);
    bar.tick();
}

//Save the payloads to be used at query time.
//let outdoors_answers_payloads = "["+payloads.join(",\n")+"]";
//fs.writeFileSync("data/outdoors_answers_payloads.json",outdoors_answers_payloads,"utf-8");
