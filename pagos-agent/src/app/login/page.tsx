"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";

export default function LoginPage() {
  const router = useRouter();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (isRegister) {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        let message = "Error al registrar";
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {}
        setError(message);
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="bg-animated" />
      <div className="fixed top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md relative z-10">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Image src="/logo.png" alt="Pagos Agente" width={80} height={80} className="rounded-xl" />
          </div>
          <CardTitle className="text-2xl">
            Pagos <span className="text-[#10b981]">Agente</span>
          </CardTitle>
          <CardDescription>
            {isRegister ? "Crea tu cuenta" : "Inicia sesión en tu cuenta"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div className="space-y-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Tu nombre"
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Cargando..." : isRegister ? "Registrarse" : "Iniciar sesión"}
            </Button>
          </form>
          <div className="mt-4 text-center text-sm">
            {isRegister ? (
              <span>
                ¿Ya tienes cuenta?{" "}
                <button
                  onClick={() => { setIsRegister(false); setError(""); }}
                  className="text-primary hover:underline"
                >
                  Inicia sesión
                </button>
              </span>
            ) : (
              <span>
                ¿No tienes cuenta?{" "}
                <button
                  onClick={() => { setIsRegister(true); setError(""); }}
                  className="text-primary hover:underline"
                >
                  Regístrate
                </button>
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}