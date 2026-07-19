'use client';

import type { ImageControl } from '@lovelytools/engine-image';
import { SegmentedToggle } from '@lovelytools/ui';

/** Everything an image op collects before it can run. Bigger than PDF's
 *  ControlState because the image tools are more varied — one flat bag is
 *  still simpler than a dozen tiny per-kind state shapes threaded through. */
export interface ImageControlState {
  format: 'jpeg' | 'png' | 'webp' | 'avif';
  quality: string;
  background: string;

  resizeMode: 'fit' | 'fill' | 'exact' | 'long-edge' | 'scale';
  width: string;
  height: string;
  longEdge: string;
  scaleFactor: string;
  upscale: boolean;

  cropX: string;
  cropY: string;
  cropW: string;
  cropH: string;

  rotateBy: '90' | '180' | '270';
  flipAxis: 'horizontal' | 'vertical';

  brightness: string;
  contrast: string;
  saturation: string;
  hueRotate: string;
  grayscale: string;
  blurRadius: string;
  blockSize: string;

  text: string;
  color: string;
  anchor: 'center' | 'tile' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  opacity: string;
  fontScale: string;

  topText: string;
  bottomText: string;

  targetKB: string;

  icoSizes: number[];

  pasteText: string;
}

export const emptyControlState = (): ImageControlState => ({
  format: 'jpeg',
  quality: '0.85',
  background: '#ffffff',

  resizeMode: 'fit',
  width: '',
  height: '',
  longEdge: '1920',
  scaleFactor: '2',
  upscale: false,

  cropX: '10',
  cropY: '10',
  cropW: '80',
  cropH: '80',

  rotateBy: '90',
  flipAxis: 'horizontal',

  brightness: '1',
  contrast: '1',
  saturation: '1',
  hueRotate: '0',
  grayscale: '0',
  blurRadius: '4',
  blockSize: '12',

  text: '',
  color: '#ffffff',
  anchor: 'bottom-right',
  opacity: '0.5',
  fontScale: '0.04',

  topText: '',
  bottomText: '',

  targetKB: '500',

  icoSizes: [16, 32, 48],

  pasteText: '',
});

const ICO_SIZE_CHOICES = [16, 24, 32, 48, 64, 128, 256];

const inputClass =
  'rounded-lg border border-line bg-bg2 px-3.5 py-2.5 font-sans text-[14px] text-fg placeholder:text-fg3 focus:border-accent focus:outline-none disabled:opacity-40';
const labelClass = 'text-[13.5px] font-medium text-fg';
const hintClass = 'text-[12.5px] text-fg3';

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-2">
      <span className={labelClass}>{label}</span>
      {children}
      {hint && <span className={hintClass}>{hint}</span>}
    </label>
  );
}

function Slider({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  min: number;
  max: number;
  step: number;
  disabled: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="h-1.5 w-full max-w-[280px] accent-[var(--accent)]"
      />
      <span className="w-12 shrink-0 font-grotesk text-[12.5px] text-fg2">{value}</span>
    </div>
  );
}

/**
 * Renders whatever an image op needs before it can run — one component per
 * control kind, switched on the binding's declared control (mirrors
 * pdf-controls.tsx). 'none' and 'paste-base64' render nothing: 'none' needs no
 * input, and 'paste-base64' is ImageRunner's primary input, handled before this
 * component ever mounts.
 */
