import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("DOCGUARD App Runtime Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 40, fontFamily: "sans-serif", maxWidth: 600, margin: "40px auto", border: "1px solid #e2e8f0", borderRadius: 12, backgroundColor: "#fff" }}>
          <h2 style={{ color: "#e11d48", marginTop: 0 }}>⚠️ Application Error</h2>
          <p style={{ color: "#475569" }}>DOCGUARD encountered an unexpected issue while loading.</p>
          <pre style={{ background: "#f8fafc", padding: 16, borderRadius: 8, fontSize: 13, overflowX: "auto" }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={() => window.location.reload()} style={{ padding: "8px 16px", background: "#1e3a8a", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontWeight: "bold" }}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);