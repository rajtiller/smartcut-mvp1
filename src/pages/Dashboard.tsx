import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Clock, FileVideo, ChevronRight, Download, Scissors, Settings } from "lucide-react";
import { getSessions } from "../services/sessionService";
import { SettingsPanel } from "../components/SettingsPanel";
import type { Session } from "../types";

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [history, setHistory] = useState<Session[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    <div className="container" style={{ padding: "2rem" }}>
      {/* Header */}
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div style={{ 
            background: "linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%)", 
            width: "40px", 
            height: "40px", 
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white"
          }}>
            <Scissors size={24} />
          </div>
          <span style={{ fontSize: "1.5rem", fontWeight: "700", color: "var(--text-main)", letterSpacing: "-0.03em" }}>SmartCut</span>
        </div>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="btn btn-ghost"
          style={{ padding: "0.5rem", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center" }}
          title="Settings"
        >
          <Settings size={20} color="var(--text-secondary)" />
        </button>
      </header>

      {/* Hero / Start Action */}
      <section className="card" style={{ 
        marginBottom: "4rem", 
        textAlign: "center", 
        padding: "5rem 2rem", 
        background: "var(--surface)", 
        boxShadow: "var(--shadow-lg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
      }}>
        <h1 style={{ fontSize: "3rem", fontWeight: "800", marginBottom: "1rem", letterSpacing: "-0.03em", background: "linear-gradient(to right, var(--text-main), var(--text-secondary))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Trim silence, keep the essence.
        </h1>
        <p style={{ color: "var(--text-secondary)", fontSize: "1.25rem", marginBottom: "2.5rem", maxWidth: "600px", lineHeight: "1.6" }}>
          Upload your video or audio, let AI handle the silence, and export a polished cut in seconds.
        </p>
        <button
          onClick={() => navigate("/session/new")}
          className="btn btn-primary"
          style={{
            padding: "1rem 2.5rem",
            fontSize: "1.125rem",
            borderRadius: "50px",
            boxShadow: "0 10px 25px -5px rgba(79, 70, 229, 0.4)"
          }}
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
            <div style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px dashed var(--border)" }}>
              <p>No recent sessions found.</p>
              <button 
                onClick={() => navigate("/session/new")}
                className="btn btn-ghost"
                style={{ marginTop: "0.5rem", color: "var(--primary)" }}
              >
                Start a new one
              </button>
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                onClick={() => handleSessionClick(item)}
                className="card"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "1.25rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.borderColor = "var(--primary-light)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "var(--border)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <div style={{ padding: "0.75rem", background: "var(--background)", borderRadius: "12px", color: "var(--primary)" }}>
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
                  <span className={`badge ${item.status === "Completed" ? "badge-success" : "badge-neutral"}`}>
                    {item.status}
                  </span>
                  {item.status === "Completed" ? (
                    <div className="btn btn-ghost" style={{ padding: "0.5rem", borderRadius: "50%" }}>
                       <Download size={20} color="var(--primary)" />
                    </div>
                  ) : (
                    <div className="btn btn-ghost" style={{ padding: "0.5rem", borderRadius: "50%" }}>
                      <ChevronRight size={20} color="var(--text-secondary)" />
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Settings Panel */}
      <SettingsPanel isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
};

export default Dashboard;
