// lovelytools.ai — background removal via U²-Net (small), onnxruntime-web.
//
// Everything is self-hosted: the model (u2netp, Apache-2.0, staged by
// tooling/wasm-build as `u2net` in the manifest) and ORT's WASM/WebGPU backends
// (staged as `ort`). ORT's default is to pull its .wasm from jsdelivr — for a
// product whose promise is "nothing about your file leaves the device", a CDN
// learning that a visitor opened the background-removal tool is the leak the
// architecture exists to prevent. WebGPU when available, WASM otherwise.
//
// Model contract (u2netp): 320×320 RGB input, ImageNet mean/std normalization,
// first output is the fused d0 saliency map, min-max normalized here because
// its raw range is not [0,1].
import { encode, makeCanvas } from '../raster';
import {
  checkCancelled,
  ImageError,
  outName,
  type BackgroundRemoveOptions,
  type DecodedImage,
  type ImageOpResult,
  type OpContext,
} from '../types';

const MODEL_SIZE = 320; // u2netp input edge

const WASM_BASE =
  (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_WASM_BASE) || '/wasm';

const MANIFEST: Record<string, string> = (() => {
  try {
    return JSON.parse(process.env.NEXT_PUBLIC_WASM_MANIFEST || '{}');
  } catch {
    return {};
  }
})();

function assetUrl(key: 'ort' | 'u2net', file: string): string {
  const dir = MANIFEST[key];
  if (!dir) {
    throw new ImageError(
      'model-load-failed',
      'The background-removal model is missing from this build. Run `pnpm install` to stage it.',
    );
  }
  const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
  return new URL(`${WASM_BASE}/${dir}/${file}`, base).href;
}

interface Session {
  inputNames: readonly string[];
  outputNames: readonly string[];
  run(feeds: Record<string, unknown>): Promise<Record<string, { data: Float32Array }>>;
}

let sessionPromise: Promise<{ session: Session; backend: 'webgpu' | 'wasm' }> | null = null;

async function loadModel(onDownload: (pct: number) => void) {
  return (sessionPromise ??= (async () => {
    const ort = await import('onnxruntime-web');
    // Point ORT at our own staged backends; the trailing slash matters — ORT
    // concatenates the runtime filename onto it.
    ort.env.wasm.wasmPaths = assetUrl('ort', '');

    // Fetch with real download progress (model is ~4.5 MB — worth a progress bar).
    const res = await fetch(assetUrl('u2net', 'u2netp.onnx'));
    if (!res.ok || !res.body) throw new ImageError('model-load-failed', 'Couldn’t load the background-removal model. Check your connection and retry.');
    const total = Number(res.headers.get('content-length')) || 4_600_000;
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let got = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      got += value.byteLength;
      onDownload(Math.min(99, Math.round((got / total) * 100)));
    }
    const buf = await new Blob(chunks as BlobPart[]).arrayBuffer();

    // WASM EP only, deliberately. u2netp uses ceil_mode MaxPool, which ORT's
    // WebGPU EP rejects — and it rejects at run() time, after create() with a
    // ['webgpu','wasm'] fallback list happily succeeded, so the failure only
    // surfaced on the first real image ("using ceil() in shape computation is
    // not yet supported for MaxPool"). At 320×320 the WASM EP runs this model
    // in a couple of seconds; revisit if the model or the EP changes.
    const backend = 'wasm' as const;
    const session = (await ort.InferenceSession.create(buf, {
      executionProviders: ['wasm'],
    })) as unknown as Session;
    return { session, backend };
  })().catch((cause) => {
    // A failed load must not poison every later attempt — reset the memo.
    sessionPromise = null;
    throw cause;
  }));
}

