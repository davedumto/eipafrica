export type Listing = {
  type: "Investment" | "EPC" | "Tender" | "Asset sale" | "Mandate";
  title: string;
  country: string;
  region: string;
  min: number;
  max: number;
  stage: string;
  sector: "Power" | "Water" | "Grid" | "Renewables";
  verified: boolean;
};

export const LISTINGS: Listing[] = [
  { type: "Investment", title: "50 MW solar PV in Kano", country: "Nigeria", region: "West Africa", min: 40, max: 40, stage: "Development", sector: "Renewables", verified: true },
  { type: "EPC", title: "Mini-grid portfolio needs an EPC contractor", country: "Kenya", region: "East Africa", min: 18, max: 18, stage: "Feasibility", sector: "Renewables", verified: true },
  { type: "Tender", title: "Utility seeks bids for 200 transformers", country: "Ghana", region: "West Africa", min: 6, max: 6, stage: "Closes in 21 days", sector: "Grid", verified: true },
  { type: "Asset sale", title: "70% stake in an operating hydro plant", country: "Uganda", region: "East Africa", min: 85, max: 85, stage: "Operational", sector: "Water", verified: true },
  { type: "Mandate", title: "Fund deploying $5–20M in East African renewables", country: "East Africa", region: "East Africa", min: 5, max: 20, stage: "Open", sector: "Renewables", verified: true },
  { type: "Investment", title: "132 kV transmission line, 90 km", country: "Zambia", region: "Southern Africa", min: 120, max: 120, stage: "Financial close", sector: "Grid", verified: true },
  { type: "EPC", title: "Gas-fired plant needs an EPC contractor", country: "Nigeria", region: "West Africa", min: 75, max: 75, stage: "Development", sector: "Power", verified: true },
  { type: "Tender", title: "Water treatment and storage works", country: "Rwanda", region: "East Africa", min: 12, max: 12, stage: "Closes in 30 days", sector: "Water", verified: true },
  { type: "Investment", title: "120 MW wind farm, phase one", country: "Kenya", region: "East Africa", min: 160, max: 160, stage: "Construction", sector: "Renewables", verified: true },
  { type: "Asset sale", title: "49% of an operating thermal plant", country: "Nigeria", region: "West Africa", min: 60, max: 60, stage: "Operational", sector: "Power", verified: true },
  { type: "EPC", title: "Substation upgrade and new feeders", country: "Tanzania", region: "East Africa", min: 22, max: 22, stage: "Development", sector: "Grid", verified: true },
  { type: "Tender", title: "Dam rehabilitation and spillway repairs", country: "Mozambique", region: "Southern Africa", min: 30, max: 30, stage: "Closes in 45 days", sector: "Water", verified: true },
];

export const fmt = (l: Listing) => (l.min === l.max ? `$${l.min}M` : `$${l.min}–${l.max}M`);

export type Chapter = {
  name: string;
  sector: Listing["sector"];
  text: string;
  chips: string[];
};

export const CHAPTERS: Chapter[] = [
  { name: "Power", sector: "Power", text: "Thermal and gas-fired plants: projects looking for finance, plants for sale and equipment tenders.", chips: ["Gas", "Thermal", "Captive power"] },
  { name: "Water", sector: "Water", text: "Hydropower and water infrastructure: dams, treatment works and storage, from stakes for sale to rehabilitation tenders.", chips: ["Hydro", "Dams", "Treatment", "Storage"] },
  { name: "Grid", sector: "Grid", text: "Transmission lines, substations and transformers, from financing to procurement.", chips: ["Transmission", "Substations", "Distribution"] },
  { name: "Renewables", sector: "Renewables", text: "Solar and wind projects, mini-grids and the investors looking for them.", chips: ["Solar", "Wind", "Mini-grids", "Storage"] },
];

export function sectorStats(sector: Listing["sector"]) {
  const ls = LISTINGS.filter((l) => l.sector === sector);
  const lo = Math.min(...ls.map((l) => l.min));
  const hi = Math.max(...ls.map((l) => l.max));
  return { n: ls.length, range: `$${lo}–${hi}M`, countries: new Set(ls.map((l) => l.country)).size };
}

export const TYPES = ["All", "Investment", "EPC", "Tender", "Asset sale", "Mandate"] as const;
export const SECTORS = ["All", "Power", "Water", "Grid", "Renewables"] as const;
