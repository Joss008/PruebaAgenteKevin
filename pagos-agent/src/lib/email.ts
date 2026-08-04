import nodemailer from "nodemailer";

// Crea un transporter reutilizable usando Gmail SMTP.
// Las credenciales se toman de las variables de entorno EMAIL_USER y EMAIL_PASS.
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envía un correo electrónico usando Nodemailer (Gmail SMTP).
 *
 * @param to - Destinatario del correo.
 * @param subject - Asunto del correo.
 * @param html - Contenido del correo en formato HTML.
 */
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
