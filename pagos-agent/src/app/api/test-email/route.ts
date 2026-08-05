import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/services/email.service";

export async function GET(req: NextRequest) {
  const to = req.nextUrl.searchParams.get("to");

  if (!to) {
    return NextResponse.json({ error: "Falta el param '?to=email@ejemplo.com'" }, { status: 400 });
  }

  try {
    const result = await sendEmail(
      to,
      "Test - Pagos Agent",
      "<h1>Funciona!</h1><p>El envio de correos con Nodemailer (Gmail SMTP) esta configurado correctamente.</p>"
    );

    return NextResponse.json({
      success: true,
      messageId: (result as { messageId?: string })?.messageId,
      to,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json({
      success: false,
      error: message,
    }, { status: 500 });
  }
}
