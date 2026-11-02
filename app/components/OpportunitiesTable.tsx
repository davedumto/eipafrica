"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useFilter } from "./FilterStore";
import { badgeClassForSlug } from "@/lib/listing-fields";

type PreviewItem = {
  id: string;
  title: string;
  typeSlug: string;
  typeName: string;
  sectorSlug: string;
  sectorName: string;
  country: string;
  dealLabel: string | null;
  dealSizeUsd: number | null;
  stage: string;
  orgName: string;
  isVerified: boolean;
  isFeatured: boolean;
};

type PreviewOption = { slug: string; name: string };

const SIZE_OPTIONS = [
  { value: "any", label: "Any size" },
  { value: "s", label: "Under $10M" },
  { value: "m", label: "$10M to $50M" },
  { value: "l", label: "Over $50M" },
];

function sizeOk(usd: number | null, s: string) {
  if (s === "any") return true;
  const millions = usd !== null ? usd / 1_000_000 : null;
  if (millions === null) return false;
  if (s === "s") return millions < 10;
  if (s === "m") return millions >= 10 && millions <= 50;
  return millions > 50;
}

export default function OpportunitiesTable() {
  const { filter, setFilter, resetFilter } = useFilter();

  const [items, setItems] = useState<PreviewItem[]>([]);
  const [types, setTypes] = useState<PreviewOption[]>([]);
  const [sectors, setSectors] = useState<PreviewOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch("/api/opportunities/preview")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load opportunities.");
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setItems(data.items ?? []);
        setTypes(data.types ?? []);
        setSectors(data.sectors ?? []);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [retryCount]);

  // Deal size dropdown — self-contained, not a shared component.
  const [sizeOpen, setSizeOpen] = useState(false);
  const [sizeUp, setSizeUp] = useState(false);
  const sizeRootRef = useRef<HTMLDivElement>(null);
  const sizeSelected = SIZE_OPTIONS.find((o) => o.value === filter.size);

  const q = filter.q.trim().toLowerCase();
  const out = items.filter(
    (l) =>
      (filter.type === "All" || l.typeName === filter.type) &&
      (filter.sector === "All" || l.sectorName === filter.sector) &&
      sizeOk(l.dealSizeUsd, filter.size) &&
      (!q || `${l.title} ${l.country} ${l.sectorName}`.toLowerCase().includes(q)),
  );

  return (
    <>
      <div className="filters" role="group" aria-label="Filter opportunities">
        <div className="frow frow-stack" id="fType">
          <span className="lab">TYPE</span>
          <div className="fchips">
            <button
              type="button"
              className="fchip"
              aria-pressed={filter.type === "All"}
              onClick={() => setFilter({ type: "All" })}
            >
              All
            </button>
            {types.map((t) => (
              <button
                key={t.slug}
                type="button"
                className="fchip"
                aria-pressed={filter.type === t.name}
                onClick={() => setFilter({ type: t.name })}
              >
                {t.name}
              </button>
            ))}
          </div>
        </div>
        <div className="frow frow-stack" id="fSector">
          <span className="lab">SECTOR</span>
          <div className="fchips">
            <button
              type="button"
              className="fchip"
              aria-pressed={filter.sector === "All"}
              onClick={() => setFilter({ sector: "All" })}
            >
              All
            </button>
            {sectors.map((s) => (
              <button
                key={s.slug}
                type="button"
                className="fchip"
                aria-pressed={filter.sector === s.name}
                onClick={() => setFilter({ sector: s.name })}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>
        <div className="frow">
          <span className="lab">SIZE</span>
          <div style={{ width: 160 }}>
            <div className={`xselect${sizeOpen ? " open" : ""}`} ref={sizeRootRef}>
              <button
                type="button"
                className="xselect-trigger"
                aria-haspopup="listbox"
                aria-expanded={sizeOpen}
                aria-label="Deal size"
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
                  <ul className={`xselect-list${sizeUp ? " xselect-list--up" : ""}`} role="listbox" aria-label="Deal size">
                    {SIZE_OPTIONS.map((opt) => (
                      <li
                        key={opt.value}
                        role="option"
                        aria-selected={opt.value === filter.size}
                        className={`xselect-opt${opt.value === filter.size ? " selected" : ""}`}
                        onClick={() => {
                          setFilter({ size: opt.value });
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
          <label className="lab" htmlFor="fQ" style={{ width: "auto", marginLeft: 12 }}>
            SEARCH
          </label>
          <input
            className="fq"
            id="fQ"
            type="search"
            placeholder="Title, country or region"
            value={filter.q}
            onChange={(e) => setFilter({ q: e.target.value })}
          />
          <button className="reset" id="reset" type="button" onClick={resetFilter}>
            Reset filters
          </button>
        </div>
      </div>
      <div className="tablewrap" role="table" aria-label="Live opportunities">
        <div className="row head" role="row">
          <span>TYPE</span>
          <span>LISTING</span>
          <span>COUNTRY</span>
          <span>SIZE</span>
          <span>STAGE</span>
          <span>STATUS</span>
        </div>
        <div id="rows">
          {loading && <div className="empty">Loading live opportunities…</div>}
          {!loading && error && (
            <div className="empty">
              Could not load live opportunities right now.{" "}
              <button type="button" className="btn-outline" onClick={() => setRetryCount((n) => n + 1)}>
                Try again
              </button>
            </div>
          )}
          {!loading &&
            !error &&
            out.map((l) => (
              <Link href={`/opportunities/${l.id}`} className="row" key={l.id} role="row">
                <span className={`badge ${badgeClassForSlug(l.typeSlug)}`}>{l.typeName}</span>
                <span className="ttl">
                  <span className="t">
                    {l.title}
                    {l.isFeatured && (
                      <span className="featured-tag" style={{ marginLeft: 10 }}>
                        ★ Featured
                      </span>
                    )}
                  </span>
                  <small>{l.sectorName}</small>
                </span>
                <span className="c">{l.country}</span>
                <span className="z">{l.dealLabel ?? "—"}</span>
                <span className="s">{l.stage}</span>
                <span className="v">
                  {l.isVerified ? (
                    <>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                        <path d="M2 6.5 4.8 9 10 3" />
                      </svg>
                      VERIFIED
                    </>
                  ) : (
                    "—"
                  )}
                </span>
              </Link>
            ))}
          {!loading && !error && out.length === 0 && (
            <div className="empty">No live opportunities match these filters right now.</div>
          )}
        </div>
      </div>
      <div className="note">
        <span id="count">
          {loading ? "LOADING…" : `SHOWING ${out.length} OF ${items.length} LIVE LISTINGS`}
        </span>
      </div>
    </>
  );
}
