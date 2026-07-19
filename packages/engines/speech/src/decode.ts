// lovelytools.ai — Speech Engine · audio decode.
//
// File → mono 16 kHz Float32 PCM, which is the only input Whisper takes. The
// browser's own decoder does the work: decodeAudioData opens every format the
// <audio>/<video> element plays — MP3, WAV, AAC, OGG, and the audio track inside
// MP4/WebM/MOV containers — with no WASM core to download.
import { EngineError } from '@lovelytools/engines-core';
import { MAX_DURATION_SECONDS, WHISPER_SAMPLE_RATE } from './types';

export interface DecodedAudio {
  pcm: Float32Array;
  durationSec: number;
}

export async function decodeToWhisperPcm(file: File): Promise<DecodedAudio> {
  if (typeof AudioContext === 'undefined' && typeof OfflineAudioContext === 'undefined') {
    throw new EngineError(
      'unsupported-browser',
      "This browser can't decode audio. Chrome, Edge, Firefox and Safari 17+ all work.",
    );
  }

  const bytes = await file.arrayBuffer();

  // Decode at the file's native rate first — some browsers refuse to decode
  // directly into a context with a mismatched sample rate.
  const probe = new AudioContext();
  let decoded: AudioBuffer;
  try {
    decoded = await probe.decodeAudioData(bytes);
  } catch {
    throw new EngineError(
      'corrupt-input',
      "That file couldn't be decoded — it may be damaged, DRM-protected, or use a codec this browser doesn't ship.",
    );
  } finally {
    await probe.close().catch(() => undefined);
  }

  if (decoded.duration > MAX_DURATION_SECONDS) {
    throw new EngineError(
      'too-large',
      `That's ${Math.round(decoded.duration / 60)} minutes of audio — the limit is ${MAX_DURATION_SECONDS / 60}. Trim it first, then transcribe the parts.`,
    );
  }
  if (decoded.duration < 0.5) {
    throw new EngineError('corrupt-input', 'That file has no audible audio track to transcribe.');
  }

  // Resample + downmix in one pass: an OfflineAudioContext renders the decoded
  // buffer into a single 16 kHz channel, which is exactly Whisper's input.
  const frames = Math.ceil(decoded.duration * WHISPER_SAMPLE_RATE);
  const offline = new OfflineAudioContext(1, frames, WHISPER_SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  return { pcm: rendered.getChannelData(0), durationSec: decoded.duration };
}
