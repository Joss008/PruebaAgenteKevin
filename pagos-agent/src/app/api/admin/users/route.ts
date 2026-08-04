import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Payment from "@/models/Payment";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await connectDB();

  const users = await User.find().lean();
  const payments = await Payment.find().lean();

  const usersWithPayments = users.map((u) => ({
    id: u._id.toString(),
    name: u.name,
    email: u.email,
    role: u.role,
    createdAt: u.createdAt,
    payments: payments
      .filter((p) => p.userId.toString() === u._id.toString())
      .map((p) => ({
        title: p.title,
        amount: p.amount,
        frequency: p.frequency,
        intervalDays: p.intervalDays,
        dueDay: p.dueDay,
        status: p.status,
      })),
  }));

  return NextResponse.json(usersWithPayments);
}