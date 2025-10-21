export interface FileInfo {
  file: File;
  duration: number;
  thumbnail: string;
}

export type DisplayType =
  | "title"
  | "title-duration"
  | "title-duration-thumbnail";
