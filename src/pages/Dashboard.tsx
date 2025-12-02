import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, FileVideo, ChevronRight, Download } from "lucide-react";
import { getSessions } from "../services/sessionService";
import type { Session } from "../types";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<Session[]>([]);

  useEffect(() => {
    setHistory(getSessions());
  }, []);

  const handleSessionClick = (session: Session) => {
    if (session.status === "Completed" && session.downloadUrl) {
      window.open(session.downloadUrl, "_blank");
    } else {
      // For now, we don't support resuming drafts from local storage in this MVP
      // unless we build a full state restoration mechanism.
      // We'll just start a new session for now or show a message.
      alert("Resuming draft sessions is not supported in this version. Please start a new session.");
    }
  };

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "2rem" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ background: "var(--primary)", width: "32px", height: "32px", borderRadius: "8px" }}></div>
          <span style={{ fontSize: "1.25rem", fontWeight: "700", color: "var(--text-main)" }}>SmartCut</span>
        </div>
        <div style={{ width: "32px", height: "32px", background: "#e2e8f0", borderRadius: "50%" }}></div>
      </header>

      {/* Hero / Start Action */}
      <section style={{ marginBottom: "4rem", textAlign: "center", padding: "4rem 2rem", background: "var(--surface)", borderRadius: "var(--radius)", boxShadow: "var(--shadow-md)" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "800", marginBottom: "1rem", letterSpacing: "-0.025em" }}>
          Trim silence, keep the essence.
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.125rem", marginBottom: "2rem", maxWidth: "600px", margin: "0 auto 2rem" }}>
          Upload your video or audio, let AI handle the silence, and export a polished cut in seconds.
        </p>
        <button
          onClick={() => navigate("/session/new")}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            backgroundColor: "var(--primary)",
            color: "white",
            border: "none",
            padding: "1rem 2rem",
            fontSize: "1.125rem",
            fontWeight: "600",
            borderRadius: "50px",
            cursor: "pointer",
            transition: "all 0.2s",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.3)"
          }}
          onMouseOver={(e) => (e.currentTarget.style.transform = "translateY(-2px)")}
          onMouseOut={(e) => (e.currentTarget.style.transform = "translateY(0)")}
        >
          <Plus size={20} />
          Start New Session
        </button>
      </section>

      {/* Recent Sessions */}
      <section>
        <h2 style={{ fontSize: "1.25rem", fontWeight: "600", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Clock size={20} color="var(--text-secondary)" />
          Recent Sessions
        </h2>
        
        <div style={{ display: "grid", gap: "1rem" }}>
          {history.length === 0 ? (
            <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-secondary)" }}>
              No recent sessions found. Start a new one!
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSessionClick(item)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.25rem",
                  background: "var(--surface)",
                  borderRadius: "var(--radius)",
                  boxShadow: "var(--shadow-sm)",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  transition: "border-color 0.2s"
                }}
                onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--primary)")}
                onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "#f1f5f9", borderRadius: "8px", color: "var(--text-secondary)" }}>
                    <FileVideo size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>{item.name}</h3>
                    <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                      {item.date} • {item.duration || "N/A"}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ 
                    fontSize: "0.75rem", 
                    fontWeight: "600", 
                    padding: "0.25rem 0.75rem", 
                    borderRadius: "20px",
                    background: item.status === "Completed" ? "#dcfce7" : "#f1f5f9",
                    color: item.status === "Completed" ? "#166534" : "#475569"
                  }}>
                    {item.status}
                  </span>
                  {item.status === "Completed" ? (
                    <Download size={20} color="var(--primary)" />
                  ) : (
                    <ChevronRight size={20} color="var(--text-secondary)" />
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
};

export default Dashboard;

