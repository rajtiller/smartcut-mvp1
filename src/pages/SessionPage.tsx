import React, { useState, useRef, useMemo } from "react";
import { Upload, Scissors, Download, ArrowLeft, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import type { TranscriptionResult, SilenceSegment, Session } from "../types";
import { saveSession } from "../services/sessionService";
import { getSettings } from "../services/settingsService";

// --- Types ---
interface UnifiedSegment {
  id: string;
  type: "text" | "silence";
  start: number;
  end: number;
  content: string; // Text for transcript, duration string for silence
  raw?: any; // Keep reference to original object if needed
}

// --- Components ---

const UploadModule: React.FC<{
  onFileSelect: (file: File) => void;
  isProcessing: boolean;
}> = ({ onFileSelect, isProcessing }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="card"
      style={{
        padding: "4rem 2rem",
        textAlign: "center",
        backgroundColor: isDragging ? "var(--primary-light)" : "var(--surface)",
        border: isDragging ? "2px dashed var(--primary)" : "2px dashed var(--border)",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.2s ease",
        minHeight: "400px"
      }}
      onClick={() => document.getElementById("file-input")?.click()}
    >
      <input
        type="file"
        id="file-input"
        style={{ display: "none" }}
        onChange={(e) => e.target.files?.[0] && onFileSelect(e.target.files[0])}
        accept="video/*,audio/*"
        disabled={isProcessing}
      />
      <div style={{ 
        marginBottom: "1.5rem", 
        color: isDragging ? "var(--primary)" : "var(--text-secondary)",
        background: isDragging ? "white" : "var(--background)",
        padding: "1.5rem",
        borderRadius: "50%"
      }}>
        {isProcessing ? <RefreshCw className="spin" size={48} /> : <Upload size={48} strokeWidth={1.5} />}
      </div>
      <h3 style={{ fontSize: "1.25rem", fontWeight: "700", marginBottom: "0.75rem", color: "var(--text-main)" }}>
        {isProcessing ? "Processing Media..." : "Drag & drop your media here"}
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", maxWidth: "300px", margin: "0 auto" }}>
        {isProcessing ? "We're analyzing silence and generating transcripts." : "or click to browse files (MP4, MOV, MP3, WAV)"}
      </p>
    </div>
  );
};

