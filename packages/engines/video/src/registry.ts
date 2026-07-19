// lovelytools.ai — Video Engine · slug → capability map.
//
// The registry says a tool runs on the `video` engine; this says which capability
// and with what defaults. Every tool in the registry with engine === 'video' must
// appear here — coverage.test.ts asserts it both ways, so a tool can never ship
// pointing at a capability that doesn't exist, and a capability can never rot
// unused.
import type { VideoCapability, VideoOptions } from './types';

export interface VideoToolBinding {
  capability: VideoCapability;
  /** Options the tool page starts with; the UI can override any of them. */
  defaults?: VideoOptions;
}

export const VIDEO_TOOLS: Record<string, VideoToolBinding> = {
  // ── Editing ────────────────────────────────────────────────────────────────
  'trim-video': { capability: 'video.trim', defaults: { start: 0 } },
  'crop-video': { capability: 'video.crop' },
  'resize-video': { capability: 'video.resize', defaults: { width: 1280 } },
  'rotate-video': { capability: 'video.rotate', defaults: { rotate: 90 } },
  'merge-video': { capability: 'video.merge' },
  'mute-video': { capability: 'video.mute' },
  'video-speed': { capability: 'video.speed', defaults: { speed: 2 } },
  'reverse-video': { capability: 'video.reverse' },
  'loop-video': { capability: 'video.loop', defaults: { loops: 3 } },
  'add-subtitles': { capability: 'video.subtitles' },
  'video-thumbnail': { capability: 'video.thumbnail', defaults: { at: 1 } },
  'compress-video': { capability: 'video.compress', defaults: { quality: 'balanced' } },

  // ── Format conversion ──────────────────────────────────────────────────────
  // These claimed the conversion engine, which is document-only and could never
  // have decoded them. ffmpeg does the work; the target format is the difference.
  'convert-video': { capability: 'video.convert', defaults: { format: 'mp4' } },
  'mov-to-mp4': { capability: 'video.convert', defaults: { format: 'mp4' } },
  'mkv-to-mp4': { capability: 'video.convert', defaults: { format: 'mp4' } },
  'avi-to-mp4': { capability: 'video.convert', defaults: { format: 'mp4' } },
  'webm-to-mp4': { capability: 'video.convert', defaults: { format: 'mp4' } },
  'mp4-to-webm': { capability: 'video.convert', defaults: { format: 'webm' } },
  'gif-to-mp4': { capability: 'video.convert', defaults: { format: 'mp4' } },

  // ── To/from other media ────────────────────────────────────────────────────
  'mp4-to-gif': { capability: 'video.to-gif', defaults: { fps: 12, width: 480 } },
  'video-to-gif': { capability: 'video.to-gif', defaults: { fps: 12, width: 480 } },
  'extract-audio': { capability: 'video.extract-audio' },
  'video-to-mp3': { capability: 'video.extract-audio' },
};

export const videoToolSlugs = (): string[] => Object.keys(VIDEO_TOOLS);

export const bindingFor = (slug: string): VideoToolBinding | undefined => VIDEO_TOOLS[slug];
