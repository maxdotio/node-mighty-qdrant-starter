#!/usr/bin/env bash

docker build ./tools --tag=mighty-indexer
docker run --rm -v $(pwd)/outdoors_posts.tar.gz:/outdoors_posts.tar.gz:ro -it --network mqsnet mighty-indexer:latest ./index.sh $*
