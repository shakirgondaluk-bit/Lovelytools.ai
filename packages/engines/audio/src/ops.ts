// lovelytools.ai — Audio Engine · ffmpeg argument builders.
//
// Pure functions: argv in, argv out. Testable without loading a WASM core.
import { EngineError } from '@lovelytools/engines-core';
import {
  BITRATE,
  LOSSLESS,
  type AudioCapability,
  type AudioFormat,
  type AudioOptions,
} from './types';

export interface OpPlan {
  args: string[];
  outExt: string;
  warnings: string[];
  stage: string;
}

const OUT = 'output';

const WRITABLE: readonly AudioFormat[] = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'];

const isAudioFormat = (ext: string): ext is AudioFormat =>
  (WRITABLE as readonly string[]).includes(ext);

/**
 * Resolves the output container for the "keep the input's format" operations.
 *
 * The input extension is NOT necessarily a format we can write. Users drop .webm,
 * .mp4 and .mkv into audio tools constantly — a browser MediaRecorder produces
 * .webm by default. Naively reusing the input extension paired an MP3 stream with
 * a WebM container, which ffmpeg refuses outright: every such file failed with
 * "couldn't be decoded", blaming the user's file for our bug.
 */
function preserveFormat(inExt: string, options: AudioOptions): { format: AudioFormat; warnings: string[] } {
  if (options.format) return { format: options.format, warnings: [] };
  if (isAudioFormat(inExt)) return { format: inExt, warnings: [] };
  return {
    format: 'mp3',
    warnings: [`.${inExt} isn't an audio container we can write, so the result is an MP3.`],
  };
}

/**
 * libvorbis ABR rejects bitrates outside the window its model allows for the
 * input's channels and sample rate — `-b:a 256k` on a mono 22 kHz track is an
 * outright encoder error, not a clamp. Quality-mode VBR accepts any
 * configuration, so OGG uses it; these levels track the BITRATE tiers at
 * stereo 44.1 kHz (≈224k / ≈160k / ≈96k).
 */
const OGG_QUALITY: Record<NonNullable<AudioOptions['quality']>, string> = {
  high: '7',
  balanced: '5',
  small: '2',
};

/** Encoder flags per target container. */
const encoderFor = (format: AudioFormat, quality: AudioOptions['quality'] = 'balanced'): string[] => {
  switch (format) {
    case 'wav':
      return ['-c:a', 'pcm_s16le'];
    case 'flac':
      return ['-c:a', 'flac'];
    case 'ogg':
      return ['-c:a', 'libvorbis', '-q:a', OGG_QUALITY[quality]];
    case 'aac':
    case 'm4a':
      return ['-c:a', 'aac', '-b:a', BITRATE[quality]];
    case 'mp3':
    default:
      return ['-c:a', 'libmp3lame', '-b:a', BITRATE[quality]];
  }
};

/**
 * atempo only accepts 0.5–2.0 per instance, so rates outside that range are
 * reached by chaining filters.
 */
export function tempoChain(rate: number): string[] {
  const filters: string[] = [];
  let remaining = rate;
  while (remaining > 2) {
    filters.push('atempo=2');
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push('atempo=0.5');
    remaining *= 2;
  }
  filters.push(`atempo=${remaining.toFixed(4)}`);
  return filters;
}

