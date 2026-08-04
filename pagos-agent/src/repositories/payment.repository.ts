import { connectDB } from "@/lib/db";
import Payment from "@/models/Payment";
import type { PaymentFrequency } from "@/models/Payment";

export async function findPaymentsByUser(userId: string) {
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

export async function findUpcomingPayments(daysBefore: number = 3) {
  await connectDB();
  return Payment.find({ status: { $ne: "pausado" } })
    .populate("userId", "email name")
    .lean();
}

export async function findAllPayments() {
  await connectDB();
  return Payment.find().lean();
}

export async function updatePaymentStatus(id: string, status: string) {
  await connectDB();
  return Payment.updateOne({ _id: id }, { status });
}
