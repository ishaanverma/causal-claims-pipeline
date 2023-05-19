const ClusterOptions = ({ submitClusterForm, loading }) => {
  return (
    <div className="form my-3">
      <label className="label">Cluster Options</label>
      <form id="cluster-form" onSubmit={submitClusterForm}>
        <fieldset disabled={loading}>
          <div className="field">
            <label className="label">Number of Clusters</label>
            <p className="help is-gray">
              After training the topic model, the number of topics that will be
              reduced. For example, if the topic model results in 100 topics but
              you have set nr_topics to 20 then the topic model will try to
              reduce the number of topics from 100 to 20.
            </p>
            <p className="help is-gray">
              Setting this value to 0 will automatically reduce topics using
              HDBSCAN. Setting this value to -1 will not perform topic
              reduction. Default value is 0.
            </p>
            <div className="control">
              <input
                className="input"
                min="-1"
                max="100"
                placeholder="0"
                step="1"
                type="number"
                name="nr_topics"
              />
            </div>
          </div>
          <div className="field">
            <label className="label">N-gram range</label>
            <p className="help is-gray mb-1">
              It relates to the number of words you want in your topic
              representation. For example, "New" and "York" are two separate
              words but are often used as "New York" which represents an n-gram
              of 2. Thus, the n_gram_range should be set to (1, 2) if you want
              "New York" in your topic representation. Default value is (1, 2).
            </p>
            <div className="columns">
              <div className="column control">
                <input
                  className="input"
                  type="number"
                  placeholder="1"
                  min="1"
                  name="n_gram_range_min"
                />
              </div>
              <div className="column control">
                <input
                  className="input"
                  type="number"
                  placeholder="2"
                  min="1"
                  name="n_gram_range_max"
                />
              </div>
            </div>
          </div>
          <div className="field">
            <label className="label">Top N words</label>
            <p className="help is-gray mb-1">
              Refers to the number of words per topic that you want to be
              extracted. Default value is 10.
            </p>
            <div className="control">
              <input
                className="input"
                type="number"
                placeholder="10"
                min="1"
                name="top_n_words"
              />
            </div>
          </div>
          <button
            type="submit"
            form="cluster-form"
            className={`button is-info ${loading ? "is-loading" : ""}`}
            value="Submit"
          >
            Submit
          </button>
        </fieldset>
      </form>
    </div>
  );
};

export default ClusterOptions;
