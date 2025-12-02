export interface FileInfo {
  file: File;
  duration: number;
  thumbnail: string;
}

export type DisplayType =
  | "title"
  | "title-duration"
  | "title-duration-thumbnail";

export interface TranscriptionSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
  tokens?: number[];
  temperature?: number;
  avg_logprob?: number;
  compression_ratio?: number;
  no_speech_prob?: number;
}

export interface SilenceSegment {
  start: number;
  end: number;
  duration: number;
  confidence: number;
}

export interface TranscriptionResult {
  text: string;
  segments: TranscriptionSegment[];
  language: string;
  debug_info?: {
    raw_transcript: string;
    transcript_text: string;
    transcript_language: string;
    transcript_duration: string;
    transcript_words: string;
    transcript_segments: string;
    processed_segments_count: number;
    segments_structure: string[];
  };
}

export interface Session {
  id: string;
  name: string;
  date: string; // Display friendly date or ISO
  duration?: string;
  status: "Draft" | "Processed" | "Completed";
  downloadUrl?: string;
}
