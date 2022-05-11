import fs from "fs";
import path from "path";
import express from "express";
import { Qdrant } from "qdrant";
import { MightyPool } from "node-mighty";


///
/// Mighty & Qdrant Connections
///
const TOP_K = 10;
const COLLECTION = "ask_life";
const qdrant = new Qdrant("http://qdrant:6333/");
const mighty = new MightyPool("http","mighty1",[5050],"sentence-transformers");

///
/// Express routes
///
let app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(".", "static")));

app.get("/", function (req, res) {
    res.sendFile(path.join(".", "static","index.html"));
});

app.get("/search", async function (req, res) {
    let querystring = req.query.search;
    if(!querystring) {
        res.status(400).send({"message":"Empty search query!"});
    } else {
        let mighty_res = await mighty.get(querystring);
        if (mighty_res.err) {
            res.status(500).send(mighty_res.err);
        } else {
            let vector = mighty_res.response.outputs[0];
            let qdrant_res = await qdrant.query_collection(COLLECTION,{
                "vector":vector,
                "with_payload":true,
                "with_vector":false,
                "top":TOP_K,
                "params": {
                    "hnsw_ef": 128
                }
            });
            if (qdrant_res.err) {
                res.status(500).send(qdrant_res.err);
            } else {
                let results = qdrant_res.response.result;
                res.send(results);
            }
        }
    }
});

app.listen(8000,"0.0.0.0");
console.log("Application listening on http://localhost:8000");
