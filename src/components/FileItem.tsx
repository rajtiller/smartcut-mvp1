import React from "react";
import type { FileInfo, DisplayType } from "../types";
import { formatFileSize, formatDuration } from "../utils/formatters";

interface FileItemProps {
  fileInfo: FileInfo;
  index: number;
  displayType: DisplayType;
  onRemove: (index: number) => void;
}

export const FileItem: React.FC<FileItemProps> = ({
  fileInfo,
  index,
  displayType,
  onRemove,
}) => {
  const baseStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: displayType === "title" ? "0.5rem 1rem" : "1rem",
    display: "flex",
    alignItems: "center",
    gap: "1rem",
    backdropFilter: "blur(10px)",
    position: "relative" as const,
  };

  return (
    <div style={baseStyle}>
      {displayType === "title-duration-thumbnail" && (
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
      )}

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

        {(displayType === "title-duration" ||
          displayType === "title-duration-thumbnail") && (
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
        )}
      </div>

      <button
        onClick={() => onRemove(index)}
        style={{
          backgroundColor: "#ef4444",
          color: "white",
          border: "none",
          borderRadius: "4px",
          padding: "0.5rem",
          cursor: "pointer",
          fontSize: "0.8rem",
        }}
      >
        Remove
      </button>
    </div>
  );
};
