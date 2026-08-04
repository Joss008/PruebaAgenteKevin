import { NextResponse } from "next/server";
import { auth } from "@/services/auth.service";
import { processMessage } from "@/services/chat.service";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { message } = await req.json();
  if (!message) {
    return NextResponse.json({ error: "Mensaje requerido" }, { status: 400 });
  }

  const result = await processMessage(message, session.user.id);
  return NextResponse.json(result);
}