export function ImageControls({
  control,
  state,
  onChange,
  previewUrl,
  disabled,
}: {
  control: ImageControl;
  state: ImageControlState;
  onChange: (next: ImageControlState) => void;
  previewUrl: string | null;
  disabled: boolean;
}) {
  const set = (patch: Partial<ImageControlState>) => onChange({ ...state, ...patch });

  if (control.kind === 'none' || control.kind === 'paste-base64') return null;

  if (control.kind === 'format') {
    const lossy = state.format === 'jpeg' || state.format === 'webp' || state.format === 'avif';
    return (
      <div className="flex flex-col gap-4">
        <Field label={control.label}>
          <SegmentedToggle
            aria-label="Output format"
            value={state.format}
            onChange={(format) => set({ format })}
            options={control.formats.map((f) => ({ value: f, label: f.toUpperCase() }))}
          />
        </Field>
        {lossy && (
          <Field label="Quality" hint="Higher keeps more detail; lower makes a smaller file.">
            <Slider value={state.quality} onChange={(quality) => set({ quality })} min={0.35} max={1} step={0.05} disabled={disabled} />
          </Field>
        )}
        {state.format === 'jpeg' && (
          <Field label="Background (for transparent areas)">
            <input
              type="color"
              value={state.background}
              disabled={disabled}
              onChange={(e) => set({ background: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded-lg border border-line bg-bg2"
            />
          </Field>
        )}
      </div>
    );
  }

  if (control.kind === 'resize') {
    return (
      <div className="flex flex-col gap-4">
        <Field label="Resize mode">
          <SegmentedToggle
            aria-label="Resize mode"
            value={state.resizeMode}
            onChange={(resizeMode) => set({ resizeMode })}
            options={[
              { value: 'fit', label: 'Fit' },
              { value: 'fill', label: 'Fill' },
              { value: 'exact', label: 'Exact' },
              { value: 'long-edge', label: 'Long edge' },
              { value: 'scale', label: 'Scale %' },
            ]}
          />
        </Field>
        {(state.resizeMode === 'fit' || state.resizeMode === 'fill' || state.resizeMode === 'exact') && (
          <div className="flex gap-3">
            <Field label="Width (px)">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={state.width}
                disabled={disabled}
                onChange={(e) => set({ width: e.target.value })}
                placeholder="1200"
                className={`${inputClass} max-w-[140px]`}
              />
            </Field>
            <Field label="Height (px)">
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={state.height}
                disabled={disabled}
                onChange={(e) => set({ height: e.target.value })}
                placeholder="800"
                className={`${inputClass} max-w-[140px]`}
              />
            </Field>
          </div>
        )}
        {state.resizeMode === 'long-edge' && (
          <Field label="Long edge (px)" hint="The longer side is scaled to this; the other side follows proportionally.">
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={state.longEdge}
              disabled={disabled}
              onChange={(e) => set({ longEdge: e.target.value })}
              className={`${inputClass} max-w-[160px]`}
            />
          </Field>
        )}
        {state.resizeMode === 'scale' && (
          <Field label="Scale factor" hint="1 = unchanged, 2 = double size, 0.5 = half size.">
            <input
              type="number"
              step={0.1}
              min={0.01}
              max={4}
              value={state.scaleFactor}
              disabled={disabled}
              onChange={(e) => set({ scaleFactor: e.target.value })}
              className={`${inputClass} max-w-[140px]`}
            />
          </Field>
        )}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={state.upscale}
            disabled={disabled}
            onChange={(e) => set({ upscale: e.target.checked })}
            className="size-4 accent-[var(--accent)]"
          />
          <span className="text-[13.5px] text-fg2">Allow upscaling (may blur)</span>
        </label>
      </div>
    );
  }

  if (control.kind === 'upscale') {
    return (
      <Field label="Scale factor" hint="High-quality resampling, not a neural upscaler — up to 4×.">
        <Slider value={state.scaleFactor} onChange={(scaleFactor) => set({ scaleFactor })} min={1} max={4} step={0.5} disabled={disabled} />
      </Field>
    );
  }

  if (control.kind === 'crop') {
    return (
      <div className="flex flex-col gap-4">
        {previewUrl && (
          <div className="relative w-full max-w-[320px] overflow-hidden rounded-lg border border-line">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewUrl} alt="" className="block w-full opacity-40" />
            <div
              className="absolute border-2"
              style={{
                borderColor: 'var(--accent)',
                left: `${state.cropX}%`,
                top: `${state.cropY}%`,
                width: `${state.cropW}%`,
                height: `${state.cropH}%`,
              }}
            />
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          {(['cropX', 'cropY', 'cropW', 'cropH'] as const).map((key, i) => (
            <Field key={key} label={['Left %', 'Top %', 'Width %', 'Height %'][i]!}>
              <input
                type="number"
                min={0}
                max={100}
                value={state[key]}
                disabled={disabled}
                onChange={(e) => set({ [key]: e.target.value })}
                className={`${inputClass} max-w-[100px]`}
              />
            </Field>
          ))}
        </div>
      </div>
    );
  }

  if (control.kind === 'rotate') {
    return (
      <Field label="Rotate by">
        <SegmentedToggle
          aria-label="Rotate by"
          value={state.rotateBy}
          onChange={(rotateBy) => set({ rotateBy })}
          options={[
            { value: '90', label: '90°' },
            { value: '180', label: '180°' },
            { value: '270', label: '270°' },
          ]}
        />
      </Field>
    );
  }

  if (control.kind === 'flip') {
    return (
      <Field label="Flip axis">
        <SegmentedToggle
          aria-label="Flip axis"
          value={state.flipAxis}
          onChange={(flipAxis) => set({ flipAxis })}
          options={[
            { value: 'horizontal', label: 'Horizontal' },
            { value: 'vertical', label: 'Vertical' },
          ]}
        />
      </Field>
    );
  }

  if (control.kind === 'adjust') {
    return (
      <div className="flex flex-col gap-4">
        <Field label="Brightness"><Slider value={state.brightness} onChange={(brightness) => set({ brightness })} min={0} max={2} step={0.05} disabled={disabled} /></Field>
        <Field label="Contrast"><Slider value={state.contrast} onChange={(contrast) => set({ contrast })} min={0} max={2} step={0.05} disabled={disabled} /></Field>
        <Field label="Saturation"><Slider value={state.saturation} onChange={(saturation) => set({ saturation })} min={0} max={2} step={0.05} disabled={disabled} /></Field>
        <Field label="Hue rotate (deg)"><Slider value={state.hueRotate} onChange={(hueRotate) => set({ hueRotate })} min={-180} max={180} step={5} disabled={disabled} /></Field>
        <Field label="Grayscale"><Slider value={state.grayscale} onChange={(grayscale) => set({ grayscale })} min={0} max={1} step={0.05} disabled={disabled} /></Field>
      </div>
    );
  }

  if (control.kind === 'blur') {
    return (
      <Field label="Blur radius (px)">
        <Slider value={state.blurRadius} onChange={(blurRadius) => set({ blurRadius })} min={0} max={30} step={1} disabled={disabled} />
      </Field>
    );
  }

  if (control.kind === 'pixelate') {
    return (
      <Field label="Block size (px)" hint="Bigger blocks = chunkier mosaic.">
        <Slider value={state.blockSize} onChange={(blockSize) => set({ blockSize })} min={2} max={60} step={1} disabled={disabled} />
      </Field>
    );
  }

  if (control.kind === 'watermark') {
    return (
      <div className="flex flex-col gap-4">
        <Field label="Watermark text">
          <input
            value={state.text}
            disabled={disabled}
            onChange={(e) => set({ text: e.target.value })}
            placeholder="© Your Name"
            className={inputClass}
          />
        </Field>
        <Field label="Position">
          <select
            value={state.anchor}
            disabled={disabled}
            onChange={(e) => set({ anchor: e.target.value as ImageControlState['anchor'] })}
            className={inputClass}
          >
            <option value="bottom-right">Bottom right</option>
            <option value="bottom-left">Bottom left</option>
            <option value="top-right">Top right</option>
            <option value="top-left">Top left</option>
            <option value="center">Center</option>
            <option value="tile">Tiled</option>
          </select>
        </Field>
        <div className="flex gap-3">
          <Field label="Opacity">
            <Slider value={state.opacity} onChange={(opacity) => set({ opacity })} min={0.05} max={1} step={0.05} disabled={disabled} />
          </Field>
          <Field label="Color">
            <input
              type="color"
              value={state.color}
              disabled={disabled}
              onChange={(e) => set({ color: e.target.value })}
              className="h-10 w-16 cursor-pointer rounded-lg border border-line bg-bg2"
            />
          </Field>
        </div>
      </div>
    );
  }

  if (control.kind === 'meme') {
    return (
      <div className="flex flex-col gap-4">
        <Field label="Top text">
          <input
            value={state.topText}
            disabled={disabled}
            onChange={(e) => set({ topText: e.target.value })}
            placeholder="TOP TEXT"
            className={inputClass}
          />
        </Field>
        <Field label="Bottom text">
          <input
            value={state.bottomText}
            disabled={disabled}
            onChange={(e) => set({ bottomText: e.target.value })}
            placeholder="BOTTOM TEXT"
            className={inputClass}
          />
        </Field>
      </div>
    );
  }

  if (control.kind === 'target-size') {
    return (
      <Field label="Target size (KB)">
        <input
          type="number"
          inputMode="numeric"
          min={1}
          value={state.targetKB}
          disabled={disabled}
          onChange={(e) => set({ targetKB: e.target.value })}
          className={`${inputClass} max-w-[140px]`}
        />
      </Field>
    );
  }

  if (control.kind === 'ico-sizes') {
    return (
      <Field label="Sizes to include">
        <div className="flex flex-wrap gap-3">
          {ICO_SIZE_CHOICES.map((size) => (
            <label key={size} className="flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={state.icoSizes.includes(size)}
                disabled={disabled}
                onChange={(e) =>
                  set({
                    icoSizes: e.target.checked
                      ? [...state.icoSizes, size].sort((a, b) => a - b)
                      : state.icoSizes.filter((s) => s !== size),
                  })
                }
                className="size-4 accent-[var(--accent)]"
              />
              <span className="text-[13px] text-fg2">{size}px</span>
            </label>
          ))}
        </div>
      </Field>
    );
  }

  return null;
}
