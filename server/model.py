import torch
import torch.nn as nn
from transformers import RobertaConfig
from transformers.modeling_outputs import TokenClassifierOutput
from transformers.models.roberta.modeling_roberta import RobertaModel
from transformers.models.roberta.modeling_roberta import RobertaPreTrainedModel
from transformers import AutoTokenizer

roberta_model_name = "roberta-large"


class RobertaForTokenClassification(RobertaPreTrainedModel):
    config_class = RobertaConfig

    def __init__(self, config):
        super().__init__(config)
        self.num_labels = config.num_labels
        # load model body
        self.roberta = RobertaModel(config, add_pooling_layer=False)
        # set up token classification head
        self.dropout = nn.Dropout(config.hidden_dropout_prob)
        self.classifier = nn.Linear(config.hidden_size, config.num_labels)
        # load and init weights
        self.init_weights()
    
    def forward(
        self,
        input_ids=None,
        attention_mask=None,
        token_type_ids=None,
        labels=None,
        **kwargs
    ):
        # use model body to get encoder representations
        outputs = self.roberta(
            input_ids,
            attention_mask=attention_mask,
            token_type_ids=token_type_ids,
            **kwargs
        )
        # apply classifier to encoder representation
        sequence_output = self.dropout(outputs[0])
        logits = self.classifier(sequence_output)

        # calculate loss
        loss = None
        if labels is not None:
            loss_fct = nn.CrossEntropyLoss()
            loss = loss_fct(logits.view(-1, self.num_labels), labels.view(-1))
        
        # Return model output
        return TokenClassifierOutput(
            loss=loss,
            logits=logits,
            hidden_states=outputs.hidden_states,
            attentions=outputs.attentions
        )


class ModelRunner:
    model = None
    tokenizer = None
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    @classmethod
    def load_model(cls, SAVED_MODEL_PATH, NUM_THREADS):
        if cls.model is None:
            if cls.device == 'cpu':
                torch.set_num_threads(NUM_THREADS)
            cls.tokenizer = AutoTokenizer.from_pretrained(
                SAVED_MODEL_PATH,
                add_prefix_space=True
            )
            cls.model = (RobertaForTokenClassification
                        .from_pretrained(SAVED_MODEL_PATH)
                        .to(cls.device))
