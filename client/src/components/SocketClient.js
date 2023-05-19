const SocketClient = ({ jobId, jobStatus }) => {
  const getCurrentStatus = (status) => {
    if (status === "cause_effect") {
      return "Running causal model...";
    } else if (status === "create_clusters") {
      return "Creating entity clusters...";
    } else if (status === "finished") {
      return "Finished";
    } else if (status === "job_queued") {
      return "Job queued";
    } else {
      return status;
    }
  };

  const getPercentage = (progress, total) => {
    return Math.floor(progress / total);
  };

  return (
    <article className="message is-dark mx-3">
      <div className="message-header">
        <p>Job Status</p>
      </div>
      <div className="message-body">
        {Object.keys(jobStatus).length > 0 ? (
          <>
            <div className="my-1">Job Id: {getCurrentStatus(jobId.jobId)}</div>
            <div className="mb-1">Status: {getCurrentStatus(jobStatus.status)}</div>
            {jobStatus.progress && (
              <div className="mb-1">
                {jobStatus.progress} / {jobStatus.total}
              </div>
            )}
            <progress
              className="progress is-info"
              value={jobStatus.progress}
              max={jobStatus.total}
            >
              {`${getPercentage(jobStatus.progress, jobStatus.total)}%`}
            </progress>
          </>
        ) : (
          <div>No job currently queued</div>
        )}
      </div>
    </article>
  );
};

export default SocketClient;
