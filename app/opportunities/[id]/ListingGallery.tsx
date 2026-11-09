"use client";

import { useEffect, useState } from "react";

type GalleryImage = { id: string; url: string };

export default function ListingGallery({ images }: { images: GalleryImage[] }) {
  const [active, setActive] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

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

  return (
    <section className="gallery">
      <button
        type="button"
        className="gallery-hero"
        onClick={() => {
          setActive(0);
          setLightboxOpen(true);
        }}
        aria-label="Open image gallery"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={images[0].url} alt="" />
        {images.length > 1 && <span className="gallery-count">{images.length} photos</span>}
      </button>

      {images.length > 1 && (
        <div className="gallery-strip" role="list">
          {images.slice(1, 5).map((img, i) => (
            <button
              type="button"
              key={img.id}
              className="gallery-thumb"
              onClick={() => {
                setActive(i + 1);
                setLightboxOpen(true);
              }}
              aria-label={`Open photo ${i + 2}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" />
              {i === 3 && images.length > 5 && (
                <span className="gallery-more">+{images.length - 5}</span>
              )}
            </button>
          ))}
        </div>
      )}

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
