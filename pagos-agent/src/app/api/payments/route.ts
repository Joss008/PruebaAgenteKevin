import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPaymentsByUser, createPayment } from "@/services/payment.service";
import type { PaymentFrequency } from "@/models/Payment";

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

  const { title, amount, frequency = "mensual", intervalDays, dueDay, startDate } = await req.json();

  if (!title || !amount) {
    return NextResponse.json(
      { error: "title y amount son requeridos" },
      { status: 400 }
    );
  }

  if (!startDate) {
    return NextResponse.json(
      { error: "startDate es requerido" },
      { status: 400 }
    );
  }

  const validFrequencies: PaymentFrequency[] = ["diario", "semanal", "quincenal", "mensual", "personalizado"];
  if (!validFrequencies.includes(frequency)) {
    return NextResponse.json({ error: "Frecuencia inválida" }, { status: 400 });
  }

  const data: {
    userId: string;
    title: string;
    amount: number;
    frequency: PaymentFrequency;
    intervalDays?: number;
    dueDay?: number;
    startDate: Date;
  } = {
    userId: session.user.id,
    title,
    amount: Number(amount),
    frequency,
    startDate: new Date(startDate),
  };

  if (frequency === "mensual") {
    const day = Number(dueDay);
    if (!day || day < 1 || day > 31) {
      return NextResponse.json(
        { error: "dueDay (1-31) es requerido para pagos mensuales" },
        { status: 400 }
      );
    }
    data.dueDay = day;
  } else if (frequency === "personalizado") {
    const days = Number(intervalDays);
    if (!days || days < 1) {
      return NextResponse.json(
        { error: "intervalDays es requerido para frecuencia personalizada" },
        { status: 400 }
      );
    }
    data.intervalDays = days;
  }

  const payment = await createPayment(data);

  return NextResponse.json(payment, { status: 201 });
}