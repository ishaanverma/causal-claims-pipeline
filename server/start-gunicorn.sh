# python3 -m venv env
# source env/bin/activate
# pip install --upgrade pip
# pip install -r requirements.txt
# cp -r /nas/home/iverma/causal-graph-pipeline/roberta-model-causal /nas/home/iverma/deploy/causal-graph-pipeline/roberta-model-causal
# echo "UPLOAD_FOLDER=./data/" > .env
# start a worker: rq worker --url redis://localhost:16379
export PORT=12581
export NUM_WORKERS=1
export TIMEOUT=600
export ACCESS_LOG_FILE=./logs/access.logfile
export ERROR_LOG_FILE=./logs/error.logfile
# gunicorn -w $NUM_WORKERS -b 127.0.0.1:$PORT --access-logfile=$ACCESS_LOG_FILE  --error-logfile=$ERROR_LOG_FILE --timeout $TIMEOUT wsgi:app --daemon
gunicorn --worker-class eventlet -w $NUM_WORKERS -b 127.0.0.1:$PORT --access-logfile=$ACCESS_LOG_FILE  --error-logfile=$ERROR_LOG_FILE --timeout $TIMEOUT app:app --daemon
