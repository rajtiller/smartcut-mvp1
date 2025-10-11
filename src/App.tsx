import { useState } from "react";
import "./App.css";

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const triggerFileSelect = () => {
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    fileInput?.click();
  };

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
        justifyContent: "flex-start",
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
          marginBottom: "4rem",
          marginTop: "2rem",
        }}
      >
        Smart Cut
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          gap: "1rem",
        }}
      >
        <button
          onClick={triggerFileSelect}
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
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
            e.currentTarget.style.boxShadow = "0 6px 8px rgba(0, 0, 0, 0.15)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
          }}
        >
          Click here to add files
        </button>

        <input
          id="fileInput"
          type="file"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          accept="*/*"
        />

        {selectedFile && (
          <p
            style={{
              marginTop: "1rem",
              fontSize: "1rem",
              opacity: 0.9,
            }}
          >
            Selected: {selectedFile.name}
          </p>
        )}
      </div>
    </div>
  );
}

export default App;
