"use client";

import { useEffect, useRef, useState } from "react";
import { showToast } from "@/app/components/Toaster";

type Img = { id: string; url: string; sortOrder: number };

const MAX_IMAGES = 10;
const MAX_FILE_BYTES = 3 * 1024 * 1024; // 3MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function ImagesStep({ listingId }: { listingId?: string }) {
  const [images, setImages] = useState<Img[]>([]);
  const [loadingImages, setLoadingImages] = useState(true);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!listingId) {
      setLoadingImages(false);
      return;
    }
    fetch(`/api/listings/${listingId}/images`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setImages(Array.isArray(data) ? data : []))
      .finally(() => setLoadingImages(false));
  }, [listingId]);

  async function uploadFiles(files: FileList | File[]) {
    if (!listingId) return;
    setError(null);

    const remaining = MAX_IMAGES - images.length - uploadingCount;
    const fileArray = Array.from(files).slice(0, Math.max(remaining, 0));

    if (fileArray.length === 0) {
      const message = `You can add up to ${MAX_IMAGES} images per listing.`;
      setError(message);
      showToast(message, "error");
      return;
    }

    for (const file of fileArray) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        showToast(`${file.name}: only PNG, JPG and WEBP are allowed.`, "error");
        continue;
      }
      if (file.size > MAX_FILE_BYTES) {
        showToast(`${file.name} is over 3MB.`, "error");
        continue;
      }

      setUploadingCount((n) => n + 1);
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`/api/listings/${listingId}/images`, { method: "POST", body: form });
      setUploadingCount((n) => n - 1);

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const message = data.error ?? `Could not upload ${file.name}.`;
        setError(message);
        showToast(message, "error");
        continue;
      }

      const image = await res.json();
      setImages((prev) => [...prev, image]);
    }
  }

  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      uploadFiles(e.target.files);
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      uploadFiles(e.dataTransfer.files);
    }
  }

  async function handleRemove(imageId: string) {
    if (!listingId) return;
    const res = await fetch(`/api/listings/${listingId}/images/${imageId}`, { method: "DELETE" });
    if (!res.ok) {
      showToast("Could not remove this image.", "error");
      return;
    }
    setImages((prev) => prev.filter((img) => img.id !== imageId));
    showToast("Image removed.", "success");
  }

  if (!listingId) {
    return (
      <div className="empty" style={{ borderBottom: 0, textAlign: "left" }}>
        Save this listing first (go back a step, or continue — a draft is created automatically) before
        adding images.
      </div>
    );
  }

  const atLimit = images.length + uploadingCount >= MAX_IMAGES;

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple
        onChange={handleFileInputChange}
        disabled={atLimit}
        style={{ display: "none" }}
        id="img-file-input"
      />
      <label
        htmlFor={atLimit ? undefined : "img-file-input"}
        className={`img-upload-drop${dragOver ? " dragover" : ""}`}
        style={{ cursor: atLimit ? "default" : "pointer", opacity: atLimit ? 0.6 : 1 }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!atLimit) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={atLimit ? undefined : handleDrop}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
          <rect x="3.5" y="5.5" width="21" height="17" rx="2.5" />
          <circle cx="10" cy="11.5" r="2" />
          <path d="M3.5 18.5 10 12l4.5 4.5L19 11.5l5.5 5.5" strokeLinejoin="round" />
        </svg>
        <span className="lab">{atLimit ? "Image limit reached" : "Drop images here or click to browse"}</span>
        <span className="sub">PNG, JPG or WEBP · up to 3MB each</span>
      </label>

      {error && (
        <p role="alert" style={{ color: "#6a2a1c", marginTop: 12, fontSize: 14 }}>
          {error}
        </p>
      )}

      <p className="img-count">
        {images.length + uploadingCount} of {MAX_IMAGES} images
      </p>

      {loadingImages ? (
        <p style={{ marginTop: 16, fontSize: 14, color: "var(--on-bone-faint)" }}>Loading images…</p>
      ) : (
        <div className="img-gallery">
          {images.map((img, i) => (
            <div className="img-tile" key={img.id}>
              {i === 0 && <span className="cover-badge">Cover</span>}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" loading="lazy" />
              <button
                type="button"
                className="remove-btn"
                aria-label="Remove image"
                onClick={() => handleRemove(img.id)}
              >
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M2 2l9 9M11 2l-9 9" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
          {Array.from({ length: uploadingCount }).map((_, i) => (
            <div className="img-tile uploading" key={`uploading-${i}`}>
              <div className="spinner" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
