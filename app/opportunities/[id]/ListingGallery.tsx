"use client";

import { useEffect, useRef, useState } from "react";

type GalleryImage = { id: string; url: string };

export default function ListingGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!lightboxOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight") setActive((i) => (i + 1) % images.length);
      if (e.key === "ArrowLeft") setActive((i) => (i - 1 + images.length) % images.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen, images.length]);

  if (images.length === 0) return null;

  const looped = images.length > 1 ? [...images, ...images] : images;

  function openAt(i: number) {
    setActive(i);
    setLightboxOpen(true);
  }

  return (
    <section className="carousel">
      <div
        className={`carousel-track${images.length > 1 ? " auto-scroll" : ""}`}
        ref={trackRef}
        style={{ ["--slide-count" as string]: images.length }}
      >
        {looped.map((img, i) => (
          <button
            type="button"
            key={`${img.id}-${i}`}
            className="carousel-slide"
            onClick={() => openAt(i % images.length)}
            aria-label={`Open photo ${(i % images.length) + 1}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="" />
          </button>
        ))}
      </div>
      {images.length > 1 && <span className="carousel-count">{images.length} photos</span>}

      {lightboxOpen && (
        <div className="modal-backdrop lightbox-backdrop" onClick={() => setLightboxOpen(false)}>
          <div className="lightbox" onClick={(e) => e.stopPropagation()}>
            <button className="close lightbox-close" type="button" aria-label="Close" onClick={() => setLightboxOpen(false)}>
              ×
            </button>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[active].url} alt="" className="lightbox-img" />
            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="lightbox-nav prev"
                  aria-label="Previous photo"
                  onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                    <path d="M11 3.5 5.5 9l5.5 5.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="lightbox-nav next"
                  aria-label="Next photo"
                  onClick={() => setActive((i) => (i + 1) % images.length)}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
                    <path d="M7 3.5 12.5 9 7 14.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                <span className="lightbox-count">
                  {active + 1} / {images.length}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
