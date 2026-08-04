import { NextResponse } from "next/server";
import { getUpcomingPayments, resetCyclePayments, describeFrequency } from "@/services/payment.service";
import type { PaymentFrequency } from "@/models/Payment";
import { sendEmail } from "@/services/email.service";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const payments = await getUpcomingPayments(3);

    const byUser = new Map<
      string,
      {
        email: string;
        name: string;
        payments: Array<{
          title: string;
          amount: number;
          frequency?: string;
          intervalDays?: number;
          dueDay?: number;
        }>;
      }
    >();
    for (const p of payments) {
      const user = p.userId as unknown as { _id: { toString(): string }; email: string; name: string };
      const uid = user._id.toString();
      if (!byUser.has(uid)) {
        byUser.set(uid, {
          email: user.email,
          name: user.name,
          payments: [],
        });
      }
      byUser.get(uid)!.payments.push(p);
    }

    let sent = 0;
    for (const [, userData] of byUser) {
      const paymentList = userData.payments
        .map((p) => `<li>${p.title}: S/ ${p.amount} (${describeFrequency((p.frequency ?? "mensual") as PaymentFrequency, p.intervalDays, p.dueDay)})</li>`)
        .join("");

      await sendEmail(
        userData.email,
        `Recordatorio: tienes ${userData.payments.length} pago(s) próximo(s)`,
        `<p>Hola ${userData.name},</p><p>Tienes los siguientes pagos próximos a vencer:</p><ul>${paymentList}</ul><p>Saludos,<br/>Pagos Agent</p>`
      );
      sent++;
    }

    const resetCount = await resetCyclePayments();

    return NextResponse.json({ sent, total: payments.length, resetCount });
  } catch (error) {
    console.error("Error en cron de recordatorios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
