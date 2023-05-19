import { useCallback, useEffect, useRef, useState } from "react";
import { DataSet } from "vis-data";
import { Network } from "vis-network";
import ClusterOptions from "./ClusterOptions";
import DownloadCSV from "./DownloadCSV";

const VisNetwork = ({
  data,
  clustered,
  submitClusterForm,
  clusterFormLoading,
  jobId,
}) => {
  const visJsRef = useRef(null);
  var highlightActive = useRef(false);
  const [collapseEdges, setCollapseEdges] = useState(false);

  const preTitle = (text, cause = "", effect = "") => {
    if (cause && effect) {
      text = `${text}\n\nExtracted Cause-Effect: (${cause} \u2192 ${effect})`;
    }
    const container = document.createElement("pre");
    container.innerText = text;
    container.style = "max-width: 50em; white-space: pre-wrap;";
    return container;
  };

  const neighbourhoodHighlight = useCallback((params, nodeSet, nodes) => {
    // if something is selected:
    if (params.nodes.length > 0) {
      highlightActive.value = true;
      let selectedNode = params.nodes[0];

      // mark all nodes as hard to read.
      for (let nodeId in nodeSet) {
        nodeSet[nodeId].color = "rgba(200,200,200,0.5)";
      }

      // the main node gets its own color and its label back.
      nodeSet[selectedNode].color = undefined;
    } else if (highlightActive.value === true) {
      // reset all nodes
      for (let nodeId in nodeSet) {
        nodeSet[nodeId].color = undefined;
      }
      highlightActive.value = false;
    }

    // transform the object into an array
    var updateArray = [];
    for (let nodeId in nodeSet) {
      if (nodeSet.hasOwnProperty(nodeId)) {
        updateArray.push(nodeSet[nodeId]);
      }
    }
    nodes.update(updateArray);
  }, []);

  const transformData = useCallback(
    (graphData) => {
      let nodes = [];
      let edges = [];
      const nodeSet = new Set();
      const edgeWeight = {};

      for (let i = 0; i < graphData.length; i++) {
        let causeCluster = graphData[i].cause_cluster;
        let effectCluster = graphData[i].effect_cluster;

        if (edgeWeight[causeCluster] === undefined) {
          edgeWeight[causeCluster] = {};
        }
        if (edgeWeight[causeCluster][effectCluster] === undefined) {
          edgeWeight[causeCluster][effectCluster] = 0;
        }

        edgeWeight[causeCluster][effectCluster] += 1;
      }

      for (let i = 0; i < graphData.length; i++) {
        const row = graphData[i];

        if (!nodeSet.has(row.cause_cluster)) {
          nodes.push({
            id: row.cause_cluster,
            label: row.cause_cluster.toString(),
            cid: row.cause_cluster,
            group: row.cause_cluster,
          });
        }
        nodeSet.add(row.cause_cluster);

        if (!nodeSet.has(row.effect_cluster)) {
          nodes.push({
            id: row.effect_cluster,
            label: row.effect_cluster.toString(),
            cid: row.effect_cluster,
            group: row.effect_cluster,
          });
        }
        nodeSet.add(row.effect_cluster);

        if (!collapseEdges) {
          edges.push({
            from: row.cause_cluster,
            to: row.effect_cluster,
            title: preTitle(row.text, row.cause, row.effect),
          });
        }
      }

      if (collapseEdges) {
        for (const [causeCluster, effectObj] of Object.entries(edgeWeight)) {
          for (const [effectCluster, edgeWeight] of Object.entries(effectObj)) {
            edges.push({
              from: causeCluster,
              to: effectCluster,
              value: edgeWeight,
              title: edgeWeight,
            });
          }
        }
      }

      nodes = new DataSet(nodes);
      edges = new DataSet(edges);
      return { nodes, edges };
    },
    [collapseEdges]
  );

  useEffect(() => {
    const options = {
      autoResize: true,
      nodes: {
        scaling: {
          min: 10,
          max: 30,
        },
        font: {
          size: 14,
        },
        shapeProperties: {
          borderRadius: 6,
          interpolation: true,
        },
        size: 15,
        shape: "dot",
      },
      edges: {
        arrows: {
          to: {
            enabled: true,
          },
        },
        color: { inherit: "from" },
      },
      physics: {
        enabled: true,
        solver: "repulsion",
        timestep: 0.5,
        maxVelocity: 50,
        minVelocity: 0.75,
        repulsion: {
          centralGravity: 0.2,
          springLength: 300,
          springConstant: 0.05,
          nodeDistance: 120,
          damping: 0.09,
        },
      },
    };

    const { nodes, edges } = transformData(data);

    // const approxLinesOfText = Math.ceil(
    //   nodes.reduce((prev, curr) => prev + (curr.label?.length || 0), 0) / 14
    // );
    // const height = 2 * (approxLinesOfText + edges.length);

    // eslint-disable-next-line
    const network =
      visJsRef.current &&
      new Network(visJsRef.current, { nodes, edges }, options);

    let nodeSet = nodes.get({ returnType: "Object" });
    network.on("click", (params) =>
      neighbourhoodHighlight(params, nodeSet, nodes)
    );
  }, [visJsRef, data, transformData, neighbourhoodHighlight]);

  return (
    <>
      <div
        ref={visJsRef}
        style={{
          // height: `${height < 150 ? 150 : height}em`,
          // width: `${8 * nodes.length + 8}em`,
          height: "200em",
          maxWidth: "100%",
          minWidth: "30%",
          maxHeight: "512px",
          border: "1px solid black",
        }}
      />
      {data && data.length > 0 && (
        <>
          <DownloadCSV filename={`${jobId}.csv`} />
          <hr />
        </>
      )}
      {data && data.length > 0 && clustered && (
        <>
          <div className="my-3">
            <label className="label">Visualization Options</label>
            <label className="checkbox">
              <input
                className="mx-2"
                type="checkbox"
                name="collapseEdges"
                checked={collapseEdges}
                onChange={() => setCollapseEdges(!collapseEdges)}
              />
              Merge Edges
            </label>
          </div>
          <hr />
          <div className="my-3">
            <ClusterOptions
              submitClusterForm={submitClusterForm}
              loading={clusterFormLoading}
            />
          </div>
        </>
      )}
    </>
  );
};

export default VisNetwork;
