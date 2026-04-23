// Client-safe acquisition stage constants. No server imports.

export const ACQUISITION_STAGES = [
  { key: "analyzing",  label: "Analizando",             color: "#F59E0B", bg: "#FEF3C7" },
  { key: "authorized", label: "Autorizado",             color: "#10B981", bg: "#D1FAE5" },
  { key: "canceled",   label: "Cancelado",              color: "#6B7280", bg: "#F3F4F6" },
  { key: "signing",    label: "En firma",               color: "#3B82F6", bg: "#DBEAFE" },
  { key: "signed",     label: "Firmado / Adquirido",    color: "#0E2A35", bg: "#D1D5DB" },
] as const;

export type AcquisitionStage = (typeof ACQUISITION_STAGES)[number]["key"];
