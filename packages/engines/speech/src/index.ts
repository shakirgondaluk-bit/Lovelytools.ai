// @lovelytools/engine-speech — on-device speech recognition (Whisper).
//
// Added with the social-media-tools category. Model tiers run from whisper-tiny
// to whisper-large-v3-turbo, on WebGPU when the device has it and WASM when it
// doesn't. Models download once from the Hugging Face CDN and cache; the audio
// being transcribed never leaves the device. Same ToolEngine contract as every
// other engine.
export * from './types';
export * from './registry';
export * from './format';
export { SpeechEngine } from './speech-engine';
export { webgpuAvailable } from './transcribe';
export { useSpeechTool, type UseSpeechTool, type SpeechToolState } from './use-speech-tool';
