import React, { useState, useRef, useMemo } from "react";
import { Upload, Scissors, Download, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../config";
import type { TranscriptionResult, SilenceSegment, Session } from "../types";
import { saveSession } from "../services/sessionService";

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
      style={{
        border: `2px dashed ${isDragging ? "var(--primary)" : "var(--border)"}`,
        borderRadius: "var(--radius)",
        padding: "3rem",
        textAlign: "center",
        backgroundColor: isDragging ? "#eff6ff" : "var(--surface)",
        transition: "all 0.2s",
        cursor: "pointer"
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
      <div style={{ marginBottom: "1rem", color: isDragging ? "var(--primary)" : "var(--text-secondary)" }}>
        <Upload size={48} strokeWidth={1.5} />
      </div>
      <h3 style={{ fontSize: "1.125rem", fontWeight: "600", marginBottom: "0.5rem" }}>
        {isProcessing ? "Processing..." : "Drag & drop your media here"}
      </h3>
      <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem" }}>
        or click to browse files (MP4, MOV, MP3, WAV)
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
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem", height: "70vh" }}>
      {/* Left: Player (Sticky) */}
      <div style={{ position: "relative", display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div style={{ 
          background: "#000", 
          borderRadius: "var(--radius)", 
          overflow: "hidden", 
          boxShadow: "var(--shadow-md)",
          aspectRatio: "16/9",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
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
        <div style={{ padding: "1rem", background: "var(--surface)", borderRadius: "var(--radius)", border: "1px solid var(--border)" }}>
             <h4 style={{ margin: "0 0 0.5rem 0", fontSize: "1rem" }}>{file.name}</h4>
             <p style={{ color: "var(--text-secondary)", fontSize: "0.875rem", margin: 0 }}>
               Current Time: {currentTime.toFixed(2)}s
             </p>
        </div>
      </div>

      {/* Right: Transcript Stream */}
      <div style={{ 
        background: "var(--surface)", 
        borderRadius: "var(--radius)", 
        border: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }}>
        <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", background: "#f8fafc" }}>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: "600" }}>Transcript & Silence</h3>
        </div>
        
        <div style={{ flex: 1, overflowY: "auto", padding: "1.5rem" }}>
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
                  margin: "0.5rem 0", 
                  padding: "0.75rem", 
                  background: isSelected 
                    ? "#fee2e2" // Red background for cut
                    : isSilence 
                        ? "#f8fafc" // Light gray for silence
                        : "transparent", // White/transparent for normal text
                  borderRadius: "8px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "1rem",
                  border: isSelected 
                    ? "1px solid #ef4444" 
                    : "1px solid transparent",
                  transition: "all 0.2s",
                  cursor: "pointer"
                }}
              >
                {/* Time & Type Indicator */}
                <div style={{ 
                  display: "flex", 
                  flexDirection: "column", 
                  alignItems: "flex-start",
                  minWidth: "80px",
                  gap: "0.25rem"
                }}>
                  <span style={{ 
                    fontSize: "0.75rem", 
                    color: "var(--text-secondary)",
                    fontFamily: "monospace"
                  }}>
                    {item.start.toFixed(1)}s
                  </span>
                  {isSilence && (
                     <span style={{ 
                      fontSize: "0.65rem", 
                      fontWeight: "700", 
                      textTransform: "uppercase", 
                      color: "#ef4444",
                      background: "#fee2e2",
                      padding: "0.1rem 0.3rem",
                      borderRadius: "4px"
                    }}>
                      Silence
                    </span>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, fontSize: "1rem", lineHeight: "1.5", color: isSelected ? "#9ca3af" : "var(--text-main)", textDecoration: isSelected ? "line-through" : "none" }}>
                  {item.content}
                </div>
                
                {/* Action Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCut(item.id);
                  }}
                  style={{
                    background: isSelected ? "#ef4444" : "white",
                    color: isSelected ? "white" : "var(--text-secondary)",
                    border: "1px solid var(--border)",
                    borderRadius: "4px",
                    padding: "0.4rem 0.8rem",
                    fontSize: "0.75rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    transition: "all 0.2s",
                    whiteSpace: "nowrap"
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

      const silenceFormData = new FormData();
      silenceFormData.append("file", file);
      silenceFormData.append("min_duration", "1.0");
      silenceFormData.append("threshold", "0.4");
      
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
    <div style={{ maxWidth: "1400px", margin: "0 auto", padding: "2rem", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "2rem", gap: "1rem" }}>
         <button onClick={() => navigate("/")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
           <ArrowLeft />
         </button>
         <h1 style={{ fontSize: "1.5rem", fontWeight: "700", margin: 0 }}>
           {step === "upload" && "New Session"}
           {step === "process" && "Editor"}
           {step === "download" && "Ready to Download"}
         </h1>
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
               justifyContent: "flex-end",
               alignItems: "center",
               gap: "1rem",
               boxShadow: "0 -4px 6px -1px rgb(0 0 0 / 0.1)"
             }}>
                <div style={{ marginRight: "auto", color: "var(--text-secondary)" }}>
                   {selectedCuts.size} segments selected to cut
                </div>
                <button 
                   onClick={() => setStep("upload")}
                   style={{ padding: "0.75rem 1.5rem", borderRadius: "8px", border: "1px solid var(--border)", background: "white", cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                   onClick={handleProcessCut}
                   disabled={isProcessing || selectedCuts.size === 0}
                   style={{ 
                     padding: "0.75rem 1.5rem", 
                     borderRadius: "8px", 
                     background: "var(--primary)", 
                     color: "white", 
                     border: "none", 
                     fontWeight: "600",
                     cursor: selectedCuts.size === 0 ? "not-allowed" : "pointer",
                     opacity: selectedCuts.size === 0 ? 0.5 : 1
                   }}
                >
                   {isProcessing ? "Processing..." : "Export Cut Video"}
                </button>
             </div>
          </div>
        )}

        {step === "download" && downloadUrl && (
          <div style={{ textAlign: "center", maxWidth: "500px", margin: "4rem auto" }}>
            <div style={{ width: "80px", height: "80px", background: "#dcfce7", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1.5rem", color: "#166534" }}>
              <Download size={40} />
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: "700", marginBottom: "1rem" }}>Your video is ready!</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "2rem" }}>
              We've processed {selectedCuts.size} cuts.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <button
                onClick={() => window.open(downloadUrl, "_blank")}
                style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "8px",
                  background: "var(--primary)",
                  color: "white",
                  border: "none",
                  fontWeight: "600",
                  fontSize: "1.125rem",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.5rem"
                }}
              >
                <Download size={20} />
                Download Video
              </button>
              <button
                onClick={() => setStep("upload")}
                 style={{
                  width: "100%",
                  padding: "1rem",
                  borderRadius: "8px",
                  background: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border)",
                  fontWeight: "600",
                  cursor: "pointer"
                }}
              >
                Start New Session
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionPage;
