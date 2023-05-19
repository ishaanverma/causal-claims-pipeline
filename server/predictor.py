import torch
import pandas as pd
from nltk.tokenize import sent_tokenize
from cleantext import clean
from langdetect import detect
from langdetect.lang_detect_exception import LangDetectException

from topic_model import create_clustered_graph, create_graph
from relation_identification import final_result


class Predictor:
    def __init__(self, model, tokenizer, device):
        # initialize model and tokenizer
        self.device = device
        self.tokenizer = tokenizer
        self.model = model
        self.model.eval()

        self.tags = ["O", "B-C", "I-C", "B-E", "I-E", "B-CE", "I-CE"]
        self.index2tag = {idx: tag for idx, tag in enumerate(self.tags)}
        self.tag2index = {tag: idx for idx, tag in enumerate(self.tags)}

    def _tag_text(self, text):
        # Get tokens from tokenizer
        tokens = self.tokenizer(text, truncation=True).tokens()
        # tokens = list(map(lambda x: x.replace('Ġ', ' '), tokens))

        word_ids = self.tokenizer(text, truncation=True).word_ids()
        # Encode the sequence into IDs
        input_ids = self.tokenizer(
            text,
            truncation=True,
            return_tensors="pt"
        ).input_ids.to(self.device)

        # Get predictions as distribution over 7 possible classes
        with torch.no_grad():
            outputs = self.model(input_ids)[0]

        # Take argmax to get most likely class per token
        predictions = torch.argmax(outputs, dim=2)

        # Convert to DataFrame
        preds = [self.index2tag[p] for p in predictions[0].cpu().numpy()]

        # convert to original length
        original = []
        original_pred = []
        previous_word_idx = None
        for i, word_idx in enumerate(word_ids):
            if word_idx == previous_word_idx:
                if previous_word_idx is not None:
                    original[previous_word_idx] += tokens[i]
            else:
                original.append(tokens[i].replace('Ġ', ''))
                original_pred.append(preds[i])
            previous_word_idx = word_idx

        return pd.DataFrame(
            [original, original_pred],
            index=["Tokens", "Tags"]
        )

    def _get_cause_effect_pairs(self, text):
        result = self._tag_text(text)
        tokens = result.iloc[0].tolist()
        pred = result.iloc[1].tolist()

        pairs = final_result([self.tag2index[p] for p in pred], tokens)
        cause_effect = []

        if pairs == 0:
            return []

        for pair in pairs:
            cause = pair[0]
            effect = pair[1]

            cause_str = " ".join(map(lambda i: tokens[i], cause))
            effect_str = " ".join(map(lambda i: tokens[i], effect))
            cause_effect.append([cause_str, effect_str])

        return cause_effect

    def _get_cause_effect_pairs_long(self, text):
        cause_effect = []
        for sentence in sent_tokenize(text):
            sentence = str(sentence)
            result = self._get_cause_effect_pairs(sentence)
            cause_effect += result

        return cause_effect

    def _preprocess_text(self, text):
        return clean(
            text,
            fix_unicode=True,           # fix various unicode errors
            to_ascii=True,              # transliterate to closest ASCII representation
            lower=False,                # lowercase text
            no_line_breaks=True,        # fully strip line breaks as opposed to only normalizing them
            no_urls=True,               # replace all URLs with a special token
            no_emails=True,             # replace all email addresses with a special token
            no_phone_numbers=False,     # replace all phone numbers with a special token
            no_numbers=False,           # replace all numbers with a special token
            no_digits=False,            # replace all digits with a special token
            no_currency_symbols=False,  # replace all currency symbols with a special token
            no_punct=False,             # remove punctuations
            no_emoji=True,              # remove emoji
            replace_with_punct="",      # instead of removing punctuations you may replace them
            replace_with_url="<URL>",
            replace_with_email="<EMAIL>",
            replace_with_phone_number="<PHONE>",
            replace_with_number="<NUMBER>",
            replace_with_digit="0",
            replace_with_currency_symbol="<CUR>",
            lang="en",
        )

    def run_prediction(self, text, preprocess):
        if preprocess:
            text = self._preprocess_text(text)

        if not text or pd.isna(text):
            return {
                'pairs': [],
                'language': '',
            }

        try:
            language = detect(text)
        except LangDetectException:
            language = ''
            # logging.warning(f"Language detection failed. Input text: {text}")

        if language != 'en':
            return {
                'pairs': [],
                'language': language,
            }

        # if the number of tokens is greater than 256
        # then split the text into sentences and run the model
        tokens = self.tokenizer(text).tokens()
        if len(tokens) > 256:
            result = self._get_cause_effect_pairs_long(text)
        else:
            result = self._get_cause_effect_pairs(text)

        return {
            'pairs': result,
            'language': language,
        }

    def run_prediction_batch(self, text_batch, preprocess, cluster):
        pairs = []
        for text in text_batch:
            result = self.run_prediction(
                text,
                preprocess,
            )
            pairs.append(result['pairs'])

        claims_df = pd.DataFrame(
            zip(text_batch, pairs),
            columns=['text', 'pairs']
        )

        topics = None
        if cluster:
            result_df, topics = create_clustered_graph(claims_df)
        else:
            result_df = create_graph(claims_df)

        del claims_df
        return result_df, topics
