#!/bin/bash

MIGHTY_PATH=$(dirname "$0")
echo $MIGHTY_PATH

declare -i port
port=5050

declare -i core
core=0

max=$(($cores + 0))
if [ "$max" -eq "0" ]; then
   echo "defaulting to one core"
   max=1
fi
for (( i=0; i<$max; i++ ))
do
	echo "starting $i"
	LD_LIBRARY_PATH=$MIGHTY_PATH:$LD_LIBRARY_PATH $MIGHTY_PATH/mighty-server --port=$port --core=$core "$@" &
	port+=1
	core+=1
done
