'use client';

import { useState } from 'react';
import Image from 'next/image';

interface AffiliateGalleryProps {
  images: [string, ...string[]];
  productName: string;
}

export function AffiliateGallery({ images, productName }: AffiliateGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isHovering, setIsHovering] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  return (
    <div className="relative min-w-0 space-y-3">
      {/* Main image */}
      <div
        className="relative cursor-zoom-in overflow-hidden rounded-2xl border border-line bg-surface"
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
        </div>
      )}
    </div>
  );
}
