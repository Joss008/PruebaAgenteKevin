"use client";

import { Card, CardContent } from "@/components/ui/card";
import { getPaymentPriority, getEstimatedMonthlyExpense, getPendingPaymentsTotal } from "@/lib/payment-utils";

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

interface PaymentStatsProps {
  payments: Payment[];
}

export function PaymentStats({ payments }: PaymentStatsProps) {
  const estimatedMonthly = getEstimatedMonthlyExpense(payments);
  const pendingTotal = getPendingPaymentsTotal(payments);

  let expiredCount = 0;
  let upcomingCount = 0;

  for (const p of payments) {
    const priority = getPaymentPriority(p);
    if (priority === "vencido") expiredCount++;
    if (priority === "por_vencer") upcomingCount++;
  }

  const stats = [
    {
      label: "Gasto mensual estimado",
      value: `S/ ${estimatedMonthly.toLocaleString()}`,
      icon: "📊",
      color: "text-foreground",
      bg: "bg-primary/5 dark:bg-primary/10",
    },
    {
      label: "Pendiente por pagar",
      value: `S/ ${pendingTotal.toLocaleString()}`,
      icon: "⏳",
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-500/10",
    },
    {
      label: "Vencidos",
      value: `${expiredCount} pago(s)`,
      icon: "🔴",
      color: "text-red-600 dark:text-red-400",
      bg: "bg-red-50 dark:bg-red-500/10",
    },
    {
      label: "Por vencer",
      value: `${upcomingCount} pago(s)`,
      icon: "🟠",
      color: "text-orange-600 dark:text-orange-400",
      bg: "bg-orange-50 dark:bg-orange-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="transition-all duration-200 hover:shadow-md hover:shadow-primary/5">
          <CardContent className="py-4 px-5">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.bg}`}>
                <span className="text-sm">{stat.icon}</span>
              </div>
            </div>
            <p className={`text-2xl font-heading font-bold ${stat.color}`}>{stat.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
