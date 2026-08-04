import { NextResponse } from "next/server";
import { getCategorizedUpcomingPayments, resetCyclePayments } from "@/services/payment.service";
import { sendEmail, buildProximoAVencerHtml, buildVenceHoyHtml, buildVencidoHtml } from "@/services/email.service";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  try {
    const categorized = await getCategorizedUpcomingPayments();

    let sent = 0;
    let totalPayments = 0;

    for (const [, userData] of categorized) {
      const { email, name, vencido, vence_hoy, proximo_a_vencer } = userData;

      if (proximo_a_vencer.length > 0) {
        totalPayments += proximo_a_vencer.length;
        await sendEmail(
          email,
          `Recordatorio: tienes ${proximo_a_vencer.length} pago(s) proximo(s) a vencer`,
          buildProximoAVencerHtml(name, proximo_a_vencer)
        );
        sent++;
      }

      if (vence_hoy.length > 0) {
        totalPayments += vence_hoy.length;
        await sendEmail(
          email,
          `Urgente: hoy vencen ${vence_hoy.length} pago(s)`,
          buildVenceHoyHtml(name, vence_hoy)
        );
        sent++;
      }

      if (vencido.length > 0) {
        totalPayments += vencido.length;
        await sendEmail(
          email,
          `Alerta: olvidaste pagar ${vencido.length} pago(s)`,
          buildVencidoHtml(name, vencido)
        );
        sent++;
      }
    }

    const resetCount = await resetCyclePayments();

    return NextResponse.json({ sent, total: totalPayments, resetCount });
  } catch (error) {
    console.error("Error en cron de recordatorios:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
