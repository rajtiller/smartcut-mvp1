import { useState } from "react";
import "./App.css";
import type { FileInfo, DisplayType } from "./types";
import { getVideoDuration, generateThumbnail } from "./utils/videoUtils";
import { DisplayTypeSelector } from "./components/DisplayTypeSelector";
import { FileList } from "./components/FileList";
import { TrimPage } from "./pages/TrimPage";

interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens: number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
  confidence: number;
}

interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
}

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [transcriptionResult, setTranscriptionResult] =
    useState<TranscriptionResult | null>(null);
  const [silenceSegments, setSilenceSegments] = useState<SilenceSegment[]>([]);
  const [selectedCuts, setSelectedCuts] = useState<Set<number>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<
    "upload" | "transcribe" | "silence" | "cut" | "download"
  >("upload");

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setCurrentStep("upload");
    }
  };

  const triggerFileSelect = () => {
    const fileInput = document.getElementById("fileInput") as HTMLInputElement;
    fileInput?.click();
  };
  const handleTranscribe = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Transcription failed");
      }

      const result = await response.json();
      setTranscriptionResult(result);
      setCurrentStep("transcribe");

      // Automatically detect silence
      await handleDetectSilence();
    } catch (error) {
      console.error("Transcription error:", error);
      alert("Transcription failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDetectSilence = async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("threshold", "0.5");
      formData.append("min_duration", "1.0");

      const response = await fetch("http://localhost:8000/detect-silence", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Silence detection failed");
      }

      const result = await response.json();
      setSilenceSegments(result.silence_segments);
      setCurrentStep("silence");
    } catch (error) {
      console.error("Silence detection error:", error);
      alert("Silence detection failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCutVideo = async () => {
    if (!selectedFile || selectedCuts.size === 0) return;

    setIsProcessing(true);
    try {
      const cutsToMake = Array.from(selectedCuts).map(
        (index) => silenceSegments[index]
      );

      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("cuts", JSON.stringify(cutsToMake));

      const response = await fetch("http://localhost:8000/cut-video", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => ({ detail: "Unknown error" }));
        throw new Error(errorData.detail || "Video cutting failed");
      }

      const result = await response.json();
      console.log("Cut result:", result);
      setCurrentStep("download");
    } catch (error) {
      console.error("Video cutting error:", error);
      alert(
        `Video cutting failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCutSelection = (index: number) => {
    const newSelectedCuts = new Set(selectedCuts);
    if (newSelectedCuts.has(index)) {
      newSelectedCuts.delete(index);
    } else {
      newSelectedCuts.add(index);
    }
    setSelectedCuts(newSelectedCuts);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
          marginBottom: "2rem",
          marginTop: "1rem",
        }}
      >
        Smart Cut
      </h1>

      {/* Progress Steps */}
      <div
        style={{
          display: "flex",
          gap: "1rem",
          marginBottom: "2rem",
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {["upload", "transcribe", "silence", "cut", "download"].map(
          (step, index) => (
            <div
              key={step}
              style={{
                padding: "0.5rem 1rem",
                borderRadius: "20px",
                backgroundColor:
                  currentStep === step ? "white" : "rgba(255,255,255,0.2)",
                color: currentStep === step ? "#8B5CF6" : "white",
                fontSize: "0.9rem",
                fontWeight: "600",
                textTransform: "capitalize",
              }}
            >
              {step}
            </div>
          )
        )}
      </div>

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
        {/* Step 1: File Upload */}
        {currentStep === "upload" && (
          <>
            <button
              onClick={triggerFileSelect}
              disabled={isProcessing}
              style={{
                backgroundColor: "white",
                color: "#8B5CF6",
                border: "none",
                padding: "1rem 2rem",
                fontSize: "1rem",
                fontWeight: "600",
                borderRadius: "8px",
                cursor: isProcessing ? "not-allowed" : "pointer",
                boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
                transition: "transform 0.2s, box-shadow 0.2s",
                opacity: isProcessing ? 0.6 : 1,
              }}
            >
              {isProcessing ? "Processing..." : "Click here to add files"}
            </button>

            <input
              id="fileInput"
              type="file"
              onChange={handleFileSelect}
              style={{ display: "none" }}
              accept="audio/*,video/*"
            />

            {selectedFile && (
              <div style={{ textAlign: "center", marginTop: "1rem" }}>
                <p
                  style={{
                    fontSize: "1rem",
                    opacity: 0.9,
                    marginBottom: "1rem",
                  }}
                >
                  Selected: {selectedFile.name}
                </p>
                <button
                  onClick={handleTranscribe}
                  disabled={isProcessing}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.2)",
                    color: "white",
                    border: "2px solid white",
                    padding: "0.8rem 1.5rem",
                    fontSize: "1rem",
                    fontWeight: "600",
                    borderRadius: "8px",
                    cursor: isProcessing ? "not-allowed" : "pointer",
                    opacity: isProcessing ? 0.6 : 1,
                  }}
                >
                  {isProcessing ? "Processing..." : "Start Processing"}
                </button>
              </div>
            )}
          </>
        )}

        {/* Step 2: Transcription Results */}
        {currentStep === "transcribe" && transcriptionResult && (
          <div style={{ width: "100%", textAlign: "center" }}>
            <h3 style={{ marginBottom: "1rem" }}>Transcription Complete</h3>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                padding: "1rem",
                borderRadius: "8px",
                marginBottom: "1rem",
                maxHeight: "200px",
                overflowY: "auto",
              }}
            >
              <p style={{ fontSize: "0.9rem", lineHeight: "1.5" }}>
                {transcriptionResult.text}
              </p>
            </div>
            <p style={{ fontSize: "0.8rem", opacity: 0.8 }}>
              Language: {transcriptionResult.language} | Segments:{" "}
              {transcriptionResult.segments.length}
            </p>
          </div>
        )}

        {/* Step 3: Silence Detection */}
        {currentStep === "silence" && silenceSegments.length > 0 && (
          <div style={{ width: "100%" }}>
            <h3 style={{ marginBottom: "1rem", textAlign: "center" }}>
              Silence Segments Found ({silenceSegments.length})
            </h3>
            <div
              style={{
                backgroundColor: "rgba(255,255,255,0.1)",
                padding: "1rem",
                borderRadius: "8px",
                maxHeight: "300px",
                overflowY: "auto",
              }}
            >
              {silenceSegments.map((segment, index) => (
                <div
                  key={index}
                  onClick={() => toggleCutSelection(index)}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "0.5rem",
                    margin: "0.25rem 0",
                    backgroundColor: selectedCuts.has(index)
                      ? "rgba(255,255,255,0.3)"
                      : "rgba(255,255,255,0.1)",
                    borderRadius: "4px",
                    cursor: "pointer",
                    border: selectedCuts.has(index)
                      ? "2px solid white"
                      : "2px solid transparent",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: "600" }}>
                      {formatTime(segment.start)} - {formatTime(segment.end)}
                    </span>
                    <span style={{ marginLeft: "1rem", opacity: 0.8 }}>
                      ({segment.duration.toFixed(1)}s)
                    </span>
                  </div>
                  <div style={{ fontSize: "0.8rem", opacity: 0.8 }}>
                    Confidence: {(segment.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center", marginTop: "1rem" }}>
              <p style={{ fontSize: "0.9rem", marginBottom: "1rem" }}>
                Selected {selectedCuts.size} segments to cut
              </p>
              <button
                onClick={handleCutVideo}
                disabled={isProcessing || selectedCuts.size === 0}
                style={{
                  backgroundColor:
                    selectedCuts.size > 0 ? "white" : "rgba(255,255,255,0.3)",
                  color:
                    selectedCuts.size > 0 ? "#8B5CF6" : "rgba(255,255,255,0.6)",
                  border: "none",
                  padding: "1rem 2rem",
                  fontSize: "1rem",
                  fontWeight: "600",
                  borderRadius: "8px",
                  cursor:
                    selectedCuts.size > 0 && !isProcessing
                      ? "pointer"
                      : "not-allowed",
                }}
              >
                {isProcessing
                  ? "Processing..."
                  : `Cut ${selectedCuts.size} Segments`}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Download */}
        {currentStep === "download" && (
          <div style={{ textAlign: "center" }}>
            <h3 style={{ marginBottom: "1rem" }}>Video Cut Successfully!</h3>
            <p style={{ marginBottom: "1rem", opacity: 0.9 }}>
              Your processed file is ready for download.
            </p>
            <button
              onClick={() =>
                window.open(
                  `http://localhost:8000/download/cut_${selectedFile?.name}`,
                  "_blank"
                )
              }
              style={{
                backgroundColor: "white",
                color: "#8B5CF6",
                border: "none",
                padding: "1rem 2rem",
                fontSize: "1rem",
                fontWeight: "600",
                borderRadius: "8px",
                cursor: "pointer",
                marginRight: "1rem",
              }}
            >
              Download File
            </button>
            <button
              onClick={() => {
                setSelectedFile(null);
                setTranscriptionResult(null);
                setSilenceSegments([]);
                setSelectedCuts(new Set());
                setCurrentStep("upload");
              }}
              style={{
                backgroundColor: "rgba(255,255,255,0.2)",
                color: "white",
                border: "2px solid white",
                padding: "1rem 2rem",
                fontSize: "1rem",
                fontWeight: "600",
                borderRadius: "8px",
                cursor: "pointer",
              }}
            >
              Process Another File
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
