"use server";

import { auth } from "@/services/auth.service";
import * as paymentService from "@/services/payment.service";
import type { PaymentFrequency } from "@/models/Payment";

export async function getPayments() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }
  return paymentService.getPaymentsByUser(session.user.id);
}

export async function createPaymentAction(data: {
  title: string;
  amount: number;
  frequency: PaymentFrequency;
  intervalDays?: number;
  dueDay?: number;
  startDate: string;
}) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  return paymentService.createPayment({
    userId: session.user.id,
    ...data,
    startDate: new Date(data.startDate),
  });
}

export async function updatePaymentStatusAction(id: string, status: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  return paymentService.updatePayment(id, session.user.id, { status });
}

export async function deletePaymentAction(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("No autorizado");
  }

  return paymentService.deletePayment(id, session.user.id);
}
