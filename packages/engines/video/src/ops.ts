// lovelytools.ai — Video Engine · ffmpeg argument builders.
//
// One builder per capability. Each returns the argv for a single ffmpeg run plus
// the output extension. Keeping these pure makes them unit-testable without
// loading a 31 MB WASM core.
import { EngineError } from '@lovelytools/engines-core';
import { CRF, type VideoFormat, type VideoOptions, type VideoCapability } from './types';

export interface OpPlan {
  args: string[];
  outExt: string;
  warnings: string[];
  /** Label shown while this runs. */
  stage: string;
}

const IN = 'input';
const OUT = 'output';

/** x264 in ffmpeg.wasm is much faster with a fast preset; quality is set by CRF. */
const X264 = ['-c:v', 'libx264', '-preset', 'veryfast', '-pix_fmt', 'yuv420p'];

const codecFor = (format: VideoFormat): string[] => {
  switch (format) {
    case 'webm':
      return ['-c:v', 'libvpx-vp9', '-b:v', '0', '-c:a', 'libopus'];
    case 'gif':
      return [];
    default:
      // mp4/mov/mkv/avi all take H.264 + AAC.
      return [...X264, '-c:a', 'aac'];
  }
};

export function planOp(
  capability: VideoCapability,
  options: VideoOptions,
  inExt: string,
  duration?: number,
): OpPlan {
  const warnings: string[] = [];
  const input = `${IN}.${inExt}`;

  switch (capability) {
    case 'video.trim': {
      const start = options.start ?? 0;
      const end = options.end;
      if (end !== undefined && end <= start) {
        throw new EngineError('internal', 'The end point must come after the start point.');
      }
      // -ss before -i seeks on the input (fast, keyframe-accurate); stream-copy
      // avoids re-encoding entirely, so a trim is near-instant.
      const args = ['-ss', String(start)];
      if (end !== undefined) args.push('-to', String(end));
      args.push('-i', input, '-c', 'copy', '-avoid_negative_ts', 'make_zero', `${OUT}.${inExt}`);
      warnings.push('Trimmed on the nearest keyframe, so the cut can be off by a fraction of a second.');
      return { args, outExt: inExt, warnings, stage: 'Trimming' };
    }

    case 'video.compress': {
      const quality = options.quality ?? 'balanced';
      return {
        args: ['-i', input, ...X264, '-crf', String(CRF[quality]), '-c:a', 'aac', '-b:a', '128k', `${OUT}.mp4`],
        outExt: 'mp4',
        warnings: [],
        stage: 'Compressing',
      };
    }

    case 'video.convert': {
      const format = options.format ?? 'mp4';
      if (format === 'gif') return planOp('video.to-gif', options, inExt, duration);

      const args = ['-i', input, ...codecFor(format)];
      const warnings: string[] = [];

      // A GIF has no audio track and an odd pixel count is common; -vf pads to even
      // dimensions because H.264 requires them, and -an avoids an empty audio stream.
      if (inExt === 'gif') {
        args.push('-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-an', '-movflags', '+faststart');
        warnings.push('GIFs have no sound, so the result is silent.');
      }
      if (format === 'webm') {
        warnings.push('VP9 encoding is slower than H.264 — expect a longer wait.');
      }

      args.push(`${OUT}.${format}`);
      return { args, outExt: format, warnings, stage: 'Converting' };
    }

    case 'video.resize': {
      const { width, height } = options;
      if (!width && !height) throw new EngineError('internal', 'Give a width, a height, or both.');
      // -2 keeps the aspect ratio and rounds to an even number, which H.264 requires.
      const scale = `scale=${width ?? -2}:${height ?? -2}`;
      return {
        args: ['-i', input, '-vf', scale, ...X264, '-crf', '23', '-c:a', 'copy', `${OUT}.mp4`],
        outExt: 'mp4',
        warnings: [],
        stage: 'Resizing',
      };
    }

    case 'video.crop': {
      const { cropWidth: w, cropHeight: h, cropX = 0, cropY = 0 } = options;
      if (!w || !h) throw new EngineError('internal', 'Give the crop width and height.');
      return {
        args: ['-i', input, '-vf', `crop=${w}:${h}:${cropX}:${cropY}`, ...X264, '-crf', '23', '-c:a', 'copy', `${OUT}.mp4`],
        outExt: 'mp4',
        warnings: [],
        stage: 'Cropping',
      };
    }

    case 'video.rotate': {
      const degrees = options.rotate ?? 90;
      // transpose=1 is 90° clockwise; 2 is counter-clockwise.
      const filter =
        degrees === 180 ? 'transpose=1,transpose=1' : degrees === 270 ? 'transpose=2' : 'transpose=1';
      return {
        args: ['-i', input, '-vf', filter, ...X264, '-crf', '23', '-c:a', 'copy', `${OUT}.mp4`],
        outExt: 'mp4',
        warnings: [],
        stage: 'Rotating',
      };
    }

    case 'video.speed': {
      const speed = options.speed ?? 1;
      if (speed < 0.25 || speed > 4) {
        throw new EngineError('internal', 'Speed has to be between 0.25× and 4×.');
      }
      // atempo only accepts 0.5–2.0, so chain it for anything outside that range.
      const tempo: string[] = [];
      let remaining = speed;
      while (remaining > 2) {
        tempo.push('atempo=2');
        remaining /= 2;
      }
      while (remaining < 0.5) {
        tempo.push('atempo=0.5');
        remaining *= 2;
      }
      tempo.push(`atempo=${remaining.toFixed(4)}`);
      return {
        args: [
          '-i', input,
          '-filter_complex', `[0:v]setpts=${(1 / speed).toFixed(4)}*PTS[v];[0:a]${tempo.join(',')}[a]`,
          '-map', '[v]', '-map', '[a]',
          ...X264, '-crf', '23', '-c:a', 'aac',
          `${OUT}.mp4`,
        ],
        outExt: 'mp4',
        warnings: ['Audio pitch is preserved.'],
        stage: 'Changing speed',
      };
    }

    case 'video.mute':
      return {
        args: ['-i', input, '-c:v', 'copy', '-an', `${OUT}.${inExt}`],
        outExt: inExt,
        warnings: [],
        stage: 'Removing audio',
      };

    case 'video.extract-audio':
      return {
        args: ['-i', input, '-vn', '-c:a', 'libmp3lame', '-q:a', '2', `${OUT}.mp3`],
        outExt: 'mp3',
        warnings: [],
        stage: 'Extracting audio',
      };

    case 'video.thumbnail': {
      const at = options.at ?? 1;
      return {
        args: ['-ss', String(at), '-i', input, '-frames:v', '1', '-q:v', '2', `${OUT}.jpg`],
        outExt: 'jpg',
        warnings: [],
        stage: 'Grabbing frame',
      };
    }

    case 'video.to-gif': {
      const fps = options.fps ?? 12;
      const width = options.width ?? 480;
      // Two-pass palette generation in one graph — without it, GIFs dither badly.
      const filter = `fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=256[p];[s1][p]paletteuse=dither=bayer`;
      return {
        args: ['-i', input, '-filter_complex', filter, '-loop', '0', `${OUT}.gif`],
        outExt: 'gif',
        warnings: ['GIF has no audio, and 256 colours — expect a big file for long clips.'],
        stage: 'Building GIF',
      };
    }

    case 'video.reverse':
      return {
        args: ['-i', input, '-vf', 'reverse', '-af', 'areverse', ...X264, '-crf', '23', `${OUT}.mp4`],
        outExt: 'mp4',
        warnings: ['Reversing buffers the whole clip in memory — keep it under a minute or so.'],
        stage: 'Reversing',
      };

    case 'video.loop': {
      const loops = options.loops ?? 3;
      if (loops < 1 || loops > 20) {
        throw new EngineError('internal', 'Loop count has to be between 1 and 20.');
      }
      // -stream_loop repeats the input N extra times; stream-copy keeps it instant.
      return {
        args: ['-stream_loop', String(loops), '-i', input, '-c', 'copy', `${OUT}.${inExt}`],
        outExt: inExt,
        warnings: [`The clip plays ${loops + 1} times end to end.`],
        stage: 'Looping',
      };
    }

    case 'video.subtitles': {
      if (!options.subtitles) throw new EngineError('internal', 'No subtitle text was given.');
      return {
        args: ['-i', input, '-vf', "subtitles=subs.srt:force_style='FontSize=18'", ...X264, '-crf', '23', '-c:a', 'copy', `${OUT}.mp4`],
        outExt: 'mp4',
        warnings: ['Subtitles are burned into the picture and cannot be turned off later.'],
        stage: 'Burning subtitles',
      };
    }

    case 'video.merge':
      // Handled by the engine, which writes a concat list across several inputs.
      throw new EngineError('internal', 'Merge is planned by the engine, not here.');

    default: {
      const never: never = capability;
      throw new EngineError('unsupported-route', `Unsupported operation: ${String(never)}`);
    }
  }
}
