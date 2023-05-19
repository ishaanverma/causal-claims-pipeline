import os
import pandas as pd
from rq import get_current_job

from config import SAVED_MODEL_PATH, NUM_THREADS
from model import ModelRunner
from predictor import Predictor
from topic_model import create_clustered_graph, create_graph


def create_causal_graph(
        file_path,
        column_name,
        progress_callback,
        cluster=False,
        preprocess=False,
        save_dir=""
    ):
    job = get_current_job()
    # Load model
    ModelRunner.load_model(SAVED_MODEL_PATH, NUM_THREADS)
    predictor = Predictor(
        model=ModelRunner.model,
        tokenizer=ModelRunner.tokenizer,
        device=ModelRunner.device
    )

    # Read uploaded file
    df = pd.read_csv(file_path)
    # TODO: limit to first 10000 rows (need to think of a better way)
    df = df.head(10000)
    input_text = df[column_name].values.tolist()

    # update job metadata
    job.meta['status'] = 'cause_effect'
    job.meta['progress'] = 0
    job.meta['total'] = len(input_text)
    job.save_meta()
    progress_callback({
            'status': job.meta['status'],
            'progress': job.meta['progress'],
            'total': job.meta['total'],
        },
        job,
    )

    cause_effect_pairs = []
    for i, text in enumerate(input_text):
        result = predictor.run_prediction(text, preprocess)
        cause_effect_pairs.append(result['pairs'])

        job.meta['progress'] = i+1
        job.save_meta()
        progress_callback({
                'status': job.meta['status'],
                'progress': job.meta['progress'],
                'total': job.meta['total'],
            },
            job,
        )
    
    claims_df = pd.DataFrame(
        zip(input_text, cause_effect_pairs),
        columns=['text', 'pairs']
    )

    claims_df = claims_df.loc[claims_df['pairs'].astype(bool)]
    del df

    topics = None
    if cluster:
        job.meta['status'] = 'create_clusters'
        job.save_meta()
        progress_callback({
                'status': job.meta['status'],
                'progress': job.meta['progress'],
                'total': job.meta['total'],
            },
            job,
        )
        result_df, topics = create_clustered_graph(claims_df)
    else:
        result_df = create_graph(claims_df)

    # save file to download directory
    if save_dir:
        result_df.to_csv(os.path.join(save_dir, f"{job.id}.csv"), index=False)
    
    # drop rows with -1 cluster
    result_df = result_df[result_df["cause_cluster"] != -1]
    result_df = result_df[result_df["effect_cluster"] != -1]

    job.meta['status'] = 'finished'
    job.save_meta()
    progress_callback({
            'status': job.meta['status'],
            'progress': job.meta['progress'],
            'total': job.meta['total'],
            'result_df': result_df.to_json(orient="records"),
            'claims_df': claims_df.to_json(orient="records"),
            'topics': topics,
            'cluster': cluster,
        },
        job,
    )

    return result_df, claims_df, topics
