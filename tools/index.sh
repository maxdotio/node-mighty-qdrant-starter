#!/usr/bin/env sh

s=$(which mighty-batch)
if [ "$s" = "" ];
then
    npm install -g mighty-batch
    cd tools
    npm install
    cd ..
fi
tar -zxf outdoors_posts.tar.gz
mighty-batch --threads 1 --workers 2 --hosts http://mighty1:5050,http://mighty2:5051 --json outdoors_posts.json --property Paragraphs
node ./load.js --files vectors/outdoors_posts.json/ --name outdoors
