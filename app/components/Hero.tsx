"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { startNavProgress } from "./NavProgress";

const SECTOR_SLUGS: Record<string, string[]> = {
  Power: ["solar", "wind", "hydro", "gas"],
  Water: ["water"],
  Grid: ["transmission"],
  Renewables: ["solar", "wind"],
};

const SECTOR_OPTIONS = [
  { value: "All", label: "Any sector" },
  { value: "Power", label: "Power" },
  { value: "Water", label: "Water" },
  { value: "Grid", label: "Grid" },
  { value: "Renewables", label: "Renewables" },
];

const SIZE_RANGE: Record<string, { min?: string; max?: string }> = {
  s: { max: "10000000" },
  m: { min: "10000000", max: "50000000" },
  l: { min: "50000000" },
};

const SIZE_OPTIONS = [
  { value: "any", label: "Any size" },
  { value: "s", label: "Under $10M" },
  { value: "m", label: "$10M to $50M" },
  { value: "l", label: "Over $50M" },
];

export default function Hero() {
  const router = useRouter();
  const countryRef = useRef<HTMLInputElement>(null);
  const [sector, setSector] = useState("All");
  const [size, setSize] = useState("any");

  // Sector dropdown — self-contained, not a shared component.
  const [sectorOpen, setSectorOpen] = useState(false);
  const [sectorUp, setSectorUp] = useState(false);
  const sectorRootRef = useRef<HTMLDivElement>(null);
  const sectorSelected = SECTOR_OPTIONS.find((o) => o.value === sector);

  // Deal size dropdown — self-contained, not a shared component.
  const [sizeOpen, setSizeOpen] = useState(false);
  const [sizeUp, setSizeUp] = useState(false);
  const sizeRootRef = useRef<HTMLDivElement>(null);
  const sizeSelected = SIZE_OPTIONS.find((o) => o.value === size);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (sector !== "All") {
      for (const slug of SECTOR_SLUGS[sector] ?? []) params.append("sector", slug);
    }
    const q = countryRef.current?.value.trim();
    if (q) params.set("q", q);
    const range = SIZE_RANGE[size];
    if (range?.min) params.set("min", range.min);
    if (range?.max) params.set("max", range.max);
    startNavProgress();
    router.push(`/opportunities${params.toString() ? `?${params}` : ""}`);
  };

  return (
    <section className="hero" id="hero">
      <div className="in">
        <div className="eyebrow">ENERGY AND INFRASTRUCTURE · AFRICA</div>
        <h1>Every energy and infrastructure deal in Africa, in one place.</h1>
        <p className="lede">
          List a project, asset or need in minutes. Find the people who can fund, build, supply or buy it. Then take
          the deal forward through the platform.
        </p>
        <div className="stage-gap" aria-hidden="true"></div>
        <form className="search" id="heroForm" autoComplete="off" onSubmit={onSubmit}>
          <div className="field">
            <label id="hSector-label">Sector</label>
            <div className={`xselect${sectorOpen ? " open" : ""}`} ref={sectorRootRef}>
              <input type="hidden" name="hSector" value={sector} />
              <button
                type="button"
                className="xselect-trigger"
                aria-haspopup="listbox"
                aria-expanded={sectorOpen}
                aria-labelledby="hSector-label"
                onClick={() => {
                  if (sectorOpen) {
                    setSectorOpen(false);
                  } else {
                    const el = sectorRootRef.current;
                    if (el) {
                      const rect = el.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setSectorUp(spaceBelow < 220 && rect.top > spaceBelow);
                    }
                    setSectorOpen(true);
                  }
                }}
              >
                <span className="xselect-value">{sectorSelected?.label ?? "Any sector"}</span>
                <span className="xselect-chevron" aria-hidden="true" />
              </button>
              {sectorOpen && (
                <>
                  <div className="xselect-backdrop" onClick={() => setSectorOpen(false)} />
                  <ul className={`xselect-list${sectorUp ? " xselect-list--up" : ""}`} role="listbox" aria-labelledby="hSector-label">
                    {SECTOR_OPTIONS.map((opt) => (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={opt.value === sector}
                        className={`xselect-opt${opt.value === sector ? " selected" : ""}`}
                        onClick={() => {
                          setSector(opt.value);
                          setSectorOpen(false);
                        }}
                      >
                        {opt.label}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </div>
          <div className="field">
            <label htmlFor="hCountry">Country or region</label>
            <input id="hCountry" type="text" placeholder="Nigeria, East Africa…" ref={countryRef} />
          </div>
          <div className="field">
            <label id="hSize-label">Deal size (USD)</label>
            <div className={`xselect${sizeOpen ? " open" : ""}`} ref={sizeRootRef}>
              <input type="hidden" name="hSize" value={size} />
              <button
                type="button"
                className="xselect-trigger"
                aria-haspopup="listbox"
                aria-expanded={sizeOpen}
                aria-labelledby="hSize-label"
                onClick={() => {
                  if (sizeOpen) {
                    setSizeOpen(false);
                  } else {
                    const el = sizeRootRef.current;
                    if (el) {
                      const rect = el.getBoundingClientRect();
                      const spaceBelow = window.innerHeight - rect.bottom;
                      setSizeUp(spaceBelow < 220 && rect.top > spaceBelow);
                    }
                    setSizeOpen(true);
                  }
                }}
              >
                <span className="xselect-value">{sizeSelected?.label ?? "Any size"}</span>
                <span className="xselect-chevron" aria-hidden="true" />
              </button>
              {sizeOpen && (
                <>
                <div className="xselect-backdrop" onClick={() => setSizeOpen(false)} />
                <ul className={`xselect-list${sizeUp ? " xselect-list--up" : ""}`} role="listbox" aria-labelledby="hSize-label">
                  {SIZE_OPTIONS.map((opt) => (
                    <li
                      key={opt.value}
                      role="option"
                      aria-selected={opt.value === size}
                      className={`xselect-opt${opt.value === size ? " selected" : ""}`}
                      onClick={() => {
                        setSize(opt.value);
                        setSizeOpen(false);
                      }}
                    >
                      {opt.label}
                    </li>
                  ))}
                </ul>
                </>
              )}
            </div>
          </div>
          <button className="btn-primary" type="submit">
            Search opportunities
          </button>
        </form>
        <p className="alt">
          Or <Link href="/listings/new">post an opportunity</Link>. Browsing needs no account; full details do.
        </p>
      </div>
      <div className="cue">
        <div className="in">
          <i></i>
          <span>SCROLL TO TRAVEL THE GRID</span>
        </div>
      </div>
    </section>
  );
}
