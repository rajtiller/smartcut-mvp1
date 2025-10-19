import React from "react";
import type { FileInfo } from "../types";

interface TrimPageProps {
  files: FileInfo[];
  onBack: () => void;
}

export const TrimPage: React.FC<TrimPageProps> = ({ files, onBack }) => {
  return (
    <div
      style={{
        backgroundColor: "#8B5CF6",
        minHeight: "100vh",
        width: "100vw",
        position: "fixed",
        top: 0,
        left: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem",
        color: "white",
        margin: 0,
        boxSizing: "border-box",
      }}
    >
      <h1
        style={{
          fontSize: "3rem",
          fontWeight: "bold",
          marginBottom: "2rem",
        }}
      >
        Trim Your Videos
      </h1>

      <p style={{ fontSize: "1.2rem", marginBottom: "2rem" }}>
        Trimming {files.length} video(s)...
      </p>

      <div style={{ marginBottom: "2rem" }}>
        {files.map((file, index) => (
          <div key={index} style={{ marginBottom: "0.5rem" }}>
            {file.file.name}
          </div>
        ))}
      </div>

      <button
        onClick={onBack}
        style={{
          backgroundColor: "white",
          color: "#8B5CF6",
          border: "none",
          padding: "1rem 2rem",
          fontSize: "1.2rem",
          fontWeight: "600",
          borderRadius: "8px",
          cursor: "pointer",
          boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        }}
      >
        Back to File Selection
      </button>
    </div>
  );
};
