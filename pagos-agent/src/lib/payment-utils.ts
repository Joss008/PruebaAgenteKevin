import type { PaymentFrequency } from "@/models/Payment";

export const FREQ_INTERVAL: Record<Exclude<PaymentFrequency, "personalizado">, number> = {
  diario: 1,
  semanal: 7,
  quincenal: 15,
  mensual: 30,
};

export function getIntervalDays(frequency: PaymentFrequency, intervalDays?: number): number {
  if (frequency === "personalizado") return intervalDays && intervalDays > 0 ? intervalDays : 30;
  return FREQ_INTERVAL[frequency] ?? 30;
}

export function describeFrequency(frequency: PaymentFrequency, intervalDays?: number, dueDay?: number): string {
  switch (frequency) {
    case "diario":
      return "cada día";
    case "semanal":
      return "cada semana";
    case "quincenal":
      return "cada 15 días";
    case "personalizado":
      return `cada ${intervalDays ?? "?"} días`;
    case "mensual":
    default:
      return dueDay ? `cada mes (día ${dueDay})` : "cada mes";
  }
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function monthlyDue(year: number, month: number, dueDay: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(dueDay, lastDay));
}

export interface PaymentDueInfo {
  frequency?: PaymentFrequency;
  intervalDays?: number;
  dueDay?: number;
  startDate?: Date;
  lastPaidAt?: Date | null;
  createdAt?: Date;
}

export function computeNextDueDate(payment: PaymentDueInfo | null | undefined): Date | null {
  if (!payment) return null;
  const today = startOfDay(new Date());

  if (payment.frequency === "mensual" || (!payment.frequency && payment.dueDay)) {
    const dueDay = payment.dueDay || today.getDate();
    let next = monthlyDue(today.getFullYear(), today.getMonth(), dueDay);
    if (next < today) next = monthlyDue(today.getFullYear(), today.getMonth() + 1, dueDay);
    return next;
  }

  const interval = getIntervalDays(payment.frequency ?? "mensual", payment.intervalDays);
  
  const base = payment.startDate
    ? new Date(payment.startDate)
    : payment.lastPaidAt
      ? new Date(payment.lastPaidAt)
      : payment.createdAt
        ? new Date(payment.createdAt)
        : today;

  const copy = new Date(base);
  copy.setDate(copy.getDate() + interval);
  return startOfDay(copy);
}

export type PaymentPriority = "vencido" | "por_vencer" | "activo" | "pagado" | "pausado";

const PRIORITY_ORDER: Record<PaymentPriority, number> = {
  vencido: 0,
  por_vencer: 1,
  activo: 2,
  pagado: 3,
  pausado: 4,
};

export function getPaymentPriority(
  payment: { status: string; dueDay?: number; frequency?: PaymentFrequency; intervalDays?: number; startDate?: Date | string; lastPaidAt?: Date | string | null; createdAt?: Date | string }
): PaymentPriority {
  if (payment.status === "pagado") return "pagado";
  if (payment.status === "pausado") return "pausado";
  if (payment.status !== "activo") return "activo";

  const next = computeNextDueDate({
    frequency: payment.frequency,
    intervalDays: payment.intervalDays,
    dueDay: payment.dueDay,
    startDate: payment.startDate ? new Date(payment.startDate) : undefined,
    lastPaidAt: payment.lastPaidAt ? new Date(payment.lastPaidAt) : null,
    createdAt: payment.createdAt ? new Date(payment.createdAt) : undefined,
  });

  if (!next) return "activo";

  const today = startOfDay(new Date());
  const diffMs = next.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "vencido";
  if (diffDays <= 3) return "por_vencer";
  return "activo";
}

export function getPaymentDisplayStatus(
  payment: { status: string; dueDay?: number; frequency?: PaymentFrequency; intervalDays?: number; startDate?: Date | string; lastPaidAt?: Date | string | null; createdAt?: Date | string }
): string {
  const priority = getPaymentPriority(payment);
  const labels: Record<PaymentPriority, string> = {
    vencido: "Vencido",
    por_vencer: "Por vencer",
    activo: "Activo",
    pagado: "Pagado",
    pausado: "Pausado",
  };
  return labels[priority];
}

