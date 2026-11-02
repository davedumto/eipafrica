"use client";

import { useFilter, scrollToOpportunities } from "./FilterStore";

export default function BrowseAllButton() {
  const { resetFilter } = useFilter();
  return (
    <a
      className="btn-dark"
      href="#opportunities"
      id="browseAll"
      onClick={(e) => {
        e.preventDefault();
        resetFilter();
        scrollToOpportunities();
      }}
    >
      Browse all opportunities
    </a>
  );
}
