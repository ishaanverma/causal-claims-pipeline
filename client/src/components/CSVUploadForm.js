import { useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { API_URL } from "../constants";

const CSVUploadForm = ({ csvFile, setCSVFile, disabled = false }) => {
  const [selectedFile, setSelectedFile] = useState();

  const handleCSVFormSubmit = async (event) => {
    event.preventDefault();
    const formData = new FormData();
    if (!selectedFile) {
      toast.warn("Please upload a file", { toastId: "file-upload-warning" });
      return;
    }
    formData.append("file", selectedFile);

    setCSVFile({
      loading: true,
      error: false,
    });

    let result;
    try {
      result = await axios.post(`${API_URL}/file`, formData);
    } catch (err) {
      console.log(err);
      setCSVFile({
        loading: false,
        error: true,
      });
      toast.error(`Error: ${err.message}`, { toastId: "file-upload-error" });
      return;
    }

    setCSVFile({
      name: result.data.file_name,
      column_names: result.data.column_names,
      loading: false,
      error: false,
    });
  };

  return (
    <div className="form mx-3">
      <form id="csv-form" onSubmit={handleCSVFormSubmit}>
        <fieldset disabled={disabled}>
          <div className="field">
            <label className="label">Step 1: Upload a CSV</label>
            <div className="control">
              <div className="file has-name mr-3 mb-3">
                <label className="file-label">
                  <input
                    id="csv-file"
                    className="file-input"
                    type="file"
                    name="file"
                    onChange={(event) => {
                      setSelectedFile(event.target.files[0]);
                    }}
                  />
                  <span className="file-cta">
                    <span className="file-label">Choose a file...</span>
                  </span>
                  {selectedFile && (
                    <span className="file-name">{selectedFile.name}</span>
                  )}
                </label>
              </div>
              <button
                type="submit"
                form="csv-form"
                className={`button is-info ${
                  csvFile && csvFile.loading ? "is-loading" : ""
                }`}
                value="Submit"
              >
                Submit
              </button>
            </div>
          </div>
        </fieldset>
      </form>
    </div>
  );
};

export default CSVUploadForm;
