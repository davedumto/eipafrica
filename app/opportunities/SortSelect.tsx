"use client";

import { useRef, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { startNavProgress } from "@/app/components/NavProgress";

const SORT_OPTIONS = [
  { value: "newest", label: "Newest" },
  { value: "closing", label: "Closing soon" },
  { value: "largest", label: "Largest deal size" },
];

// Self-contained dropdown — not a shared Select component. Only used here,
// on the Opportunities sort control.
export default function SortSelect({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [open, setOpen] = useState(false);
  const [up, setUp] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = SORT_OPTIONS.find((o) => o.value === value);

  function onChange(v: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (v === "newest") {
      params.delete("sort");
    } else {
      params.set("sort", v);
    }
    const qs = params.toString();
    startNavProgress();
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className={`xselect xselect--sort${open ? " open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="xselect-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Sort by"
        onClick={() => {
          if (open) {
            setOpen(false);
          } else {
            const el = rootRef.current;
            if (el) {
              const rect = el.getBoundingClientRect();
              const spaceBelow = window.innerHeight - rect.bottom;
              setUp(spaceBelow < 220 && rect.top > spaceBelow);
            }
            setOpen(true);
          }
        }}
      >
        <span className="xselect-value">{selected?.label ?? "Newest"}</span>
        <span className="xselect-chevron" aria-hidden="true" />
      </button>
      {open && (
        <>
          <div className="xselect-backdrop" onClick={() => setOpen(false)} />
          <ul className={`xselect-list${up ? " xselect-list--up" : ""}`} role="listbox" aria-label="Sort by">
            {SORT_OPTIONS.map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`xselect-opt${opt.value === value ? " selected" : ""}`}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
              >
                {opt.label}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
