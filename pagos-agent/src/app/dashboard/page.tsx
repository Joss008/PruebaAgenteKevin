"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Payment {
  _id: string;
  title: string;
  amount: number;
  dueDay: number;
  status: "activo" | "pagado" | "pausado";
  lastPaidAt: string | null;
}

const statusColors: Record<string, string> = {
  activo: "bg-green-100 text-green-800",
  pagado: "bg-blue-100 text-blue-800",
  pausado: "bg-yellow-100 text-yellow-800",
};

export default function DashboardPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", amount: "", dueDay: "" });

  const fetchPayments = async () => {
    const res = await fetch("/api/payments");
    const data = await res.json();
    setPayments(data);
  };

  useEffect(() => {
    fetchPayments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.title,
        amount: Number(form.amount),
        dueDay: Number(form.dueDay),
      }),
    });
    setForm({ title: "", amount: "", dueDay: "" });
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
    .reduce((sum, p) => sum + p.amount, 0);

  const today = new Date().getDate();
  const upcoming = payments
    .filter((p) => p.status === "activo" && p.dueDay >= today && p.dueDay <= today + 3);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mis Pagos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>+ Nuevo pago</Button>
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
              <Button type="submit" className="w-full">Guardar</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
              Total mensual activo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">${totalMonthly.toLocaleString()}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">
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
          <CardContent className="py-12 text-center text-gray-500">
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
                    <p className="text-sm text-gray-500">
                      ${p.amount} · Día {p.dueDay}
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
                    className="text-red-600"
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