export async function removeBackground(
  input: DecodedImage,
  opts: BackgroundRemoveOptions,
  ctx: OpContext,
): Promise<ImageOpResult> {
  ctx.progress(2, 'Loading model (first run only)');
  const { session, backend } = await loadModel((pct) =>
    ctx.progress(Math.round(pct * 0.3), `Downloading model ${pct}%`),
  );
  checkCancelled(ctx);

  // 1. Letterbox into the model's square input.
  ctx.progress(35, 'Preparing image');
  const scale = MODEL_SIZE / Math.max(input.width, input.height);
  const mw = Math.round(input.width * scale);
  const mh = Math.round(input.height * scale);
  const { g: inG } = makeCanvas(MODEL_SIZE, MODEL_SIZE);
  inG.fillStyle = '#000';
  inG.fillRect(0, 0, MODEL_SIZE, MODEL_SIZE);
  inG.drawImage(input.bitmap, 0, 0, mw, mh);
  const pixels = inG.getImageData(0, 0, MODEL_SIZE, MODEL_SIZE).data;

  // 2. NCHW float tensor, ImageNet-normalized (what u2netp was trained on).
  const MEAN = [0.485, 0.456, 0.406] as const;
  const STD = [0.229, 0.224, 0.225] as const;
  const plane = MODEL_SIZE * MODEL_SIZE;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    tensor[i] = ((pixels[i * 4] ?? 0) / 255 - MEAN[0]) / STD[0];
    tensor[plane + i] = ((pixels[i * 4 + 1] ?? 0) / 255 - MEAN[1]) / STD[1];
    tensor[2 * plane + i] = ((pixels[i * 4 + 2] ?? 0) / 255 - MEAN[2]) / STD[2];
  }

  ctx.progress(45, backend === 'webgpu' ? 'Matting (WebGPU)' : 'Matting (CPU — a few seconds)');
  const ort = await import('onnxruntime-web');
  const inputName = session.inputNames[0] ?? 'input.1';
  const outputs = await session.run({
    [inputName]: new ort.Tensor('float32', tensor, [1, 3, MODEL_SIZE, MODEL_SIZE]),
  });
  checkCancelled(ctx);
  // First declared output is the fused d0 map — the other six are side outputs.
  const outputName = session.outputNames[0];
  const firstOutput = (outputName && outputs[outputName]) || Object.values(outputs)[0];
  if (!firstOutput) throw new ImageError('internal', 'The model produced no output.');
  const mask = firstOutput.data; // [1,1,S,S] saliency

  // 3. Min-max normalize (u2netp's raw output range isn't [0,1]), upscale the
  //    matte to source size, apply as alpha (+ optional feather/fill).
  ctx.progress(75, 'Applying matte');
  let lo = Infinity;
  let hi = -Infinity;
  for (let i = 0; i < plane; i++) {
    const v = mask[i] ?? 0;
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  const range = hi - lo || 1;

  const { canvas: maskCanvas, g: maskG } = makeCanvas(MODEL_SIZE, MODEL_SIZE);
  const maskData = maskG.createImageData(MODEL_SIZE, MODEL_SIZE);
  for (let i = 0; i < plane; i++) {
    const a = Math.max(0, Math.min(255, Math.round((((mask[i] ?? 0) - lo) / range) * 255)));
    maskData.data[i * 4] = maskData.data[i * 4 + 1] = maskData.data[i * 4 + 2] = 255;
    maskData.data[i * 4 + 3] = a;
  }
  maskG.putImageData(maskData, 0, 0);

  const { canvas: out, g } = makeCanvas(input.width, input.height);
  if (opts.background) {
    g.fillStyle = opts.background;
    g.fillRect(0, 0, input.width, input.height);
  }
  g.drawImage(input.bitmap, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  if (opts.feather ?? 1) g.filter = `blur(${opts.feather ?? 1}px)`;
  // Only the letterboxed region of the matte corresponds to the image.
  g.drawImage(maskCanvas, 0, 0, mw, mh, 0, 0, input.width, input.height);
  g.globalCompositeOperation = 'source-over';
  g.filter = 'none';

  ctx.progress(90, 'Encoding PNG');
  const blob = await encode(out, { format: 'png' });
  return {
    files: [{ blob, name: outName(input.name, '-nobg', 'png'), width: input.width, height: input.height }],
    fidelity: 'good',
    warnings: ['Edges around hair and fur may need a touch-up — matting isn’t pixel-perfect.'],
    stats: {
      widthIn: input.width,
      heightIn: input.height,
      widthOut: input.width,
      heightOut: input.height,
      bytesIn: input.sourceBytes,
      bytesOut: blob.size,
    },
  };
}
