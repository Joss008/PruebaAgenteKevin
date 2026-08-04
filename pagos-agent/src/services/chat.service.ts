import { createPayment, getPaymentsByUser, updatePayment, describeFrequency } from "./payment.service";
import { getPaymentDisplayStatus, getPaymentPriority, computeNextDueDate } from "@/lib/payment-utils";

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

  if (msg.includes("ayuda") || msg.includes("help") || msg === "?") {
    return { message: HELP_TEXT, action: { type: "help" } };
  }

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
      message: `✅ Pago registrado: **${formattedTitle}** por S/ ${amount} — ${describeFrequency(
        payment.frequency,
        payment.intervalDays,
        payment.dueDay
      )}.`,
      action: { type: "created", data: payment },
    };
  }

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

  if (msg.includes("pago") || msg.includes("pagos") || msg.includes("debo")) {
    const allPayments = await getPaymentsByUser(userId);

    if (allPayments.length === 0) {
      return {
        message:
          "No tienes pagos registrados. Puedes agregar uno con: agregar pago [nombre] [monto] cada [periodo]",
      };
    }

    const pendingPayments = allPayments.filter((p) => {
      if (p.status === "pagado" || p.status === "pausado") return false;
      const priority = getPaymentPriority(p);
      return priority === "vencido" || priority === "por_vencer" || priority === "activo";
    });

    if (pendingPayments.length === 0) {
      return {
        message: "No tienes pagos pendientes. Todos tus pagos estan al dia.",
        action: { type: "listed", data: [] },
      };
    }

    const priorityEmoji: Record<string, string> = {
      vencido: "🔴",
      por_vencer: "🟠",
      activo: "🟢",
    };

    const list = pendingPayments
      .map((p) => {
        const priority = getPaymentPriority(p);
        const emoji = priorityEmoji[priority] || "";
        const displayStatus = getPaymentDisplayStatus(p);
        const nextDue = computeNextDueDate({
          frequency: p.frequency,
          intervalDays: p.intervalDays,
          dueDay: p.dueDay,
          startDate: p.startDate ? new Date(p.startDate) : undefined,
          lastPaidAt: p.lastPaidAt ? new Date(p.lastPaidAt) : null,
          createdAt: p.createdAt ? new Date(p.createdAt) : undefined,
        });

        let dueInfo = "";
        if (nextDue) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const diffMs = nextDue.getTime() - today.getTime();
          const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          if (diffDays === 0) dueInfo = " — vence hoy";
          else if (diffDays === 1) dueInfo = " — vence manana";
          else if (diffDays > 0) dueInfo = ` — vence en ${diffDays} dias`;
          else dueInfo = ` — vencido hace ${Math.abs(diffDays)} dias`;
        }

        return `${emoji} *${p.title}*: S/ ${p.amount} (${describeFrequency(p.frequency, p.intervalDays, p.dueDay)}) — ${displayStatus}${dueInfo}`;
      })
      .join("\n");

    return {
      message: `Tus pagos pendientes:\n\n${list}`,
      action: { type: "listed", data: pendingPayments },
    };
  }

  return {
    message: "No entendí eso. Escribe **ayuda** para ver qué puedo hacer.",
  };
}
