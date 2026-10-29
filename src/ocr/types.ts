import type { OcrBox } from '../receipt/parseReceipt';

export type OcrRead = {
  detections: readonly OcrBox[];
  /** The resized photo the text was read from, for showing it frozen with the total highlighted. */
  uri: string;
  width: number;
  height: number;
};

export type OcrEngine = {
  ready: boolean;
  /** Model download progress, 0–100. */
  progress: number;
  error: string | null;
  read: (photoUri: string) => Promise<OcrRead>;
};
