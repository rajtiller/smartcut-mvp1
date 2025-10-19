import React from "react";
import type { DisplayType } from "../types";

interface DisplayTypeSelectorProps {
  displayType: DisplayType;
  onDisplayTypeChange: (type: DisplayType) => void;
}

export const DisplayTypeSelector: React.FC<DisplayTypeSelectorProps> = ({
  displayType,
  onDisplayTypeChange,
}) => {
  const buttonStyle = (isActive: boolean) => ({
    backgroundColor: isActive ? "white" : "rgba(255, 255, 255, 0.2)",
    color: isActive ? "#8B5CF6" : "white",
    border: "none",
    padding: "0.5rem 1rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.9rem",
  });

  return (
    <div
      style={{
        display: "flex",
        gap: "0.5rem",
        marginBottom: "1rem",
        flexWrap: "wrap",
        justifyContent: "center",
      }}
    >
      <button
        onClick={() => onDisplayTypeChange("title")}
        style={buttonStyle(displayType === "title")}
      >
        Title Only
      </button>
      <button
        onClick={() => onDisplayTypeChange("title-duration")}
        style={buttonStyle(displayType === "title-duration")}
      >
        Title + Duration
      </button>
      <button
        onClick={() => onDisplayTypeChange("title-duration-thumbnail")}
        style={buttonStyle(displayType === "title-duration-thumbnail")}
      >
        Full Details
      </button>
    </div>
  );
};
