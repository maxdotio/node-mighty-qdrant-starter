#!/usr/bin/env bash

docker build ./tools --tag=mighty-indexer
docker run --rm -it --network mqsnet mighty-indexer:latest ./index.sh $*
