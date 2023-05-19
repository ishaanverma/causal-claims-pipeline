import string
from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
from nltk.tokenize import word_tokenize
from bertopic import BERTopic
from umap import UMAP
import pandas as pd


lemmatizer = WordNetLemmatizer()
stop_words = stopwords.words('english')


# preprocess entities to remove punctuation, stop words, and lemmatize
def preprocess(entity, lemmatize=False, remove_stop_words=True):
    result = []
    cleaned_entity = entity.translate(
        str.maketrans('', '', string.punctuation)
    )
    tokenized_entity = word_tokenize(cleaned_entity)

    def process_token(token, lemmatize):
        if lemmatize:
            return lemmatizer.lemmatize(token.lower())
        else:
            return token.lower()

    for token in tokenized_entity:
        if remove_stop_words:
            if token.lower() not in stop_words:
                result.append(process_token(token, lemmatize))
        else:
            result.append(process_token(token, lemmatize))

    return " ".join(result)


def create_graph(roberta_df):
    pairs = roberta_df['pairs'].values.tolist()
    result = []
    for i, pair in enumerate(pairs):
        for relation in pair:
            cause = relation[0]
            effect = relation[1]

            processed_cause = preprocess(cause)
            processed_effect = preprocess(effect)

            if processed_cause and processed_effect:
                text = roberta_df.iloc[i]['text']
                result.append([
                    cause,
                    processed_cause,
                    effect,
                    processed_effect,
                    text
                ])

    result_df = pd.DataFrame(
        result,
        columns=[
            'cause',
            'cause_cluster',
            'effect',
            'effect_cluster',
            'text'
        ]
    )
    result_df['id'] = result_df.index.values
    return result_df


def create_clustered_graph(roberta_df, nr_topics='auto', n_gram_range=(1, 2), top_n_words=10):
    pairs = roberta_df['pairs'].values.tolist()

    # extract all entities
    entities = set()
    for pair in pairs:
        for relation in pair:
            for entity in relation:
                entities.add(entity)

    processed_entities = []
    for entity in entities:
        processed_entity = preprocess(entity)
        if processed_entity:
            processed_entities.append(processed_entity)

    if len(processed_entities) == 0:
        raise Exception("Could not find any entities to cluster")

    # cluster entities
    umap_model = UMAP(random_state=42)
    topic_model = BERTopic(
        nr_topics=nr_topics,
        n_gram_range=n_gram_range,
        top_n_words=top_n_words,
        umap_model=umap_model
    )
    topics, probs = topic_model.fit_transform(processed_entities)

    topic2docs = {topic: [] for topic in set(topics)}
    doc2topic = {}
    for topic, doc in zip(topics, processed_entities):
        topic2docs[topic].append(doc)

    for topic, docs in topic2docs.items():
        for doc in docs:
            doc2topic[doc] = topic

    result = []

    for i, pair in enumerate(pairs):
        for relation in pair:
            cause = relation[0]
            effect = relation[1]
            processed_cause = preprocess(cause)
            processed_effect = preprocess(effect)

            # id_ = i
            # label  = roberta_df.iloc[i]['label']
            text = roberta_df.iloc[i]['text']

            # if the cause or effect are empty, then skip
            if (not processed_cause) or (not processed_effect):
                continue

            cause_topic = doc2topic[processed_cause]
            effect_topic = doc2topic[processed_effect]

            result.append([
                cause,
                cause_topic,
                effect,
                effect_topic,
                text
            ])

    df = pd.DataFrame(
        result,
        columns=[
            'cause',
            'cause_cluster',
            'effect',
            'effect_cluster',
            'text'
        ]
    )
    df['id'] = df.index.values
    return df, topic_model.get_topics()


def create_clustered_graph_json(graph, nr_topics, n_gram_range, top_n_words):
    df = pd.read_json(graph)

    result_df, topics = create_clustered_graph(
        roberta_df=df,
        nr_topics=nr_topics,
        n_gram_range=n_gram_range,
        top_n_words=top_n_words,
    )
    result_df['id'] = result_df.index.values
    return result_df.to_json(orient="records"), topics
