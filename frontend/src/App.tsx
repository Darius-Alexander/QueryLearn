import { useEffect, useState } from "react";
import "./App.css";

type HealthResponse = {
  status: string;
};

function App() {
  const [backendStatus, setBackendStatus] = useState("checking");

  useEffect(() => {
    fetch("http://127.0.0.1:8001/api/health")
      .then((response) => response.json())
      .then((data: HealthResponse) => {
        setBackendStatus(data.status);
      })
      .catch(() => {
        setBackendStatus("offline");
      });
  }, []);

  return (
    <main>
      <h1>QueryLearn</h1>
      <p>RAG-powered learning assistant</p>

      <section>
        <h2>Backend connection</h2>
        <p>Status: {backendStatus}</p>
      </section>
    </main>
  );
}

export default App;
