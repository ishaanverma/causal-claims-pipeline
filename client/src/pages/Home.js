import { useState, useReducer, useEffect } from "react";
import { ToastContainer } from "react-toastify";
import SocketClient from "../components/SocketClient";
import VisNetwork from "../components/VisNetwork";
import { graphReducer } from "../reducers/graphReducer";
import { API_URL, SOCKET_URL } from "../constants";
import NetworkConfig from "../components/NetworkConfig";
import CSVUploadForm from "../components/CSVUploadForm";
import ModelPropertiesForm from "../components/ModelPropertiesForm";
import { io } from "socket.io-client";
import { toast } from "react-toastify";
import axios from "axios";

import "vis-network/styles/vis-network.min.css";
import "react-toastify/dist/ReactToastify.min.css";

import Message from "../components/Message";

let socket;

function Home() {
  const [jobId, setJobId] = useState({ isLoading: false, isError: false });
  const [jobStatus, setJobStatus] = useState({});
  const [graph, dispatchGraph] = useReducer(graphReducer, {
    data: [],
    claims: [],
    topics: [],
    clustered: false,
    isLoading: false,
    isError: false,
  });
  const [csvFile, setCSVFile] = useState();
  const [clusterFormLoading, setClusterFormLoading] = useState(false);
  const isCSVFileUploaded = csvFile && !csvFile.loading && !csvFile.error;
  const isJobSubmitted =
    jobId && !jobId.isLoading && !jobId.isError && jobId.jobId;

  const initiateSocket = (jobId) => {
    socket = io(SOCKET_URL);
    if (jobId) {
      socket.emit("join", { jobId: jobId });
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.off("job_status");
      socket.disconnect();
      console.log("SOCKET DISCONNECTED");
    }
  };

  const subscribeToJobStatus = () => {
    if (socket) {
      socket.on("job_status", (data) => {
        const parsedData = JSON.parse(data);
        setJobStatus({
          status: parsedData["status"],
          progress: parsedData["progress"],
          total: parsedData["total"],
        });

        if (parsedData.status === "finished") {
          dispatchGraph({
            type: "FETCH_SUCCESS_INIT",
            payload: {
              data: JSON.parse(parsedData["result_df"]),
              claims: JSON.parse(parsedData["claims_df"]),
              clustered: parsedData["cluster"],
              topics: parsedData["topics"],
            },
          });
        }
      });
    }
  };

  const submitClusterForm = async (event) => {
    event.preventDefault();
    setClusterFormLoading(true);
    let nr_topics = event.target.nr_topics.value;
    let ngram_range_min = event.target.n_gram_range_min.value;
    let ngram_range_max = event.target.n_gram_range_max.value;
    let top_n_words = event.target.top_n_words.value;
    let result;

    try {
      let data = {};
      if (nr_topics) data.nr_topics = nr_topics;
      if (ngram_range_min || ngram_range_max)
        data.n_gram_range = [ngram_range_min || 1, ngram_range_max || 2];
      if (top_n_words) data.top_n_words = top_n_words;

      data.graph = JSON.stringify(graph.claims);
      result = await axios.post(`${API_URL}/cluster`, data);

      dispatchGraph({
        type: "FETCH_SUCCESS_CLUSTER",
        payload: {
          data: JSON.parse(result.data["result_df"]),
          topics: result.data["topics"],
        },
      });
      setClusterFormLoading(false);
    } catch (err) {
      setClusterFormLoading(false);
      toast.error(`Error: ${err.message}`);
    }
  };

  useEffect(() => {
    if (jobId.jobId) {
      initiateSocket(jobId.jobId);
    }

    subscribeToJobStatus();

    return () => {
      disconnectSocket();
    };
  }, [jobId.jobId]);

  // useEffect(() => {
  //   const unloadCallback = (event) => {
  //     event.preventDefault();
  //     event.returnValue = "";
  //     return "";
  //   };

  //   if (graph.data && graph.data.length > 0) {
  //     window.addEventListener("beforeunload", unloadCallback);
  //   }

  //   return () => window.removeEventListener("beforeunload", unloadCallback);
  // }, [graph.data]);

  return (
    <>
      <section className="hero is-dark">
        <div className="hero-body">
          <h1 className="title">Mining causal belief systems</h1>
          <h3 className="subtitle">
            J. Hunter Priniski, Ishaan Verma, Fred Morstatter
          </h3>
        </div>
      </section>
      <section>
        <Message
          title="Sample File"
          text="COVID Tweets"
          href="https://drive.google.com/file/d/1zWSLxyVQLKg7GkteI177X-JTOcEADgvR/view?usp=sharing"
        />
        <div className="container my-6 is-max-desktop">
          <div className="columns">
            <div className="column">
              <CSVUploadForm
                csvFile={csvFile}
                setCSVFile={setCSVFile}
                disabled={isJobSubmitted}
              />
            </div>
            <div
              style={{
                borderLeft: "2px solid",
                borderColor: "#80808044",
                borderRadius: "2px",
              }}
            />
            <div className="column">
              <ModelPropertiesForm
                csvFile={csvFile}
                jobId={jobId}
                setJobId={setJobId}
                setJobStatus={setJobStatus}
                disabled={isJobSubmitted || !isCSVFileUploaded}
              />
            </div>
          </div>
          {jobId.jobId && <SocketClient jobId={jobId} jobStatus={jobStatus} />}
        </div>
      </section>
      <div className="container my-6">
        <div className="columns">
          <div className="column is-three-fifths">
            <VisNetwork
              data={graph.data}
              clustered={graph.clustered}
              submitClusterForm={submitClusterForm}
              clusterFormLoading={clusterFormLoading}
              jobId={jobId.jobId}
            />
          </div>
          <div className="column">
            <NetworkConfig topics={graph.topics} />
          </div>
        </div>
      </div>
      <ToastContainer />
    </>
  );
}

export default Home;
