import { useCallback, useEffect, useState } from "react";

const NetworkConfig = ({ topics }) => {
  const [topicMap, setTopicMap] = useState({});

  const transformTopics = useCallback((topics) => {
    const topicMap = {};

    for (const topicId in topics) {
      if (topicId === "-1") {
        continue;
      }

      const entities_prob = topics[topicId];
      const entities = entities_prob.map((item) => item[0]);
      topicMap[topicId] = entities;
    }

    setTopicMap(topicMap);
  }, []);

  useEffect(() => {
    transformTopics(topics);
  }, [topics, transformTopics]);

  return (
    <>
      {Object.entries(topicMap).length > 0 && (
        <div className="panel is-info">
          <p className="panel-heading">Clusters</p>
          {topicMap &&
            Object.keys(topicMap).map((item, index) => (
              <div key={index} className="panel-block cluser-panel-block">
                <div className="cluster-header">{item}</div>
                <div className="cluster-body">
                  <ul>
                    {topicMap[item].map((entity, index) => (
                      <li key={index} className="tag is-light cluster-tag">
                        {entity}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
        </div>
      )}
    </>
  );
};

export default NetworkConfig;
