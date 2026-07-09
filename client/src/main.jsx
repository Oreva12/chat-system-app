import React    from "react";
import ReactDOM from "react-dom/client";
import App      from "./App.jsx";
import "./index.css";

const root = ReactDOM.createRoot(document.getElementById("root"));

// axe accessibility checker — development only
if (import.meta.env.DEV) {
  import("@axe-core/react").then((axe) => {
    axe.default(React, ReactDOM, 1000);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  });
} else {
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}