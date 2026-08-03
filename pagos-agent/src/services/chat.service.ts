import { createPayment, getPaymentsByUser, updatePayment } from "./payment.service";

interface ChatResult {
  message: string;
  action?: {
    type: "created" | "listed" | "updated" | "help";
    data?: any;
  };
}

const HELP_TEXT = `¡Hola! Soy tu agente de pagos. Puedo ayudarte con:

• **Registrar un pago**: "agregar pago Netflix 250 día 15"
• **Ver tus pagos**: "mis pagos" o "qué pagos tengo"
• **Marcar como pagado**: "ya pagué Netflix"
• **Pausar un pago**: "pausar Netflix"
• **Ayuda**: "ayuda"

¿En qué te puedo ayudar?`;

export async function processMessage(message: string, userId: string): Promise<ChatResult> {
  const msg = message.toLowerCase().trim();

  // Ayuda
  if (msg.includes("ayuda") || msg.includes("help") || msg === "?") {
    return { message: HELP_TEXT, action: { type: "help" } };
  }

  // Registrar pago: "agregar pago Netflix 250 día 15"
  const addMatch = msg.match(
    /(?:agregar|añadir|crear|nuevo|registrar)\s+(?:pago\s+)?(.+?)\s+(\d+)\s+(?:día|dia|el|del)\s+(\d+)/
  );
  if (addMatch) {
    const title = addMatch[1].charAt(0).toUpperCase() + addMatch[1].slice(1);
    const amount = parseFloat(addMatch[2]);
    const dueDay = parseInt(addMatch[3]);

    if (isNaN(amount) || isNaN(dueDay) || dueDay < 1 || dueDay > 31) {
      return { message: "No pude entender los datos. Usa: agregar pago [nombre] [monto] día [número]" };
    }

    const payment = await createPayment({ userId, title, amount, dueDay });
    return {
      message: `✅ Pago registrado: **${title}** por $${amount} el día ${dueDay} de cada mes.`,
      action: { type: "created", data: payment },
    };
  }

  // Marcar como pagado: "ya pagué Netflix"
  const paidMatch = msg.match(/(?:ya pagué|pagué|marcar pagado)\s+(.+)/);
  if (paidMatch) {
    const title = paidMatch[1].trim();
    const payments = await getPaymentsByUser(userId);
    const match = payments.find((p) => p.title.toLowerCase().includes(title));

    if (!match) {
      return { message: `No encontré un pago llamado "${title}". ¿Está bien escrito?` };
    }

    await updatePayment(match._id.toString(), userId, {
      status: "pagado",
      lastPaidAt: new Date(),
    });

    return {
      message: `✅ **${match.title}** marcado como pagado.`,
      action: { type: "updated", data: { id: match._id, status: "pagado" } },
    };
  }

  // Pausar pago: "pausar Netflix"
  const pauseMatch = msg.match(/(?:pausar|suspender)\s+(.+)/);
  if (pauseMatch) {
    const title = pauseMatch[1].trim();
    const payments = await getPaymentsByUser(userId);
    const match = payments.find((p) => p.title.toLowerCase().includes(title));

    if (!match) {
      return { message: `No encontré un pago llamado "${title}".` };
    }

    await updatePayment(match._id.toString(), userId, { status: "pausado" });

    return {
      message: `⏸️ **${match.title}** pausado.`,
      action: { type: "updated", data: { id: match._id, status: "pausado" } },
    };
  }

  // Consultar pagos: "mis pagos", "qué pagos tengo"
  if (msg.includes("pago") || msg.includes("pagos") || msg.includes("debo")) {
    const payments = await getPaymentsByUser(userId);

    if (payments.length === 0) {
      return { message: "No tienes pagos registrados. Puedes agregar uno con: agregar pago [nombre] [monto] día [número]" };
    }

    const list = payments
      .map((p) => `- **${p.title}**: $${p.amount} (día ${p.dueDay}) — ${p.status}`)
      .join("\n");

    return {
      message: `Tus pagos:\n\n${list}`,
      action: { type: "listed", data: payments },
    };
  }

  return {
    message: "No entendí eso. Escribe **ayuda** para ver qué puedo hacer.",
  };
}