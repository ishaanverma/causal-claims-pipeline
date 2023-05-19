import axios from "axios";
import { toast } from "react-toastify";
import { API_URL } from "../constants";

const ModelPropertiesForm = ({
  csvFile,
  jobId,
  setJobId,
  setJobStatus,
  disabled,
}) => {
  const fetchJobId = async ({
    file_name,
    column_name,
    cluster,
    preprocess,
  }) => {
    setJobId({ ...jobId, isLoading: true, isError: false });
    let result = [];

    try {
      result = await axios.get(`${API_URL}/graph`, {
        params: {
          file_name: file_name,
          column_name: column_name,
          cluster: cluster,
          preprocess: preprocess,
        },
      });

      setJobId({
        ...jobId,
        isLoading: false,
        isError: false,
        jobId: result.data.jobId,
      });
      setJobStatus({
        status: "job_queued",
      });
    } catch (err) {
      setJobId({
        ...jobId,
        isLoading: false,
        isError: true,
        jobId: undefined,
      });
      toast.error(`Error: ${err.message}`);
    }
  };

  const handleFormSubmit = async (event) => {
    event.preventDefault();

    await fetchJobId({
      file_name: csvFile.name,
      column_name: event.target.columnName.value,
      cluster: event.target.clusterEntities.checked,
      preprocess: event.target.preprocessText.checked,
    });
  };

  return (
    <div className="form mx-3">
      <form id="csv-prop" onSubmit={handleFormSubmit}>
        <fieldset disabled={disabled}>
          <div className="field">
            <label className="label">Step 2: Select a column</label>
            <div className="control">
              <div className="select">
                <select name="columnName" required>
                  {csvFile &&
                    csvFile.column_names &&
                    csvFile.column_names.map((item, index) => (
                      <option key={index}>{item}</option>
                    ))}
                </select>
              </div>
            </div>
          </div>
          <div className="field">
            <div className="control">
              <label className="checkbox">
                <input name="preprocessText" type="checkbox" defaultChecked />
                <span className="ml-3">
                  Pre-process text (remove URLs, email, extra whitespace)
                </span>
              </label>
            </div>
          </div>
          <div className="field">
            <div className="control">
              <label className="checkbox">
                <input name="clusterEntities" type="checkbox" defaultChecked />
                <span className="ml-3">Cluster entities</span>
              </label>
            </div>
          </div>
          <p className="help is-gray mb-1">Large CSV files are automatically truncated to the first 10,000 rows</p>
          <button
            type="submit"
            form="csv-prop"
            className={`button is-info ${jobId.isLoading ? "is-loading" : ""}`}
            value="Submit"
          >
            Submit
          </button>
        </fieldset>
      </form>
    </div>
  );
};

export default ModelPropertiesForm;
