export type FieldSchemaEntry = {
  key: string;
  type: "text" | "textarea" | "number" | "currency" | "date" | "select" | "multiselect" | "repeater";
  label: string;
  options?: string[];
  fields?: string[];
};

export type ExtraFieldValues = Record<string, unknown>;

const BADGE_BY_SLUG: Record<string, string> = {
  "project-seeking-investment": "badge-investment",
  "project-seeking-epc": "badge-epc",
  "tender-procurement-request": "badge-tender",
  "asset-for-sale": "badge-asset",
  "investor-mandate": "badge-mandate",
  "company-service-offering": "badge-company",
};

export function badgeClassForSlug(slug: string): string {
  return BADGE_BY_SLUG[slug] ?? "badge-company";
}

export function formatFieldValue(entry: FieldSchemaEntry, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (entry.type === "multiselect" && Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }
  if (entry.type === "currency") {
    const n = Number(value);
    return Number.isFinite(n) ? `$${n.toLocaleString()}` : String(value);
  }
  if (entry.type === "repeater") {
    // The wizard captures repeater fields as free text, one entry per line
    // (see ListingWizard.tsx's GenericField) — not structured array-of-objects.
    // Still handle an array shape defensively in case a future editor ever
    // writes one directly (e.g. via the API without going through the wizard).
    if (Array.isArray(value)) {
      if (!value.length) return "—";
      return value
        .map((row) => {
          if (row && typeof row === "object") {
            return Object.values(row as Record<string, unknown>).filter(Boolean).join(" · ");
          }
          return String(row);
        })
        .join("\n");
    }
    if (typeof value === "string") {
      return value.trim() || "—";
    }
  }
  return String(value);
}
