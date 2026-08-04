import { NextResponse } from "next/server";
import { auth } from "@/services/auth.service";
import { findAllUsers } from "@/repositories/user.repository";
import { findAllPayments } from "@/repositories/payment.repository";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const users = await findAllUsers();
  const payments = await findAllPayments();

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
