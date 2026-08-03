import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendReminderEmail(
  to: string,
  name: string,
  payments: { title: string; amount: number; dueDay: number }[]
) {
  const paymentList = payments
    .map((p) => `- ${p.title}: $${p.amount} (día ${p.dueDay})`)
    .join("\n");

  const { data, error } = await resend.emails.send({
    from: "Pagos Agent <onboarding@resend.dev>",
    to,
    subject: `Recordatorio: tienes ${payments.length} pago(s) próximo(s)`,
    text: `Hola ${name},\n\nTienes los siguientes pagos próximos a vencer:\n\n${paymentList}\n\nSaludos,\nPagos Agent`,
  });

  if (error) {
    console.error("Error enviando email:", error);
  }

  return data;
}