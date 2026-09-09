'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

interface AffiliateGalleryProps {
  images: [string, ...string[]];
  productName: string;
  awardBadge?: { line1: string; line2: string };
}

// How many tiles the rail shows before it collapses the rest behind a "+N" tile.
// Amazon does the same thing: a fixed strip, with the overflow count on the last
// tile rather than a rail that grows without limit down the page.
const VISIBLE_THUMBS = 4;

export function AffiliateGallery({ images, productName, awardBadge }: AffiliateGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const [viewerOpen, setViewerOpen] = useState(false);

  const hasOverflow = images.length > VISIBLE_THUMBS;
  // With overflow, the last tile becomes the "+N" control, so one fewer photo shows.
  const railImages = hasOverflow ? images.slice(0, VISIBLE_THUMBS - 1) : images;
  const overflowCount = images.length - railImages.length;

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  const openViewer = useCallback(() => setViewerOpen(true), []);
  const closeViewer = useCallback(() => setViewerOpen(false), []);

  return (
    <>
      {/* On wide screens the gallery owns the full content column, so the thumbnails
          sit in a vertical rail beside the main image instead of a wide strip beneath it. */}
      <div className="relative flex min-w-0 flex-col gap-3 sm:flex-row-reverse sm:items-stretch">
        {/* Main image */}
        <div
          className="relative min-w-0 flex-1 cursor-zoom-in overflow-hidden rounded-2xl border border-line bg-surface"
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          onMouseMove={handleMouseMove}
        >
          <div className="relative flex h-[360px] w-full items-center justify-center overflow-hidden">
            <Image
              src={images[activeIndex] ?? images[0]}
              alt={productName}
              width={880}
              height={560}
              className="h-full w-full object-contain transition-transform duration-300 ease-out"
              style={{ transform: isHovering ? 'scale(2)' : 'scale(1)', transformOrigin: origin }}
              priority
            />
          </div>

          {images.length > 1 && (
            <button
              type="button"
              onClick={openViewer}
              className="absolute bottom-3 right-3 z-10 rounded-full border border-line bg-surface/90 px-3 py-1.5 text-[12px] font-semibold text-fg shadow-[var(--card-shadow)] backdrop-blur transition-colors hover:border-accent hover:text-accent"
            >
              See all {images.length} images
            </button>
          )}
        </div>

        {/* Award badge */}
        {awardBadge && (
          <div className="absolute -top-3 right-2 z-10 flex h-[70px] w-[70px] flex-col items-center justify-center gap-0.5 rounded-full bg-accent text-center leading-tight text-accent-fg shadow-[var(--card-shadow)]">
            <span className="text-[10px] font-extrabold">{awardBadge.line1}</span>
            <span className="text-[10px] font-extrabold">{awardBadge.line2}</span>
          </div>
        )}

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2 sm:w-[92px] sm:shrink-0 sm:grid-cols-1">
            {railImages.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                  activeIndex === i ? 'border-accent' : 'border-line hover:border-line2'
                }`}
                aria-label={`View image ${i + 1}`}
              >
                <div className="relative flex h-[80px] w-full items-center justify-center overflow-hidden bg-surface">
                  <Image
                    src={src}
                    alt={`${productName} ${i + 1}`}
                    width={200}
                    height={80}
                    className="h-full w-full object-contain"
                  />
                </div>
              </button>
            ))}

            {hasOverflow && (
              <button
                type="button"
                onClick={openViewer}
                className="group relative overflow-hidden rounded-lg border-2 border-line transition-all hover:border-accent"
                aria-label={`View all ${images.length} images`}
              >
                {/* The next unseen photo sits behind the count, so the tile still
                    previews what opening it reveals. */}
                <div className="relative flex h-[80px] w-full items-center justify-center overflow-hidden bg-surface">
                  <Image
                    src={images[railImages.length] as string}
                    alt=""
                    aria-hidden="true"
                    width={200}
                    height={80}
                    className="h-full w-full object-contain opacity-40"
                  />
                  <span className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold text-fg transition-colors group-hover:text-accent">
                    {overflowCount}+
                  </span>
                </div>
              </button>
            )}
          </div>
        )}
      </div>

      {viewerOpen && (
        <AffiliateGalleryViewer
          images={images}
          productName={productName}
          initialIndex={activeIndex}
          onClose={closeViewer}
          onSelect={setActiveIndex}
        />
      )}
    </>
  );
}

interface ViewerProps {
  images: [string, ...string[]];
  productName: string;
  initialIndex: number;
  onClose: () => void;
  onSelect: (index: number) => void;
}

function AffiliateGalleryViewer({
  images,
  productName,
  initialIndex,
  onClose,
  onSelect,
}: ViewerProps) {
  const [index, setIndex] = useState(initialIndex);
  const closeRef = useRef<HTMLButtonElement>(null);

  const show = useCallback(
    (next: number) => {
      const wrapped = (next + images.length) % images.length;
      setIndex(wrapped);
      // Keep the page behind in step, so closing the viewer leaves the main
      // image on whatever the reader last looked at.
      onSelect(wrapped);
    },
    [images.length, onSelect],
  );

  useEffect(() => {
    closeRef.current?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') show(index + 1);
      else if (e.key === 'ArrowLeft') show(index - 1);
    }

    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [index, onClose, show]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${productName} — all ${images.length} images`}
      className="fixed inset-0 z-[100] flex flex-col bg-bg/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-line px-4 py-3">
        <p className="min-w-0 truncate text-[13px] font-semibold text-muted">
          {productName} — image {index + 1} of {images.length}
        </p>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-full border border-line px-4 py-1.5 text-[13px] font-semibold text-fg transition-colors hover:border-accent hover:text-accent"
        >
          Close
        </button>
      </div>

      {/* Stop propagation so clicking the image itself doesn't dismiss the viewer. */}
      <div
        className="flex min-h-0 flex-1 items-center justify-center gap-2 px-3 py-4"
        onClick={(e) => e.stopPropagation()}
      >
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => show(index - 1)}
            aria-label="Previous image"
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-4 text-[16px] font-bold text-fg transition-colors hover:border-accent hover:text-accent"
          >
            ‹
          </button>
        )}

        <div className="relative flex h-full min-w-0 flex-1 items-center justify-center">
          <Image
            src={images[index] as string}
            alt={`${productName} ${index + 1}`}
            width={1400}
            height={1400}
            className="max-h-full w-auto max-w-full object-contain"
          />
        </div>

        {images.length > 1 && (
          <button
            type="button"
            onClick={() => show(index + 1)}
            aria-label="Next image"
            className="shrink-0 rounded-full border border-line bg-surface px-3 py-4 text-[16px] font-bold text-fg transition-colors hover:border-accent hover:text-accent"
          >
            ›
          </button>
        )}
      </div>

      <div
        className="shrink-0 overflow-x-auto border-t border-line px-4 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex gap-2">
          {images.map((src, i) => (
            <button
              key={src}
              type="button"
              onClick={() => show(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={index === i}
              className={`shrink-0 overflow-hidden rounded-lg border-2 transition-all ${
                index === i ? 'border-accent' : 'border-line hover:border-line2'
              }`}
            >
              <div className="flex h-[64px] w-[64px] items-center justify-center overflow-hidden bg-surface">
                <Image
                  src={src}
                  alt=""
                  aria-hidden="true"
                  width={128}
                  height={128}
                  className="h-full w-full object-contain"
                />
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
