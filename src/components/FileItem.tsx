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
  // Adjust padding and spacing based on display type for shorter height
  const getPadding = () => {
    switch (displayType) {
      case "title":
        return "0.5rem 1rem";
      case "title-duration":
        return "0.75rem 1rem";
      default:
        return "1rem";
    }
  };

  const baseStyle = {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: "8px",
    padding: getPadding(),
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
            margin: displayType === "title" ? "0" : "0 0 0.25rem 0", // Reduced bottom margin for shorter height
            fontSize: "1rem",
            fontWeight: "600",
            lineHeight: "1.2", // Tighter line height
          }}
        >
          {fileInfo.file.name}
        </h3>

        {(displayType === "title-duration" ||
          displayType === "title-duration-thumbnail") && (
          <div
            style={{
              fontSize: "0.85rem", // Slightly smaller font
              opacity: 0.8,
              display: "flex",
              gap: "1rem",
              lineHeight: "1.1", // Tighter line height for compact display
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
          padding: displayType === "title" ? "0.4rem 0.6rem" : "0.5rem", // Smaller padding for title-only
          cursor: "pointer",
          fontSize: "0.8rem",
          minWidth: "auto",
        }}
      >
        {displayType === "title" ? "×" : "Remove"}{" "}
        {/* Use × symbol for compact display */}
      </button>
    </div>
  );
};
