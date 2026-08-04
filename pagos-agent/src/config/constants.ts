import type { PaymentFrequency } from "@/models/Payment";

export const FREQ_LABELS: Record<PaymentFrequency, string> = {
  diario: "Cada día",
  semanal: "Cada semana",
  quincenal: "Cada 15 días",
  mensual: "Cada mes",
  personalizado: "Personalizado",
};

export const FREQ_INTERVAL: Record<Exclude<PaymentFrequency, "personalizado">, number> = {
  diario: 1,
  semanal: 7,
  quincenal: 15,
  mensual: 30,
};

export const STATUS_COLORS: Record<string, string> = {
  activo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  pagado: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400",
  pausado: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
};

export const APP_NAME = "Pagos Agente";
export const APP_TAGLINE = "Tu agente, tus pagos al día";
export const APP_COLOR = "#10b981";
