# npm install
# npm run build
export REACT_PORT=12580
serve -s build -l $REACT_PORT > ./logs/client.logs 2>&1 &