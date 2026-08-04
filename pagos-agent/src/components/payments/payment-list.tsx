"use client";

import { useState, useRef, useEffect } from "react";
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

const priorityDotColors: Record<string, string> = {
  vencido: "bg-red-500",
  por_vencer: "bg-orange-500",
  activo: "bg-emerald-500",
  pagado: "bg-sky-500",
  pausado: "bg-amber-500",
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
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (payments.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
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
    <div className="space-y-3" ref={menuRef}>
      {sorted.map((p) => {
        const priority = getPaymentPriority(p);
        const displayStatus = getPaymentDisplayStatus(p);
        const badgeColor = statusColors[priority] ?? statusColors.activo;
        const dotColor = priorityDotColors[priority] ?? "bg-emerald-500";
        const isOpen = openMenuId === p._id;

        return (
          <Card
            key={p._id}
            className="transition-all duration-200 hover:shadow-md hover:shadow-primary/5 hover:border-primary/20 dark:hover:shadow-primary/10 relative overflow-visible"
          >
            <CardContent className="py-4 px-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className={`mt-2 h-2.5 w-2.5 rounded-full shrink-0 ${dotColor}`}></div>
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-heading font-semibold text-foreground truncate">{p.title}</p>
                      <Badge className={`${badgeColor} text-xs whitespace-nowrap`}>{displayStatus}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      S/ {p.amount.toLocaleString()} · {describeFreq(p)}
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      Inicio: {formatDate(p.startDate)} · Proximo: {nextDueDate(p) ? formatDate(nextDueDate(p)!) : "—"}
                    </p>
                  </div>
                </div>

                <div className="relative shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    ref={(el) => { if (el) buttonRefs.current.set(p._id, el); }}
                    onClick={() => setOpenMenuId(isOpen ? null : p._id)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="1"></circle>
                      <circle cx="12" cy="5" r="1"></circle>
                      <circle cx="12" cy="19" r="1"></circle>
                    </svg>
                  </Button>

                  {isOpen && (
                    <div className="absolute right-0 top-full mt-1 z-[100] w-52 rounded-md border bg-popover p-1 text-popover-foreground shadow-lg max-h-[60vh] overflow-y-auto">
                      {p.status === "activo" && (
                        <>
                          <button
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => { onStatusChange(p._id, "pagado"); setOpenMenuId(null); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0">
                              <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            Marcar como pagado
                          </button>
                          <button
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
                            onClick={() => { onStatusChange(p._id, "pausado"); setOpenMenuId(null); }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-600 shrink-0">
                              <rect x="6" y="4" width="4" height="16"></rect>
                              <rect x="14" y="4" width="4" height="16"></rect>
                            </svg>
                            Pausar este pago
                          </button>
                        </>
                      )}
                      {p.status === "pausado" && (
                        <button
                          className="flex w-full items-center gap-2 rounded-sm px-2 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground"
                          onClick={() => { onStatusChange(p._id, "activo"); setOpenMenuId(null); }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary shrink-0">
                            <polygon points="5 3 19 12 5 21 5 3"></polygon>
                          </svg>
                          Reactivar este pago
                        </button>
                      )}
                      <div className="my-1 h-px bg-muted"></div>
                      <button
                        className="flex w-full items-center gap-2 rounded-sm px-2 py-2.5 text-sm text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => { onDelete(p._id); setOpenMenuId(null); }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                        Eliminar pago
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
