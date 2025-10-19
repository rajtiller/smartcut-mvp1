import { useState } from "react";
import "./App.css";
import type { FileInfo, DisplayType } from "./types";
import { getVideoDuration, generateThumbnail } from "./utils/videoUtils";
import { DisplayTypeSelector } from "./components/DisplayTypeSelector";
import { FileList } from "./components/FileList";
import { TrimPage } from "./pages/TrimPage";

function App() {
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [displayType, setDisplayType] = useState<DisplayType>(
    "title-duration-thumbnail"
  );
  const [currentPage, setCurrentPage] = useState<"home" | "trim">("home");

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const mp4Files = files.filter((file) => file.type === "video/mp4");

    if (mp4Files.length === 0) {
      alert("Please select MP4 files only");
      return;
    }

    const newFiles = mp4Files.filter(
      (newFile) =>
        !selectedFiles.some(
          (existingFile) =>
            existingFile.file.name === newFile.name &&
            existingFile.file.size === newFile.size
        )
    );

    if (newFiles.length === 0) {
      alert("All selected files are already in the list");
      return;
    }

    setIsProcessing(true);

    try {
      const fileInfoPromises = newFiles.map(async (file) => {
        const duration = await getVideoDuration(file);
        const thumbnail = await generateThumbnail(file);
        return { file, duration, thumbnail };
      });

      const fileInfos = await Promise.all(fileInfoPromises);
      setSelectedFiles((prev) => [...prev, ...fileInfos]);
    } catch (error) {
      console.error("Error processing files:", error);
    } finally {
      setIsProcessing(false);
    }

    event.target.value = "";
  };

  const triggerFileSelect = () => {
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    fileInput?.click();
  };

  const handleTrimClick = () => {
    setCurrentPage("trim");
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleBackToHome = () => {
    setCurrentPage("home");
  };

  if (currentPage === "trim") {
    return <TrimPage files={selectedFiles} onBack={handleBackToHome} />;
  }

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
        overflow: "auto",
      }}
    >
      <h1
        style={{
          fontSize: "3rem",
          fontWeight: "bold",
          marginBottom: "2rem",
          marginTop: "1rem",
        }}
      >
        Smart Cut
      </h1>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "2rem",
          width: "100%",
          maxWidth: "800px",
          flex: 1,
        }}
      >
        <button
          onClick={triggerFileSelect}
          disabled={isProcessing}
          style={{
            backgroundColor: isProcessing ? "#ccc" : "white",
            color: isProcessing ? "#666" : "#8B5CF6",
            border: "none",
            padding: "1rem 2rem",
            fontSize: "1.2rem",
            fontWeight: "600",
            borderRadius: "8px",
            cursor: isProcessing ? "not-allowed" : "pointer",
            boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
            transition: "transform 0.2s, box-shadow 0.2s",
          }}
          onMouseOver={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.transform = "translateY(-2px)";
              e.currentTarget.style.boxShadow = "0 6px 8px rgba(0, 0, 0, 0.15)";
            }
          }}
          onMouseOut={(e) => {
            if (!isProcessing) {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 6px rgba(0, 0, 0, 0.1)";
            }
          }}
        >
          {isProcessing
            ? "Processing..."
            : selectedFiles.length > 0
            ? "Add more files"
            : "Click here to add files"}
        </button>

        <input
          id="fileInput"
          type="file"
          onChange={handleFileSelect}
          style={{ display: "none" }}
          accept="video/mp4"
          multiple
        />

        {selectedFiles.length > 0 && (
          <div
            style={{
              width: "100%",
              display: "flex",
              flexDirection: "column",
              gap: "1rem",
              alignItems: "center",
              flex: 1,
              minHeight: 0,
            }}
          >
            <button
              onClick={handleTrimClick}
              style={{
                backgroundColor: "#22C55E",
                color: "white",
                border: "none",
                padding: "1rem 2rem",
                fontSize: "1.2rem",
                fontWeight: "600",
                borderRadius: "8px",
                cursor: "pointer",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
              }}
            >
              Trim these {selectedFiles.length} clip(s)
            </button>

            <DisplayTypeSelector
              displayType={displayType}
              onDisplayTypeChange={setDisplayType}
            />

            <FileList
              files={selectedFiles}
              displayType={displayType}
              onRemoveFile={removeFile}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
