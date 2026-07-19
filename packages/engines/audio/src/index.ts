// @lovelytools/engine-audio — ffmpeg audio profile (~6 MB core), RFC-001 §3.
// Covers all 20 tools in the audio category.
//
// This engine did not exist before: RFC-001 specified it, but nothing implemented
// it, and half its tools pointed at the document-only conversion engine.
export * from './types';
export * from './registry';
export * from './audio-engine';
export { useAudioTool, type UseAudioTool, type AudioToolState } from './use-audio-tool';
