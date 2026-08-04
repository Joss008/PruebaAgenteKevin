"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

type Frequency = "diario" | "semanal" | "quincenal" | "mensual" | "personalizado";

const FREQ_LABELS: Record<Frequency, string> = {
  diario: "Cada día",
  semanal: "Cada semana",
  quincenal: "Cada 15 días",
  mensual: "Cada mes",
  personalizado: "Personalizado",
};

interface PaymentFormProps {
  onCreated: () => void;
}

export function PaymentForm({ onCreated }: PaymentFormProps) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    amount: "",
    frequency: "mensual" as Frequency,
    dueDay: "",
    intervalDays: "",
    startDate: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const body: Record<string, unknown> = {
      title: form.title,
      amount: Number(form.amount),
      frequency: form.frequency,
      startDate: form.frequency === "mensual" ? new Date().toISOString() : form.startDate,
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
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        + Nuevo pago
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar pago recurrente</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <Label htmlFor="amount">Monto (S/)</Label>
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
          {form.frequency !== "mensual" && (
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
          )}
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
  );
}
