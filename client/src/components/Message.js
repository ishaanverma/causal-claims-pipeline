import { useState } from "react";

const Message = ({ title = "", text = "", href = "#" }) => {
  const [hideMessage, setHideMessage] = useState(false);

  return (
    <article
      className="message is-warning mx-auto mt-3"
      style={hideMessage ? hiddenMessage : displayMessage}
    >
      <div className="message-header">
        <p>{title}</p>
        <button
          className="delete"
          aria-label="delete"
          onClick={() => setHideMessage(true)}
        ></button>
      </div>
      <div className="message-body">
        <a href={href} target="_blank" rel="noreferrer">
          {text}
        </a>
      </div>
    </article>
  );
};

const hiddenMessage = {
  display: "none",
  maxWidth: "600px",
};

const displayMessage = {
  maxWidth: "600px",
};

export default Message;
