// lovelytools.ai — Audio Engine · slug → capability map.
//
// Every registry tool with engine === 'audio' appears here, and nothing else does.
// coverage.test.ts asserts both directions.
import type { AudioCapability, AudioOptions } from './types';

export interface AudioToolBinding {
  capability: AudioCapability;
  defaults?: AudioOptions;
}

export const AUDIO_TOOLS: Record<string, AudioToolBinding> = {
  // ── Editing ────────────────────────────────────────────────────────────────
  'trim-audio': { capability: 'audio.trim', defaults: { start: 0 } },
  'mp3-cutter': { capability: 'audio.trim', defaults: { start: 0 } },
  'merge-audio': { capability: 'audio.merge' },
  'change-volume': { capability: 'audio.volume', defaults: { gainDb: 6 } },
  'audio-speed': { capability: 'audio.speed', defaults: { speed: 1.5 } },
  'audio-pitch': { capability: 'audio.pitch', defaults: { semitones: 2 } },
  'audio-reverse': { capability: 'audio.reverse' },
  'fade-audio': { capability: 'audio.fade', defaults: { fadeIn: 2, fadeOut: 2 } },
  'compress-audio': { capability: 'audio.compress', defaults: { format: 'mp3', quality: 'balanced' } },

  // The browser captures with MediaRecorder; the engine only encodes the result to
  // something portable. Recording is not an ffmpeg capability, so it isn't one here.
  'voice-recorder': { capability: 'audio.convert', defaults: { format: 'mp3', quality: 'balanced' } },

  // ── Format conversion ──────────────────────────────────────────────────────
  // These claimed the conversion engine, which handles documents only.
  'convert-audio': { capability: 'audio.convert', defaults: { format: 'mp3' } },
  'mp3-converter': { capability: 'audio.convert', defaults: { format: 'mp3' } },
  'wav-converter': { capability: 'audio.convert', defaults: { format: 'wav' } },
  'wav-to-mp3': { capability: 'audio.convert', defaults: { format: 'mp3' } },
  'mp3-to-wav': { capability: 'audio.convert', defaults: { format: 'wav' } },
  'flac-to-mp3': { capability: 'audio.convert', defaults: { format: 'mp3' } },
  'm4a-to-mp3': { capability: 'audio.convert', defaults: { format: 'mp3' } },
  'aac-to-mp3': { capability: 'audio.convert', defaults: { format: 'mp3' } },
  'ogg-to-mp3': { capability: 'audio.convert', defaults: { format: 'mp3' } },

  // ── From video ─────────────────────────────────────────────────────────────
  'extract-audio-from-video': { capability: 'audio.extract', defaults: { format: 'mp3' } },

  // ── Social media (URL-ingest tools) ────────────────────────────────────────
  // The URL fetch happens in the app layer — the user's browser downloads a
  // direct media link and hands the engine a File, exactly as if it were dropped.
  // The engine itself never touches the network (engines-core invariant).
  'video-url-to-audio': { capability: 'audio.extract', defaults: { format: 'mp3' } },
  'video-audio-downloader': { capability: 'audio.extract', defaults: { format: 'mp3', quality: 'high' } },
};

export const audioToolSlugs = (): string[] => Object.keys(AUDIO_TOOLS);

export const bindingFor = (slug: string): AudioToolBinding | undefined => AUDIO_TOOLS[slug];
