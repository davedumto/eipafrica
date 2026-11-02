"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type FilterState = {
  type: string;
  sector: string;
  size: string;
  q: string;
};

const DEFAULT_FILTER: FilterState = { type: "All", sector: "All", size: "any", q: "" };

type FilterContextValue = {
  filter: FilterState;
  setFilter: (next: Partial<FilterState>) => void;
  resetFilter: () => void;
  chapter: number;
  setChapter: (i: number) => void;
};

const FilterContext = createContext<FilterContextValue | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filter, setFilterState] = useState<FilterState>(DEFAULT_FILTER);
  const [chapter, setChapter] = useState<number>(-1);

  const value = useMemo<FilterContextValue>(
    () => ({
      filter,
      setFilter: (next) => setFilterState((prev) => ({ ...prev, ...next })),
      resetFilter: () => setFilterState(DEFAULT_FILTER),
      chapter,
      setChapter,
    }),
    [filter, chapter]
  );

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
}

export function useFilter() {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error("useFilter must be used within FilterProvider");
  return ctx;
}

export function scrollToOpportunities() {
  const el = document.getElementById("opportunities");
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  el?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
}
