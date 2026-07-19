'use client';

import type { ToolDefinition } from '@lovelytools/registry';
import { AUDIO_ACCEPT, useAudioTool } from '@lovelytools/engine-audio';
import { useVideoTool, VIDEO_ACCEPT } from '@lovelytools/engine-video';
import type { Progress } from '@lovelytools/engines-core';

/**
 * Picks the engine hook for a tool and gives ToolRunner one shape to render.
 *
 * Both hooks are called unconditionally — hooks cannot be called behind a branch —
 * but neither constructs an engine or fetches a WASM core until its `run` is
 * invoked. An idle hook costs a few bytes of state and nothing else.
 */
export interface MediaTool {
  supported: boolean;
  accept: string;
  state: 'idle' | 'loading-engine' | 'running' | 'done' | 'error';
  progress: Progress | null;
  error: string | null;
  result: {
    blob: Blob;
    filename: string;
    inputBytes: number;
    outputBytes: number;
    warnings: string[];
    elapsedMs: number;
  } | null;
  run: (file: File) => Promise<void>;
  cancel: () => void;
  reset: () => void;
}

export function useMediaTool(tool: ToolDefinition): MediaTool {
  const video = useVideoTool(tool.slug);
  const audio = useAudioTool(tool.slug);

  if (tool.engine === 'video') {
    return {
      supported: true,
      accept: VIDEO_ACCEPT,
      state: video.state,
      progress: video.progress,
      error: video.error,
      result: video.result,
      run: (file) => video.run(file),
      cancel: video.cancel,
      reset: video.reset,
    };
  }

  if (tool.engine === 'audio') {
    return {
      supported: true,
      accept: AUDIO_ACCEPT,
      state: audio.state,
      progress: audio.progress,
      error: audio.error,
      result: audio.result,
      run: (file) => audio.run(file),
      cancel: audio.cancel,
      reset: audio.reset,
    };
  }

  // pdf, image, text, calculator, developer and conversion all have working engines
  // in packages/engines — they just don't have a UI in this pass.
  return {
    supported: false,
    accept: '',
    state: 'idle',
    progress: null,
    error: null,
    result: null,
    run: async () => {},
    cancel: () => {},
    reset: () => {},
  };
}