export function planOp(
  capability: AudioCapability,
  options: AudioOptions,
  inExt: string,
  durationSec?: number,
): OpPlan {
  const input = `input.${inExt}`;
  const format = options.format ?? 'mp3';
  const quality = options.quality ?? 'balanced';

  switch (capability) {
    case 'audio.trim': {
      const start = options.start ?? 0;
      const end = options.end;
      if (end !== undefined && end <= start) {
        throw new EngineError('internal', 'The end point must come after the start point.');
      }
      const { format: out, warnings } = preserveFormat(inExt, options);
      const args = ['-ss', String(start)];
      if (end !== undefined) args.push('-to', String(end));
      // Re-encoding on trim keeps the cut sample-accurate. Audio is cheap to encode,
      // so unlike video there's no reason to stream-copy and land on a frame boundary.
      args.push('-i', input, '-vn', ...encoderFor(out, quality), `${OUT}.${out}`);
      return { args, outExt: out, warnings, stage: 'Trimming' };
    }

    case 'audio.convert':
      return {
        args: ['-i', input, ...encoderFor(format, quality), `${OUT}.${format}`],
        outExt: format,
        warnings: LOSSLESS.has(format)
          ? []
          : ['Converting between lossy formats loses a little quality each time — go from the original where you can.'],
        stage: 'Converting',
      };

    case 'audio.compress': {
      if (LOSSLESS.has(format)) {
        throw new EngineError('internal', `${format.toUpperCase()} is lossless — pick MP3, AAC or OGG to compress.`);
      }
      return {
        args: ['-i', input, ...encoderFor(format, quality), `${OUT}.${format}`],
        outExt: format,
        warnings: [],
        stage: 'Compressing',
      };
    }

    case 'audio.volume': {
      const gain = options.gainDb ?? 0;
      if (gain < -60 || gain > 30) {
        throw new EngineError('internal', 'Volume change has to be between −60 dB and +30 dB.');
      }
      const { format: out, warnings } = preserveFormat(inExt, options);
      if (gain > 0) warnings.push('Boosting can clip loud passages. If it distorts, try a smaller boost.');
      return {
        args: ['-i', input, '-vn', '-af', `volume=${gain}dB`, ...encoderFor(out, quality), `${OUT}.${out}`],
        outExt: out,
        warnings,
        stage: 'Adjusting volume',
      };
    }

    case 'audio.speed': {
      const speed = options.speed ?? 1;
      if (speed < 0.25 || speed > 4) {
        throw new EngineError('internal', 'Speed has to be between 0.25× and 4×.');
      }
      const { format: out, warnings } = preserveFormat(inExt, options);
      warnings.push('Pitch is preserved — voices stay natural.');
      return {
        args: ['-i', input, '-vn', '-af', tempoChain(speed).join(','), ...encoderFor(out, quality), `${OUT}.${out}`],
        outExt: out,
        warnings,
        stage: 'Changing speed',
      };
    }

    case 'audio.pitch': {
      const semitones = options.semitones ?? 0;
      if (semitones < -12 || semitones > 12) {
        throw new EngineError('internal', 'Pitch shift has to be within one octave (−12 to +12 semitones).');
      }
      // Resampling changes pitch AND tempo; atempo then undoes the tempo change,
      // leaving pitch shifted alone. This is soundtouch's approach, done in ffmpeg.
      const ratio = Math.pow(2, semitones / 12);
      const filters = [
        `asetrate=44100*${ratio.toFixed(6)}`,
        ...tempoChain(1 / ratio),
        'aresample=44100',
      ];
      const { format: out, warnings } = preserveFormat(inExt, options);
      warnings.push('Tempo is preserved — only the pitch moves.');
      return {
        args: ['-i', input, '-vn', '-af', filters.join(','), ...encoderFor(out, quality), `${OUT}.${out}`],
        outExt: out,
        warnings,
        stage: 'Shifting pitch',
      };
    }

    case 'audio.reverse': {
      const { format: out, warnings } = preserveFormat(inExt, options);
      warnings.push('Reversing buffers the whole track in memory.');
      return {
        args: ['-i', input, '-vn', '-af', 'areverse', ...encoderFor(out, quality), `${OUT}.${out}`],
        outExt: out,
        warnings,
        stage: 'Reversing',
      };
    }

    case 'audio.fade': {
      const fadeIn = options.fadeIn ?? 0;
      const fadeOut = options.fadeOut ?? 0;
      if (!fadeIn && !fadeOut) {
        throw new EngineError('internal', 'Set a fade-in, a fade-out, or both.');
      }
      const filters: string[] = [];
      if (fadeIn > 0) filters.push(`afade=t=in:st=0:d=${fadeIn}`);
      if (fadeOut > 0) {
        if (!durationSec) {
          throw new EngineError(
            'corrupt-input',
            "The track's length couldn't be read, so a fade-out can't be placed. Try a fade-in instead.",
          );
        }
        filters.push(`afade=t=out:st=${Math.max(0, durationSec - fadeOut)}:d=${fadeOut}`);
      }
      const { format: out, warnings } = preserveFormat(inExt, options);
      return {
        args: ['-i', input, '-vn', '-af', filters.join(','), ...encoderFor(out, quality), `${OUT}.${out}`],
        outExt: out,
        warnings,
        stage: 'Fading',
      };
    }

    case 'audio.extract':
      // Input here is a video container; -vn drops the picture.
      return {
        args: ['-i', input, '-vn', ...encoderFor(format, quality), `${OUT}.${format}`],
        outExt: format,
        warnings: [],
        stage: 'Extracting audio',
      };

    case 'audio.merge':
      throw new EngineError('internal', 'Merge is planned by the engine, not here.');

    default: {
      const never: never = capability;
      throw new EngineError('unsupported-route', `Unsupported operation: ${String(never)}`);
    }
  }
}
