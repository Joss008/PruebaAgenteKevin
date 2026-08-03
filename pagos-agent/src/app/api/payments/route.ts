import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentsByUser, createPayment } from "@/services/payment.service";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const payments = await getPaymentsByUser(session.user.id);
  return NextResponse.json(payments);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { title, amount, dueDay } = await req.json();

  if (!title || !amount || !dueDay) {
    return NextResponse.json(
      { error: "title, amount y dueDay son requeridos" },
      { status: 400 }
    );
  }

  const payment = await createPayment({
    userId: session.user.id,
    title,
    amount: Number(amount),
    dueDay: Number(dueDay),
  });

  return NextResponse.json(payment, { status: 201 });
}