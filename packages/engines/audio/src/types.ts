// lovelytools.ai — Audio Engine · shared types

export type AudioFormat = 'mp3' | 'wav' | 'flac' | 'aac' | 'ogg' | 'm4a';

export type AudioCapability =
  | 'audio.trim'
  | 'audio.convert'
  | 'audio.compress'
  | 'audio.volume'
  | 'audio.speed'
  | 'audio.pitch'
  | 'audio.merge'
  | 'audio.reverse'
  | 'audio.fade'
  | 'audio.extract';

/** Target bitrate for lossy compression. */
export type AudioQuality = 'high' | 'balanced' | 'small';

/** kbps for lossy encoders. 192 is transparent for most listeners; 96 is thin. */
export const BITRATE: Record<AudioQuality, string> = {
  high: '256k',
  balanced: '192k',
  small: '96k',
};

export interface AudioInput {
  file: File;
  capability: AudioCapability;
  options?: AudioOptions;
  /** Extra inputs for merge. */
  extraFiles?: File[];
}

export interface AudioOptions {
  /** trim — seconds */
  start?: number;
  end?: number;
  /** convert / compress */
  format?: AudioFormat;
  quality?: AudioQuality;
  /** volume — dB adjustment; negative is quieter */
  gainDb?: number;
  /** speed — 0.5–2; pitch is preserved */
  speed?: number;
  /** pitch — semitones, −12 to +12; tempo is preserved */
  semitones?: number;
  /** fade — seconds */
  fadeIn?: number;
  fadeOut?: number;
}

export interface AudioResult {
  blob: Blob;
  filename: string;
  inputBytes: number;
  outputBytes: number;
  /** Seconds, when ffmpeg could report it. */
  durationSec?: number;
  warnings: string[];
  elapsedMs: number;
}

export const MIME: Record<AudioFormat, string> = {
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  flac: 'audio/flac',
  aac: 'audio/aac',
  ogg: 'audio/ogg',
  m4a: 'audio/mp4',
};

export const AUDIO_ACCEPT =
  'audio/mpeg,audio/wav,audio/flac,audio/aac,audio/ogg,audio/mp4,video/mp4,.mp3,.wav,.flac,.aac,.ogg,.m4a,.mp4';

/** Lossless targets — bitrate flags are meaningless here. */
export const LOSSLESS: ReadonlySet<AudioFormat> = new Set<AudioFormat>(['wav', 'flac']);

export const AUDIO_CAPABILITIES: AudioCapability[] = [
  'audio.trim',
  'audio.convert',
  'audio.compress',
  'audio.volume',
  'audio.speed',
  'audio.pitch',
  'audio.merge',
  'audio.reverse',
  'audio.fade',
  'audio.extract',
];
