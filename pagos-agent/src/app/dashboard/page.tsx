"use client";

import { useEffect, useState } from "react";
import { PaymentForm } from "@/components/forms/payment-form";
import { PaymentList } from "@/components/payments/payment-list";
import { PaymentStats } from "@/components/payments/payment-stats";

type Frequency = "diario" | "semanal" | "quincenal" | "mensual" | "personalizado";

interface Payment {
  _id: string;
  title: string;
  amount: number;
  frequency: Frequency;
  intervalDays?: number;
  dueDay?: number;
  startDate: string;
  status: "activo" | "pagado" | "pausado";
  lastPaidAt: string | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);

  const fetchPayments = async () => {
    const res = await fetch("/api/payments");
    const data = await res.json();
    setPayments(data);
  };

  useEffect(() => {
    let active = true;
    fetch("/api/payments")
      .then((res) => res.json())
      .then((data) => {
        if (active) setPayments(data);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleStatusChange = async (id: string, status: string) => {
    await fetch(`/api/payments/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchPayments();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/payments/${id}`, { method: "DELETE" });
    fetchPayments();
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight">Mis Pagos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gestiona tus pagos recurrentes</p>
        </div>
        <PaymentForm onCreated={fetchPayments} />
      </div>

      <PaymentStats payments={payments} />
      <PaymentList payments={payments} onStatusChange={handleStatusChange} onDelete={handleDelete} />
    </div>
  );
}
