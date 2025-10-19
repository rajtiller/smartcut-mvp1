import { useState, useEffect } from "react";
import "./App.css";

interface FileInfo {
  file: File;
  duration: number;
  thumbnail: string;
}

function App() {
  const [selectedFiles, setSelectedFiles] = useState<FileInfo[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      video.onloadedmetadata = () => {
        resolve(video.duration);
      };
      video.src = URL.createObjectURL(file);
    });
  };

  const generateThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      video.onloadeddata = () => {
        canvas.width = 160;
        canvas.height = 90;
        video.currentTime = 1; // Seek to 1 second for thumbnail
      };

      video.onseeked = () => {
        ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL());
      };

      video.src = URL.createObjectURL(file);
    });
  };

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    const mp4Files = files.filter((file) => file.type === "video/mp4");

    if (mp4Files.length === 0) {
      alert("Please select MP4 files only");
      return;
    }

    setIsProcessing(true);

    try {
      const fileInfoPromises = mp4Files.map(async (file) => {
        const duration = await getVideoDuration(file);
        const thumbnail = await generateThumbnail(file);
        return { file, duration, thumbnail };
      });

      const fileInfos = await Promise.all(fileInfoPromises);
      setSelectedFiles(fileInfos);
    } catch (error) {
      console.error("Error processing files:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerFileSelect = () => {
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    fileInput?.click();
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleTrimClick = () => {
    console.log("Trimming files:", selectedFiles);
    // Add your trim logic here
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
        overflow: "auto",
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
          gap: "2rem",
          width: "100%",
          maxWidth: "800px",
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
          {isProcessing ? "Processing..." : "Click here to add files"}
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
              gap: "2rem",
              alignItems: "center",
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
              Trim these clip(s)
            </button>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1rem",
                width: "100%",
              }}
            >
              {selectedFiles.map((fileInfo, index) => (
                <div
                  key={index}
                  style={{
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                    borderRadius: "8px",
                    padding: "1rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    backdropFilter: "blur(10px)",
                  }}
                >
                  <img
                    src={fileInfo.thumbnail}
                    alt="Video thumbnail"
                    style={{
                      width: "80px",
                      height: "45px",
                      borderRadius: "4px",
                      objectFit: "cover",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <h3
                      style={{
                        margin: "0 0 0.5rem 0",
                        fontSize: "1rem",
                        fontWeight: "600",
                      }}
                    >
                      {fileInfo.file.name}
                    </h3>
                    <div
                      style={{
                        fontSize: "0.9rem",
                        opacity: 0.8,
                        display: "flex",
                        gap: "1rem",
                      }}
                    >
                      <span>Size: {formatFileSize(fileInfo.file.size)}</span>
                      <span>Duration: {formatDuration(fileInfo.duration)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
