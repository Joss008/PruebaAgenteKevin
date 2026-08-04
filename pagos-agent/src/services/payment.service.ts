import { connectDB } from "@/lib/db";
import Payment from "@/models/Payment";
import type { PaymentFrequency } from "@/models/Payment";

const FREQUENCY_INTERVAL: Record<Exclude<PaymentFrequency, "personalizado">, number> = {
  diario: 1,
  semanal: 7,
  quincenal: 15,
  mensual: 30,
};

export function getIntervalDays(frequency: PaymentFrequency, intervalDays?: number): number {
  if (frequency === "personalizado") return intervalDays && intervalDays > 0 ? intervalDays : 30;
  return FREQUENCY_INTERVAL[frequency] ?? 30;
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
  await connectDB();
  return Payment.find({ userId }).sort({ dueDay: 1, createdAt: 1 }).lean();
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
  await connectDB();
  return Payment.create(data);
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
  await connectDB();
  return Payment.findOneAndUpdate({ _id: id, userId }, data, { new: true }).lean();
}

export async function deletePayment(id: string, userId: string) {
  await connectDB();
  return Payment.findOneAndDelete({ _id: id, userId });
}

export async function getUpcomingPayments(daysBefore: number = 3) {
  await connectDB();
  const today = startOfDay(new Date());
  const windowEnd = addDays(today, daysBefore);

  const payments = await Payment.find({ status: { $ne: "pausado" } })
    .populate("userId", "email name")
    .lean();

  return payments.filter((p) => {
    const next = computeNextDueDate(p);
    return next && next <= windowEnd;
  });
}

export async function resetCyclePayments() {
  await connectDB();
  const today = startOfDay(new Date());
  const paid = await Payment.find({ status: "pagado" }).lean();

  let count = 0;
  for (const p of paid) {
    const next = computeNextDueDate(p);
    if (next && next <= today) {
      await Payment.updateOne({ _id: p._id }, { status: "activo" });
      count++;
    }
  }
  return count;
}
