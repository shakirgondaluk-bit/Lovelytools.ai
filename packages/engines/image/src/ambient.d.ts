// lovelytools.ai — ambient type for the one subpath libheif-js ships without its
// own matching .d.ts: the self-contained WASM bundle (binary embedded, no separate
// asset to vendor). Scoped to exactly what heic.ts calls — see its README for the
// full embind surface we deliberately aren't typing.
declare module 'libheif-js/libheif-wasm/libheif-bundle.mjs' {
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(
      imageData: { data: Uint8ClampedArray; width: number; height: number },
      cb: (result: unknown) => void,
    ): void;
  }
  interface LibheifModule {
    HeifDecoder: new () => { decode(buf: Uint8Array): HeifImage[] };
  }
  const factory: (opts?: Record<string, unknown>) => Promise<LibheifModule>;
  export default factory;
}