export function sortPaymentsByPriority<T extends { status: string; dueDay?: number; frequency?: PaymentFrequency; intervalDays?: number; startDate?: Date | string; lastPaidAt?: Date | string | null; createdAt?: Date | string }>(
  payments: T[]
): T[] {
  return [...payments].sort((a, b) => {
    const pa = PRIORITY_ORDER[getPaymentPriority(a)];
    const pb = PRIORITY_ORDER[getPaymentPriority(b)];
    return pa - pb;
  });
}

type PaymentInput = {
  amount: number;
  frequency?: PaymentFrequency;
  intervalDays?: number;
  dueDay?: number;
  startDate?: Date | string;
  status: string;
};

/**
 * Cuenta las ocurrencias reales de un pago dentro del mes actual
 * utilizando el calendario real (no aproximaciones).
 *
 * - Diario: días del mes desde startDate hasta fin de mes.
 * - Semanal: ocurrencias cada 7 días desde startDate dentro del mes.
 * - Quincenal: ocurrencias cada 15 días desde startDate dentro del mes.
 * - Mensual: 1 ocurrencia por mes (dueDay).
 * - Personalizado: ocurrencias cada intervalDays desde startDate dentro del mes.
 */
export function countOccurrencesInMonth(payment: {
  frequency?: PaymentFrequency;
  intervalDays?: number;
  dueDay?: number;
  startDate?: Date | string;
}): number {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month, lastDayOfMonth, 23, 59, 59, 999);

  const frequency = payment.frequency ?? "mensual";

  if (frequency === "mensual") {
    return payment.dueDay && payment.dueDay <= lastDayOfMonth ? 1 : 0;
  }

  const rawStart = payment.startDate ? new Date(payment.startDate) : null;
  if (!rawStart) return 0;

  const start = startOfDay(rawStart);

  if (start > monthEnd) return 0;

  let interval: number;
  switch (frequency) {
    case "diario":
      interval = 1;
      break;
    case "semanal":
      interval = 7;
      break;
    case "quincenal":
      interval = 15;
      break;
    case "personalizado":
      interval = payment.intervalDays && payment.intervalDays > 0 ? payment.intervalDays : 30;
      break;
    default:
      return 0;
  }

  if (frequency === "diario") {
    const effectiveStart = start < monthStart ? monthStart : start;
    const daysRemaining = lastDayOfMonth - effectiveStart.getDate() + 1;
    return daysRemaining > 0 ? daysRemaining : 0;
  }

  let count = 0;
  const current = new Date(start);

  while (current <= monthEnd) {
    if (current >= monthStart && current <= monthEnd) {
      count++;
    }
    current.setDate(current.getDate() + interval);
  }

  return count;
}

/**
 * Gasto mensual estimado: todos los pagos recurrentes excepto pausados.
 * Incluye activo, pagado, por vencer y vencido.
 * Usa ocurrencias reales del calendario, no aproximaciones.
 */
export function getEstimatedMonthlyExpense(payments: PaymentInput[]): number {
  return payments
    .filter((p) => p.status !== "pausado")
    .reduce((sum, p) => {
      const occurrences = countOccurrencesInMonth(p);
      return sum + p.amount * occurrences;
    }, 0);
}

/**
 * Pendiente por pagar: solo pagos que aun no se han pagado en el ciclo actual.
 * Incluye activo, por vencer y vencido.
 * Excluye pagado y pausado.
 * Usa ocurrencias reales del calendario.
 */
export function getPendingPaymentsTotal(payments: PaymentInput[]): number {
  return payments
    .filter((p) => {
      if (p.status === "pagado" || p.status === "pausado") return false;
      const priority = getPaymentPriority(p);
      return priority === "activo" || priority === "por_vencer" || priority === "vencido";
    })
    .reduce((sum, p) => {
      const occurrences = countOccurrencesInMonth(p);
      return sum + p.amount * occurrences;
    }, 0);
}
