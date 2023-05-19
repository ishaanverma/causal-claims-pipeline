import { API_URL } from "../constants";


const DownloadCSV = ({ filename }) => {

  return (
    <div className="mt-5">
      <a className="button is-info" href={`${API_URL}/file/${filename}`} download="causal_claims.csv">Download CSV</a>
    </div>
  );
};

export default DownloadCSV;
