import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail(to: string, subject: string, html: string) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    console.error("Error enviando email:", error);
    throw error;
  }
}

interface PaymentEmailData {
  title: string;
  amount: number;
}

export function buildProximoAVencerHtml(userName: string, payments: PaymentEmailData[]): string {
  const list = payments.map((p) => `<li>${p.title}: S/ ${p.amount}</li>`).join("");
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style color="#e67e22;">Recordatorio de pago proximo a vencer</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Tienes los siguientes pagos proximos a vencer:</p>
      <ul style="background: #fdf2e9; padding: 15px 20px; border-radius: 8px;">${list}</ul>
      <p style="color: #666;">Recuerda realizar tu pago a tiempo para evitar inconvenientes.</p>
      <p>Saludos,<br/><strong>Pagos Agent</strong></p>
    </div>`;
}

export function buildVenceHoyHtml(userName: string, payments: PaymentEmailData[]): string {
  const list = payments.map((p) => `<li>${p.title}: S/ ${p.amount}</li>`).join("");
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #e74c3c;">Ultimo dia de pago</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Hoy es el ultimo dia para realizar el pago de:</p>
      <ul style="background: #fdedec; padding: 15px 20px; border-radius: 8px;">${list}</ul>
      <p style="color: #e74c3c;"><strong>No olvides realizar tu pago hoy.</strong></p>
      <p>Saludos,<br/><strong>Pagos Agent</strong></p>
    </div>`;
}

export function buildVencidoHtml(userName: string, payments: PaymentEmailData[]): string {
  const list = payments.map((p) => `<li>${p.title}: S/ ${p.amount}</li>`).join("");
  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #c0392b;">Olvidaste pagar</h2>
      <p>Hola <strong>${userName}</strong>,</p>
      <p>Se te olvido realizar el pago de:</p>
      <ul style="background: #f9ebea; padding: 15px 20px; border-radius: 8px;">${list}</ul>
      <p style="color: #c0392b;"><strong>Por favor regulariza tu pago lo antes posible.</strong></p>
      <p>Saludos,<br/><strong>Pagos Agent</strong></p>
    </div>`;
}
