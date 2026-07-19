// lovelytools.ai — Video Engine · shared types

export type VideoFormat = 'mp4' | 'webm' | 'mov' | 'mkv' | 'avi' | 'gif';

export type VideoCapability =
  | 'video.trim'
  | 'video.compress'
  | 'video.convert'
  | 'video.resize'
  | 'video.crop'
  | 'video.rotate'
  | 'video.speed'
  | 'video.mute'
  | 'video.merge'
  | 'video.loop'
  | 'video.thumbnail'
  | 'video.to-gif'
  | 'video.extract-audio'
  | 'video.reverse'
  | 'video.subtitles';

/** Quality target for compression. Maps to a CRF (constant rate factor). */
export type QualityPreset = 'high' | 'balanced' | 'small';

/** CRF: lower is better quality. 23 is x264's default; 28 is visibly lossy. */
export const CRF: Record<QualityPreset, number> = { high: 20, balanced: 26, small: 32 };

export interface VideoInput {
  file: File;
  capability: VideoCapability;
  options?: VideoOptions;
  /** Extra inputs for merge. */
  extraFiles?: File[];
}

export interface VideoOptions {
  /** trim — seconds */
  start?: number;
  end?: number;
  /** compress / convert */
  quality?: QualityPreset;
  format?: VideoFormat;
  /** resize — omit one side to preserve aspect */
  width?: number;
  height?: number;
  /** crop */
  cropX?: number;
  cropY?: number;
  cropWidth?: number;
  cropHeight?: number;
  /** rotate — degrees, multiples of 90 */
  rotate?: 90 | 180 | 270;
  /** speed — 0.25–4; audio is pitch-corrected via atempo */
  speed?: number;
  /** to-gif */
  fps?: number;
  /** thumbnail — seconds into the video */
  at?: number;
  /** subtitles — SRT text, burned in */
  subtitles?: string;
  /** loop — how many extra times to repeat the clip */
  loops?: number;
}

export interface VideoResult {
  blob: Blob;
  filename: string;
  /** Bytes in / bytes out — the compression tools report this honestly. */
  inputBytes: number;
  outputBytes: number;
  warnings: string[];
  elapsedMs: number;
}

export const MIME: Record<VideoFormat, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  mov: 'video/quicktime',
  mkv: 'video/x-matroska',
  avi: 'video/x-msvideo',
  gif: 'image/gif',
};

export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime,video/x-matroska,video/x-msvideo,.mp4,.webm,.mov,.mkv,.avi';

/** Every capability this engine implements — cross-checked against the registry. */
export const VIDEO_CAPABILITIES: VideoCapability[] = [
  'video.trim',
  'video.compress',
  'video.convert',
  'video.resize',
  'video.crop',
  'video.rotate',
  'video.speed',
  'video.mute',
  'video.merge',
  'video.loop',
  'video.thumbnail',
  'video.to-gif',
  'video.extract-audio',
  'video.reverse',
  'video.subtitles',
];