const ProcessModule: React.FC<{
  file: File;
  segments: UnifiedSegment[];
  onToggleCut: (id: string) => void;
  cuts: Set<string>;
  videoUrl: string | null;
}> = ({ file, segments, onToggleCut, cuts, videoUrl }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentTime, setCurrentTime] = useState(0);

  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      videoRef.current.pause(); // Pause after seek as requested
    }
  };

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "2rem", height: "75vh" }}>
      {/* Left: Player (Sticky) */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ 
          background: "#000", 
          borderRadius: "var(--radius)", 
          overflow: "hidden", 
          boxShadow: "var(--shadow-lg)",
          aspectRatio: "16/9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative"
        }}>
           {videoUrl ? (
             <video 
               ref={videoRef}
               src={videoUrl}
               controls
               style={{ width: "100%", height: "100%" }}
               onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
             />
           ) : (
             <div style={{ color: "white" }}>Loading Preview...</div>
           )}
        </div>
        <div className="card" style={{ padding: "1rem 1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
             <div>
               <h4 style={{ margin: "0 0 0.25rem 0", fontSize: "1rem" }}>{file.name}</h4>
               <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
                 Current Time: <span style={{ fontFamily: "monospace", fontWeight: 600 }}>{currentTime.toFixed(2)}s</span>
               </p>
             </div>
             <div className="badge badge-neutral">
               {segments.length} Segments
             </div>
        </div>
      </div>

      {/* Right: Transcript Stream */}
      <div className="card" style={{ 
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        padding: 0,
        height: "100%"
      }}>
        <div style={{ padding: "1.25rem", borderBottom: "1px solid var(--border)", background: "var(--surface)" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: "700" }}>Transcript & Silence</h3>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", padding: "1rem" }}>
          {segments.map((item) => {
            const isSelected = cuts.has(item.id);
            const isSilence = item.type === "silence";
            // Removed active state tracking to simplify UI and avoid multiple highlights
            // const isActive = currentTime >= item.start && currentTime < item.end;

            return (
              <div 
                key={item.id}
                onClick={() => handleSeek(item.start)}
                style={{ 
                  marginBottom: "0.75rem", 
                  padding: "1rem", 
                  background: isSelected 
                    ? "var(--danger-light)" // Red background for cut
                    : isSilence 
                        ? "#f8fafc" // Light gray for silence
                        : "transparent", // White/transparent for normal text
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  border: isSelected 
                    ? "1px solid var(--danger)" 
                    : "1px solid transparent",
                  transition: "all 0.2s",
                  cursor: "pointer",
                  position: "relative"
                }}
                onMouseOver={(e) => {
                  if (!isSelected) e.currentTarget.style.backgroundColor = isSilence ? "#f1f5f9" : "#f8fafc";
                }}
                onMouseOut={(e) => {
                   if (!isSelected) e.currentTarget.style.backgroundColor = isSilence ? "#f8fafc" : "transparent";
                }}
              >
                {/* Time & Type Indicator */}
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "flex-start",
                  minWidth: "70px",
                  gap: "0.25rem"
                }}>
                  <span style={{ 
                    fontSize: "0.75rem", 
                    color: "var(--text-secondary)",
                    fontFamily: "monospace",
                    background: "var(--background)",
                    padding: "2px 6px",
                    borderRadius: "4px"
                  }}>
                    {item.start.toFixed(1)}s
                  </span>
                  {isSilence && (
                    <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginTop: "4px" }}>
                      <span style={{ 
                        fontSize: "0.65rem", 
                        fontWeight: "700", 
                        textTransform: "uppercase", 
                        color: "var(--danger)",
                        background: "rgba(239, 68, 68, 0.1)",
                        padding: "0.1rem 0.4rem",
                        borderRadius: "4px"
                      }}>
                        Silence
                      </span>
                      {item.raw?.confidence !== undefined && (
                        <span style={{
                          fontSize: "0.6rem",
                          color: "var(--text-secondary)",
                          fontFamily: "monospace",
                          background: "var(--background)",
                          padding: "0.1rem 0.3rem",
                          borderRadius: "3px",
                          textAlign: "center"
                        }}>
                          {(item.raw.confidence * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div style={{ 
                  flex: 1, 
                  fontSize: "0.95rem", 
                  lineHeight: "1.6", 
                  color: isSelected ? "var(--text-muted)" : "var(--text-main)", 
                  textDecoration: isSelected ? "line-through" : "none",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.25rem"
                }}>
                  <span>{item.content}</span>
                  {isSilence && item.raw?.confidence !== undefined && (
                    <span style={{
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                      fontStyle: "italic"
                    }}>
                      Confidence: <strong style={{ fontFamily: "monospace", color: "var(--text-main)" }}>{(item.raw.confidence * 100).toFixed(0)}%</strong>
                    </span>
                  )}
                </div>
                
                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCut(item.id);
                  }}
                  className={isSelected ? "btn btn-danger" : "btn btn-secondary"}
                  style={{
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.75rem",
                    whiteSpace: "nowrap",
                    height: "32px"
                  }}
                >
                    <Scissors size={14} />
                    {isSelected ? "Restore" : "Cut"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const SessionPage: React.FC = () => {
  const navigate = useNavigate();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [silenceSegments, setSilenceSegments] = useState<SilenceSegment[]>([]);
  const [selectedCuts, setSelectedCuts] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"upload" | "process" | "download">("upload");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string>("");

  // Construct unified segments list
  const allSegments = useMemo<UnifiedSegment[]>(() => {
    if (!transcription) return [];
    
    const items: UnifiedSegment[] = [];

    // Add text segments
    transcription.segments.forEach((seg, idx) => {
      items.push({
        id: `text-${idx}`,
        type: "text",
        start: seg.start,
        end: seg.end,
        content: seg.text,
        raw: seg
      });
    });

    // Add silence segments
    silenceSegments.forEach((seg, idx) => {
      items.push({
        id: `silence-${idx}`,
        type: "silence",
        start: seg.start,
        end: seg.end,
        content: `Duration: ${seg.duration.toFixed(1)}s`,
        raw: seg
      });
    });

    return items.sort((a, b) => a.start - b.start);
  }, [transcription, silenceSegments]);

  const handleFileSelect = async (file: File) => {
    setSelectedFile(file);
    setVideoUrl(URL.createObjectURL(file));
    setIsProcessing(true);

    const newSessionId = Date.now().toString();
    setSessionId(newSessionId);

    const newSession: Session = {
      id: newSessionId,
      name: file.name,
      date: new Date().toLocaleString(),
      status: "Draft",
      duration: "Calculating..."
    };
    saveSession(newSession);
    
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const transResponse = await fetch(`${API_URL}/upload`, {
        method: "POST",
        body: formData,
      });
      if (!transResponse.ok) throw new Error("Transcription failed");
      const transResult = await transResponse.json();
      setTranscription(transResult);

      // Get settings from user preferences
      const settings = getSettings();
      
      const silenceFormData = new FormData();
      silenceFormData.append("file", file);
      silenceFormData.append("min_duration", settings.minSilenceDuration.toString());
      silenceFormData.append("threshold", settings.silenceThreshold.toString());
      
      const silenceResponse = await fetch(`${API_URL}/detect-silence-5s`, {
        method: "POST",
        body: silenceFormData,
      });
      if (!silenceResponse.ok) throw new Error("Silence detection failed");
      const silenceResult = await silenceResponse.json();
      setSilenceSegments(silenceResult.silence_segments);
      
      setStep("process");

      saveSession({
        ...newSession,
        status: "Processed",
        duration: `${Math.round(silenceResult.silence_segments[silenceResult.silence_segments.length - 1]?.end || 0)}s`
      });

    } catch (error) {
      console.error(error);
      alert("Error processing file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCut = (id: string) => {
    const newSet = new Set(selectedCuts);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedCuts(newSet);
  };

  const handleProcessCut = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    try {
       // Filter segments to cut based on selected IDs
       const cutsToMake = allSegments
         .filter(seg => selectedCuts.has(seg.id))
         .map(seg => ({ start: seg.start, end: seg.end }));
       
       const formData = new FormData();
       formData.append("file", selectedFile);
       formData.append("cuts", JSON.stringify(cutsToMake));
       
       const response = await fetch(`${API_URL}/cut-video`, { method: "POST", body: formData });
       if (!response.ok) throw new Error("Cut failed");
       
       const url = `${API_URL}/download/cut_${selectedFile.name}`;
       setDownloadUrl(url);
       setStep("download");

       if (sessionId) {
          saveSession({
            id: sessionId,
            name: selectedFile.name,
            date: new Date().toLocaleString(),
            status: "Completed",
            downloadUrl: url,
            duration: "Processed" 
          });
       }

    } catch (e) {
      console.error(e);
      alert("Failed to cut video");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div style={{ padding: "2rem", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div className="container" style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Header Navigation */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem", gap: "1rem" }}>
           <button 
            onClick={() => navigate("/")} 
            className="btn btn-ghost"
            style={{ padding: "0.5rem", borderRadius: "50%", width: "40px", height: "40px" }}
          >
             <ArrowLeft size={24} />
           </button>
           <div>
             <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0 }}>
               {step === "upload" && "New Session"}
               {step === "process" && "Editor"}
               {step === "download" && "Ready to Download"}
             </h1>
             <p style={{ margin: "0.25rem 0 0", color: "var(--text-secondary)", fontSize: "0.875rem" }}>
                {step === "upload" && "Upload your video to get started"}
                {step === "process" && "Review segments and select cuts"}
                {step === "download" && "Export your masterpiece"}
             </p>
           </div>
        </div>

        <div style={{ flex: 1 }}>
          {step === "upload" && (
            <div style={{ maxWidth: "600px", margin: "4rem auto" }}>
              <UploadModule onFileSelect={handleFileSelect} isProcessing={isProcessing} />
            </div>
          )}

          {step === "process" && selectedFile && (
            <div style={{ display: "flex", flexDirection: "column", gap: "2rem" }}>
               <ProcessModule 
                 file={selectedFile}
                 segments={allSegments}
                 onToggleCut={toggleCut}
                 cuts={selectedCuts}
                 videoUrl={videoUrl}
               />
               
               <div style={{ 
                 position: "fixed", 
                 bottom: 0, 
                 left: 0, 
                 right: 0, 
                 background: "var(--surface)", 
                 borderTop: "1px solid var(--border)", 
                 padding: "1rem 2rem",
                 display: "flex",
                 justifyContent: "center",
                 alignItems: "center",
                 boxShadow: "0 -4px 6px -1px rgb(0 0 0 / 0.1)",
                 zIndex: 100
               }}>
                  <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <div style={{ color: "var(--text-secondary)" }}>
                       <span style={{ fontWeight: 700, color: "var(--text-main)" }}>{selectedCuts.size}</span> segments marked for cutting
                    </div>
                    <div style={{ display: "flex", gap: "1rem" }}>
                      <button 
                         onClick={() => setStep("upload")}
                         className="btn btn-secondary"
                      >
                        Cancel
                      </button>
                      <button
                         onClick={handleProcessCut}
                         disabled={isProcessing || selectedCuts.size === 0}
                         className="btn btn-primary"
                      >
                         {isProcessing ? "Processing..." : "Export Cut Video"}
                      </button>
                    </div>
                  </div>
               </div>
               <div style={{ height: "80px" }}></div> {/* Spacer for fixed bottom bar */}
            </div>
          )}

          {step === "download" && downloadUrl && (
            <div style={{ textAlign: "center", maxWidth: "500px", margin: "4rem auto" }}>
              <div style={{ width: "96px", height: "96px", background: "var(--success-light)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2rem", color: "var(--success)" }}>
                <Download size={48} />
              </div>
              <h2 style={{ fontSize: "2.5rem", fontWeight: "800", marginBottom: "1rem" }}>Your video is ready!</h2>
              <p style={{ color: "var(--text-secondary)", marginBottom: "3rem", fontSize: "1.125rem" }}>
                We've successfully processed your video and removed {selectedCuts.size} segments.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <button
                  onClick={() => window.open(downloadUrl, "_blank")}
                  className="btn btn-primary"
                  style={{ padding: "1rem", fontSize: "1.125rem" }}
                >
                  <Download size={20} />
                  Download Video
                </button>
                <button
                  onClick={() => setStep("upload")}
                   className="btn btn-ghost"
                   style={{ padding: "1rem" }}
                >
                  Start New Session
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SessionPage;
