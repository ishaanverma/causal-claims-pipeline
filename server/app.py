import os
import ast
import csv
import json
from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_restful import Resource, Api, reqparse, inputs
from flask_json import FlaskJSON, json_response
from flask_socketio import SocketIO, join_room, leave_room
from dotenv import load_dotenv, find_dotenv
from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename
from rq import Queue
from rq.job import Job
from redis import Redis

from jobs import create_causal_graph
from topic_model import create_clustered_graph_json

load_dotenv(find_dotenv())

app = Flask(__name__)

CORS(app)
FlaskJSON(app)

api = Api(app)

def env(key, default=None, required=True):
    try:
        value = os.environ[key]
        return ast.literal_eval(value)
    except (SyntaxError, ValueError):
        return value
    except KeyError:
        if default or not required:
            return default
        raise RuntimeError("Missing required environment variable '%s'" % key)


UPLOAD_FOLDER = env('UPLOAD_FOLDER')
DOWNLOAD_FOLDER = env('DOWNLOAD_FOLDER')
REDIS_HOST = env('REDIS_HOST')
REDIS_PORT = env('REDIS_PORT')
ALLOWED_EXTENSIONS = {'csv'}

socketio = SocketIO(app, message_queue=f"redis://{REDIS_HOST}:{REDIS_PORT}", cors_allowed_origins="*")

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
redis_conn = Redis(host=REDIS_HOST, port=REDIS_PORT)
redis_queue = Queue(connection=redis_conn)


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def send_progress_update(data, job):
    socketio.emit(
        'job_status',
        json.dumps(data),
        to=job.id
    )


class File(Resource):
    def get(self, filename):
        response = send_from_directory(
            directory=os.path.join(app.root_path, DOWNLOAD_FOLDER),
            path=filename,
            mimetype="text/csv",
            as_attachment=True,
        )
        return response

    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('file', type=FileStorage, location='files')
        args = parser.parse_args()
        csv_file = args['file']

        if allowed_file(csv_file.filename):
            filename = secure_filename(csv_file.filename)
            csv_file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))

            # read column names
            column_names = None
            with open(os.path.join(app.config['UPLOAD_FOLDER'], filename), 'r') as csvfile:
                csv_reader = csv.reader(csvfile)
                for row in csv_reader:
                    column_names = row
                    break

            return json_response(
                status='success',
                message='file uploaded successfully',
                file_name=filename,
                column_names=column_names
            )
        else:
            return json_response(status_=422, status='failure', message='only csv files allowed')


class Graph(Resource):
    def get(self):
        parser = reqparse.RequestParser()
        parser.add_argument('file_name', required=True, location='args')
        parser.add_argument('column_name', required=True, location='args')
        parser.add_argument('cluster', default=False, type=inputs.boolean, location='args')
        parser.add_argument('preprocess', default=False, type=inputs.boolean, location='args')

        args = parser.parse_args()
        file_name = args['file_name']
        column_name = args['column_name']
        cluster = args['cluster']
        preprocess = args['preprocess']

        # Enqueue job
        job = Job.create(
            create_causal_graph,
            args=(
                os.path.join(app.config['UPLOAD_FOLDER'], file_name),
                column_name,
                send_progress_update
            ),
            kwargs={
                'cluster': cluster,
                'preprocess': preprocess,
                'save_dir': os.path.join(app.root_path, DOWNLOAD_FOLDER),
            },
            timeout='30m',
            connection=redis_conn
        )
        result_job = redis_queue.enqueue_job(job)

        return json_response(jobId=result_job.id, queuePosition=result_job.get_position())


class Cluster(Resource):
    def post(self):
        parser = reqparse.RequestParser()
        parser.add_argument('graph', required=True, location='json')
        parser.add_argument('nr_topics', location='json', type=int, default=0)
        parser.add_argument('n_gram_range', location='json', action='append', type=int)
        parser.add_argument('top_n_words', location='json', type=int, default=10)

        args = parser.parse_args()
        graph = args['graph']
        nr_topics = args['nr_topics']
        top_n_words = args['top_n_words']
        n_gram_range = args['n_gram_range']

        # input validation
        if n_gram_range is None:
            n_gram_range = (1, 2)
        else:
            if n_gram_range[0] > n_gram_range[1]:
                raise ValueError("Incorrect n-gram range")

        n_gram_range = tuple(n_gram_range)
        if nr_topics == 0:
            nr_topics = 'auto'
        elif nr_topics == -1:
            nr_topics = None

        result_df, topics = create_clustered_graph_json(
            graph=graph,
            nr_topics=nr_topics,
            n_gram_range=n_gram_range,
            top_n_words=top_n_words
        )

        return json_response(result_df=result_df, topics=topics)


# @api.representation('text/csv')
# def output_file(data, code, headers):
#     response = send_from_directory(
#         directory=os.path.join(app.root_path, DOWNLOAD_FOLDER),
#         path=data["filename"],
#         mimetype="text/csv",
#         as_attachment=True,
#     )
#     return response


@socketio.on('join')
def on_join(data):
    room = data['jobId']
    join_room(room)


@socketio.on('leave')
def on_leave(data):
    room = data['jobId']
    leave_room(room)


api.add_resource(File, '/api/file/<string:filename>', '/api/file')
api.add_resource(Graph, '/api/graph')
api.add_resource(Cluster, '/api/cluster')
