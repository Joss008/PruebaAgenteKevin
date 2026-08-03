import { NextResponse } from "next/server";
import { getUpcomingPayments } from "@/services/payment.service";
import { sendReminderEmail } from "@/lib/email";

export async function GET() {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = (await new Request("http://localhost").headers).get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const payments = await getUpcomingPayments(3);

    // Group by user
    const byUser = new Map<string, { email: string; name: string; payments: any[] }>();
    for (const p of payments) {
      const userId = p.userId._id.toString();
      if (!byUser.has(userId)) {
        byUser.set(userId, {
          email: p.userId.email,
          name: p.userId.name,
          payments: [],
        });
      }
      byUser.get(userId)!.payments.push(p);
    }

    let sent = 0;
    for (const [, userData] of byUser) {
      await sendReminderEmail(userData.email, userData.name, userData.payments);
      sent++;
    }

    return NextResponse.json({ sent, total: payments.length });
  } catch (error) {
    console.error("Error en cron de recordatorios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}