import React from "react";
import type { FileInfo, DisplayType } from "../types";
import { FileItem } from "./FileItem";

interface FileListProps {
  files: FileInfo[];
  displayType: DisplayType;
  onRemoveFile: (index: number) => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  displayType,
  onRemoveFile,
}) => {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
        width: "100%",
        maxHeight: "400px",
        overflowY: "auto",
        paddingRight: "0.5rem",
      }}
    >
      {files.map((fileInfo, index) => (
        <FileItem
          key={index}
          fileInfo={fileInfo}
          index={index}
          displayType={displayType}
          onRemove={onRemoveFile}
        />
      ))}
    </div>
  );
};
