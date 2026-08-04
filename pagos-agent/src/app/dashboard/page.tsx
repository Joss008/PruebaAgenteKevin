"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

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

const FREQ_DAYS: Record<Exclude<Frequency, "personalizado">, number> = {
  diario: 1,
  semanal: 7,
  quincenal: 15,
  mensual: 30,
};

const FREQ_LABELS: Record<Frequency, string> = {
  diario: "Cada día",
  semanal: "Cada semana",
  quincenal: "Cada 15 días",
  mensual: "Cada mes",
  personalizado: "Personalizado",
};

function getIntervalDays(p: Payment): number {
  if (p.frequency === "personalizado") return p.intervalDays ?? 30;
  return FREQ_DAYS[p.frequency];
}

function describeFrequency(p: Payment): string {
  if (p.frequency === "mensual") return `Cada mes (día ${p.dueDay ?? "?"})`;
  if (p.frequency === "personalizado") return `Cada ${p.intervalDays ?? "?"} días`;
  return FREQ_LABELS[p.frequency];
}

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("es-MX", { day: "numeric", month: "short", year: "numeric" });
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function monthlyDue(year: number, month: number, dueDay: number): Date {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(dueDay, lastDay));
}

function nextDueDate(p: Payment): Date | null {
  const today = startOfDay(new Date());

  if (p.frequency === "mensual") {
    const dueDay = p.dueDay || 1;
    let next = monthlyDue(today.getFullYear(), today.getMonth(), dueDay);
    if (next < today) next = monthlyDue(today.getFullYear(), today.getMonth() + 1, dueDay);
    return next;
  }

  const base = p.lastPaidAt ? new Date(p.lastPaidAt) : new Date(p.createdAt);
  const next = new Date(base);
  next.setDate(next.getDate() + getIntervalDays(p));
  return startOfDay(next);
}

const statusColors: Record<string, string> = {
  activo: "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400",
  pagado: "bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-400",
  pausado: "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400",
};

export default function DashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<{
    title: string;
    amount: string;
    frequency: Frequency;
    dueDay: string;
    intervalDays: string;
    startDate: string;
  }>({ title: "", amount: "", frequency: "mensual", dueDay: "", intervalDays: "", startDate: "" });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();

    const body: Record<string, unknown> = {
      title: form.title,
      amount: Number(form.amount),
      frequency: form.frequency,
      startDate: form.startDate,
    };

    if (form.frequency === "mensual") body.dueDay = Number(form.dueDay);
    if (form.frequency === "personalizado") body.intervalDays = Number(form.intervalDays);

    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setForm({ title: "", amount: "", frequency: "mensual", dueDay: "", intervalDays: "", startDate: "" });
    setOpen(false);
    fetchPayments();
  };

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

  const totalMonthly = payments
    .filter((p) => p.status === "activo")
    .reduce((sum, p) => sum + p.amount * (30 / getIntervalDays(p)), 0);

  const today = startOfDay(new Date());
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + 3);
  const upcoming = payments.filter((p) => {
    if (p.status === "pausado") return false;
    const next = nextDueDate(p);
    return next && next <= windowEnd;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Pagos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger render={<Button />}>
            + Nuevo pago
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar pago recurrente</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Nombre</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Netflix, Renta, etc."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monto ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="250"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">¿Cada cuánto?</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(value: string | null) => value && setForm({ ...form, frequency: value as Frequency })}
                  items={(Object.keys(FREQ_LABELS) as Frequency[]).map((f) => ({
                    value: f,
                    label: FREQ_LABELS[f],
                  }))}
                >
                  <SelectTrigger id="frequency" className="w-full">
                    <SelectValue placeholder="Selecciona una frecuencia" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(FREQ_LABELS) as Frequency[]).map((f) => (
                      <SelectItem key={f} value={f}>
                        {FREQ_LABELS[f]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Fecha de inicio del pago</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>
              {form.frequency === "mensual" && (
                <div className="space-y-2">
                  <Label htmlFor="dueDay">Día del mes</Label>
                  <Input
                    id="dueDay"
                    type="number"
                    min={1}
                    max={31}
                    value={form.dueDay}
                    onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                    placeholder="15"
                    required
                  />
                </div>
              )}
              {form.frequency === "personalizado" && (
                <div className="space-y-2">
                  <Label htmlFor="intervalDays">Cada cuántos días</Label>
                  <Input
                    id="intervalDays"
                    type="number"
                    min={1}
                    max={365}
                    value={form.intervalDays}
                    onChange={(e) => setForm({ ...form, intervalDays: e.target.value })}
                    placeholder="Por ejemplo: 20"
                    required
                  />
                </div>
              )}
              <Button type="submit" className="w-full">Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total mensual activo (aprox.)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalMonthly.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Próximos a vencer
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{upcoming.length} pago(s)</p>
          </CardContent>
        </Card>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tienes pagos registrados. Haz clic en &quot;+ Nuevo pago&quot; para comenzar.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <Card key={p._id}>
              <CardContent className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="font-medium">{p.title}</p>
                    <p className="text-sm text-muted-foreground">
                      ${p.amount} · {describeFrequency(p)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Inicio: {formatDate(p.startDate)} · Próximo pago: {nextDueDate(p) ? formatDate(nextDueDate(p)!) : "—"}
                    </p>
                  </div>
                  <Badge className={statusColors[p.status]}>{p.status}</Badge>
                </div>
                <div className="flex gap-2">
                  {p.status === "activo" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(p._id, "pagado")}
                    >
                      Pagado
                    </Button>
                  )}
                  {p.status === "activo" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(p._id, "pausado")}
                    >
                      Pausar
                    </Button>
                  )}
                  {p.status === "pausado" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleStatusChange(p._id, "activo")}
                    >
                      Reactivar
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(p._id)}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}