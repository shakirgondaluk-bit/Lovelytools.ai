'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AffiliateGalleryProps {
  images: [string, ...string[]];
  productName: string;
}

export function AffiliateGallery({ images, productName }: AffiliateGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className="relative min-w-0 flex-[1.25_1_440px] space-y-3">
      {/* Main image */}
      <div
        className={`relative overflow-hidden rounded-2xl border border-line bg-surface transition-cursor ${
          isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
        }`}
        onClick={() => setIsZoomed(!isZoomed)}
      >
        <div className={`relative h-[560px] w-full overflow-auto ${isZoomed ? 'flex items-center justify-center' : ''}`}>
          <Image
            src={images[activeIndex]}
            alt={productName}
            width={880}
            height={560}
            className={`h-auto w-full object-contain transition-transform ${isZoomed ? 'scale-150' : ''}`}
            priority
          />
        </div>
      </div>

      {/* Award badge */}
      {images.length > 0 && (
        <div className="absolute -top-3 right-2 z-10 flex h-[70px] w-[70px] flex-col items-center justify-center gap-0.5 rounded-full bg-accent text-center leading-tight text-accent-fg shadow-[var(--card-shadow)]">
          <span className="text-[10px] font-extrabold">AMAZON'S</span>
          <span className="text-[10px] font-extrabold">CHOICE</span>
        </div>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-2">
          {images.slice(0, 4).map((src, i) => (
            <button
              key={src}
              onClick={() => {
                setActiveIndex(i);
                setIsZoomed(false);
              }}
              className={`group relative overflow-hidden rounded-lg border-2 transition-all ${
                activeIndex === i ? 'border-accent' : 'border-line hover:border-line2'
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <div className="relative h-[140px] w-full overflow-hidden bg-surface">
                <Image
                  src={src}
                  alt={`${productName} ${i + 1}`}
                  width={200}
                  height={140}
                  className="h-full w-full object-cover"
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
