// lovelytools.ai — Speech Engine · slug → capability map.
//
// Every registry tool with engine === 'speech' appears here, and nothing else
// does. coverage.test.ts asserts both directions — same contract as every engine.
import type { SpeechCapability, SpeechOptions } from './types';

export interface SpeechToolBinding {
  capability: SpeechCapability;
  defaults?: SpeechOptions;
}

export const SPEECH_TOOLS: Record<string, SpeechToolBinding> = {
  // Both tools are the same capability with different page framing: one leads
  // with a URL, the other with a file. The URL fetch is app-layer work — by the
  // time the engine runs, both hold a File.
  'video-url-caption-generator': { capability: 'speech.transcribe', defaults: { language: 'auto' } },
  'video-subtitle-generator': { capability: 'speech.transcribe', defaults: { language: 'auto' } },
  // The flagship: auto language detection, inline transcript, document exports.
  transcribe: { capability: 'speech.transcribe', defaults: { language: 'auto' } },
};

export const speechToolSlugs = (): string[] => Object.keys(SPEECH_TOOLS);

export const bindingFor = (slug: string): SpeechToolBinding | undefined => SPEECH_TOOLS[slug];
