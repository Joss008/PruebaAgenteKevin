import { connectDB } from "@/lib/db";
import Payment from "@/models/Payment";

export async function getPaymentsByUser(userId: string) {
  await connectDB();
  return Payment.find({ userId }).sort({ dueDay: 1 }).lean();
}

export async function createPayment(data: {
  userId: string;
  title: string;
  amount: number;
  dueDay: number;
}) {
  await connectDB();
  return Payment.create(data);
}

export async function updatePayment(
  id: string,
  userId: string,
  data: Partial<{ title: string; amount: number; dueDay: number; status: string }>
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
  const today = new Date();
  const currentDay = today.getDate();

  const targetDays: number[] = [];
  for (let i = 0; i <= daysBefore; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    targetDays.push(d.getDate());
  }

  return Payment.find({
    status: "activo",
    dueDay: { $in: targetDays },
  })
    .populate("userId", "email name")
    .lean();
}