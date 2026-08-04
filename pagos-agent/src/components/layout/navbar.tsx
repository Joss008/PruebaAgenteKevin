"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "@/components/theme-toggle";

interface NavbarProps {
  user: {
    name?: string | null;
    role?: string;
  };
}

export function Navbar({ user }: NavbarProps) {
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push("/login");
    router.refresh();
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-6xl px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <div className="relative">
              <Image
                src="/logo.png"
                alt="Pagos Agente"
                width={36}
                height={36}
                className="rounded-xl transition-transform group-hover:scale-105"
              />
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="font-heading font-bold text-lg leading-tight tracking-tight">
                Pagos <span className="text-primary">Agent</span>
              </span>
              <span className="text-[10px] text-muted-foreground tracking-widest uppercase font-medium">
                Tus pagos bajo control
              </span>
            </div>
          </Link>
          <div className="hidden sm:flex gap-1">
            {user?.role === "admin" && (
              <Link
                href="/dashboard/admin"
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <div className="flex items-center gap-2.5 rounded-full bg-muted/50 pl-1 pr-3 py-1 transition-colors hover:bg-muted">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {user?.name?.charAt(0).toUpperCase() || "?"}
            </div>
            <span className="text-sm font-medium hidden sm:inline">{user?.name}</span>
          </div>
          <button
            onClick={handleSignOut}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            Salir
          </button>
        </div>
      </div>
    </nav>
  );
}
