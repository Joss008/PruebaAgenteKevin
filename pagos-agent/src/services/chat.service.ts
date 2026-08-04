import { createPayment, getPaymentsByUser, updatePayment, describeFrequency } from "./payment.service";

interface ChatResult {
  message: string;
  action?: {
    type: "created" | "listed" | "updated" | "help";
    data?: unknown;
  };
}

const HELP_TEXT = `¡Hola! Soy tu agente de pagos. Puedo ayudarte con:

• **Registrar un pago**:
  - "agregar pago Netflix 250 día 15" (cada mes)
  - "agregar pago Internet 300 cada semana"
  - "agregar pago Agua 200 cada 15 días"
  - "agregar pago Renta 100 diario"
  - "agregar pago Gimnasio 50 cada 20 días"
• **Ver tus pagos**: "mis pagos" o "qué pagos tengo"
• **Marcar como pagado**: "ya pagué Netflix"
• **Pausar un pago**: "pausar Netflix"
• **Ayuda**: "ayuda"

¿En qué te puedo ayudar?`;

function parseRecurrence(text: string): {
  frequency: "diario" | "semanal" | "quincenal" | "mensual" | "personalizado";
  dueDay?: number;
  intervalDays?: number;
} {
  const lower = text.toLowerCase();

  const customMatch = lower.match(/cada\s+(\d+)\s*(?:día|dias|días|dia)?/);
  if (customMatch) {
    const n = parseInt(customMatch[1]);
    if (n === 1) return { frequency: "diario" };
    if (n === 7) return { frequency: "semanal" };
    if (n === 15) return { frequency: "quincenal" };
    if (n === 30) return { frequency: "mensual" };
    return { frequency: "personalizado", intervalDays: n };
  }

  if (/\bsemanal\b|cada semana|semana/.test(lower)) return { frequency: "semanal" };
  if (/quincen|cada quince|quince días/.test(lower)) return { frequency: "quincenal" };
  if (/\bdiario\b|cada día|cada dia|diariamente/.test(lower)) return { frequency: "diario" };
  if (/\bmensual\b|cada mes|mensualmente/.test(lower)) return { frequency: "mensual" };

  const dayMatch = lower.match(/(?:día|dia|del)\s+(\d+)/);
  if (dayMatch) {
    const d = parseInt(dayMatch[1]);
    if (d >= 1 && d <= 31) return { frequency: "mensual", dueDay: d };
  }

  return { frequency: "mensual" };
}

export async function processMessage(message: string, userId: string): Promise<ChatResult> {
  const msg = message.toLowerCase().trim();

  // Ayuda
  if (msg.includes("ayuda") || msg.includes("help") || msg === "?") {
    return { message: HELP_TEXT, action: { type: "help" } };
  }

  // Registrar pago: "agregar pago Netflix 250 día 15" / "cada semana" / "cada 15 días"
  const addMatch = msg.match(
    /(?:agregar|añadir|crear|nuevo|registrar)\s+(?:pago\s+)?(.+?)\s+(\d+)\s+(.+)/
  );
  if (addMatch) {
    const title = addMatch[1].trim();
    const amount = parseFloat(addMatch[2]);
    const recurrence = parseRecurrence(addMatch[3]);

    if (!title || isNaN(amount) || amount <= 0) {
      return {
        message:
          "No pude entender los datos. Usa: agregar pago [nombre] [monto] cada [periodo] (ej. cada semana, cada 15 días, día 15)",
      };
    }

    if (recurrence.frequency === "mensual" && !recurrence.dueDay) {
      return {
        message: "Para pagos mensuales indica el día: agregar pago Netflix 250 día 15",
      };
    }

    const formattedTitle = title.charAt(0).toUpperCase() + title.slice(1);

    const payment = await createPayment({
      userId,
      title: formattedTitle,
      amount,
      frequency: recurrence.frequency,
      intervalDays: recurrence.intervalDays,
      dueDay: recurrence.dueDay,
      startDate: new Date(),
    });

    return {
      message: `✅ Pago registrado: **${formattedTitle}** por $${amount} — ${describeFrequency(
        payment.frequency,
        payment.intervalDays,
        payment.dueDay
      )}.`,
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
      return {
        message:
          "No tienes pagos registrados. Puedes agregar uno con: agregar pago [nombre] [monto] cada [periodo]",
      };
    }

    const list = payments
      .map(
        (p) =>
          `- **${p.title}**: $${p.amount} (${describeFrequency(p.frequency, p.intervalDays, p.dueDay)}) — ${p.status}`
      )
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