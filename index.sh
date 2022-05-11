s=$(which mighty-batch)
if [ "$s" = "" ];
then
    npm install -g mighty-batch
fi
tar -zxf outdoors_posts.tar.gz
mighty-batch --threads 1 --workers 2 --host localhost --json outdoors_posts.json --property Paragraphs
cd tools
npm install
cd ..
node tools/load.js --files vectors/outdoors_posts.json/ --site outdoors
