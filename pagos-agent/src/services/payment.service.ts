import type { PaymentFrequency } from "@/models/Payment";
import * as paymentRepo from "@/repositories/payment.repository";
import { sortPaymentsByPriority } from "@/lib/payment-utils";

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

function addDays(d: Date, days: number): Date {
  const copy = new Date(d);
  copy.setDate(copy.getDate() + days);
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

  return startOfDay(addDays(base, interval));
}

export async function getPaymentsByUser(userId: string) {
  const payments = await paymentRepo.findPaymentsByUser(userId);
  return sortPaymentsByPriority(payments);
}

export async function createPayment(data: {
  userId: string;
  title: string;
  amount: number;
  frequency?: PaymentFrequency;
  intervalDays?: number;
  dueDay?: number;
  startDate: Date;
}) {
  return paymentRepo.createPayment(data);
}

export async function updatePayment(
  id: string,
  userId: string,
  data: Partial<{
    title: string;
    amount: number;
    frequency: PaymentFrequency;
    intervalDays: number;
    dueDay: number;
    startDate: Date;
    status: string;
    lastPaidAt: Date;
  }>
) {
  return paymentRepo.updatePayment(id, userId, data);
}

export async function deletePayment(id: string, userId: string) {
  return paymentRepo.deletePayment(id, userId);
}

export async function getUpcomingPayments(daysBefore: number = 3) {
  const today = startOfDay(new Date());
  const windowEnd = addDays(today, daysBefore);

  const payments = await paymentRepo.findUpcomingPayments(daysBefore);

  return payments.filter((p) => {
    const next = computeNextDueDate(p);
    return next && next <= windowEnd;
  });
}

export async function resetCyclePayments() {
  const today = startOfDay(new Date());
  const paid = await paymentRepo.findUpcomingPayments();

  let count = 0;
  for (const p of paid) {
    if (p.status !== "pagado") continue;
    const next = computeNextDueDate(p);
    if (next && next <= today) {
      await paymentRepo.updatePaymentStatus(p._id.toString(), "activo");
      count++;
    }
  }
  return count;
}
