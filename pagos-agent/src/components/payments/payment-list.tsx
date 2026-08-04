"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { describeFrequency, computeNextDueDate, getPaymentDisplayStatus, getPaymentPriority, sortPaymentsByPriority } from "@/lib/payment-utils";

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

const statusColors: Record<string, string> = {
  activo: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
  pagado: "bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-400 dark:border-sky-500/20",
  pausado: "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
  vencido: "bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20",
  por_vencer: "bg-orange-50 text-orange-700 border border-orange-200 dark:bg-orange-500/10 dark:text-orange-400 dark:border-orange-500/20",
};

const priorityIcons: Record<string, string> = {
  vencido: "🔴",
  por_vencer: "🟠",
  activo: "🟢",
  pagado: "🔵",
  pausado: "⚪",
};

function describeFreq(p: Payment): string {
  return describeFrequency(p.frequency, p.intervalDays, p.dueDay);
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-PE", { day: "numeric", month: "short", year: "numeric" });
}

function nextDueDate(p: Payment): Date | null {
  return computeNextDueDate({
    frequency: p.frequency,
    intervalDays: p.intervalDays,
    dueDay: p.dueDay,
    startDate: new Date(p.startDate),
    lastPaidAt: p.lastPaidAt ? new Date(p.lastPaidAt) : null,
    createdAt: new Date(p.createdAt),
  });
}

interface PaymentListProps {
  payments: Payment[];
  onStatusChange: (id: string, status: string) => void;
  onDelete: (id: string) => void;
}

export function PaymentList({ payments, onStatusChange, onDelete }: PaymentListProps) {
  if (payments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <span className="text-2xl">📄</span>
          </div>
          <p className="text-muted-foreground font-medium">No tienes pagos registrados</p>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Haz clic en &quot;+ Nuevo pago&quot; para comenzar
          </p>
        </CardContent>
      </Card>
    );
  }

  const sorted = sortPaymentsByPriority(payments);

  return (
    <div className="space-y-3">
      {sorted.map((p) => {
        const priority = getPaymentPriority(p);
        const displayStatus = getPaymentDisplayStatus(p);
        const badgeColor = statusColors[priority] ?? statusColors.activo;
        const icon = priorityIcons[priority] ?? "🟢";

        return (
          <Card
            key={p._id}
            className="transition-all duration-200 hover:shadow-md hover:shadow-primary/5 hover:border-primary/20 dark:hover:shadow-primary/10"
          >
            <CardContent className="flex items-center justify-between py-4 px-5">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/50 text-lg">
                  {icon}
                </div>
                <div className="space-y-0.5">
                  <p className="font-heading font-semibold text-foreground">{p.title}</p>
                  <p className="text-sm text-muted-foreground">
                    S/ {p.amount.toLocaleString()} · {describeFreq(p)}
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Inicio: {formatDate(p.startDate)} · Próximo: {nextDueDate(p) ? formatDate(nextDueDate(p)!) : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={badgeColor}>{displayStatus}</Badge>
                <div className="flex gap-1.5">
                  {p.status === "activo" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(p._id, "pagado")}
                      className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/10"
                    >
                      Pagado
                    </Button>
                  )}
                  {p.status === "activo" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(p._id, "pausado")}
                      className="text-amber-600 border-amber-200 hover:bg-amber-50 hover:text-amber-700 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/10"
                    >
                      Pausar
                    </Button>
                  )}
                  {p.status === "pausado" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onStatusChange(p._id, "activo")}
                      className="text-primary border-primary/20 hover:bg-primary/5"
                    >
                      Reactivar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={() => onDelete(p._id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
