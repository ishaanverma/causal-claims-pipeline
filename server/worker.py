from redis import Redis
from rq import Worker

w = Worker(['default'], connection=Redis(host='localhost', port=16379))
w.work()
