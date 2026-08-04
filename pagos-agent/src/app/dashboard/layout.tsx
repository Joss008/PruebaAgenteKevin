import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ChatWidget } from "@/components/chat-widget";
import { ThemeToggle } from "@/components/theme-toggle";

async function Navbar() {
  const session = await auth();

  return (
    <nav className="border-b border-border bg-background px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image src="/logo.png" alt="Pagos Agente" width={40} height={40} className="rounded-lg" />
          <div className="flex flex-col">
            <span className="font-bold text-lg leading-tight">
              Pagos <span className="text-[#10b981]">Agente</span>
            </span>
            <span className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Tu agente, tus pagos al día
            </span>
          </div>
        </Link>
        <div className="flex gap-4">
          {session?.user && (session.user as any).role === "admin" && (
            <Link href="/dashboard/admin" className="text-sm text-muted-foreground hover:text-foreground">
              Admin
            </Link>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#10b981] text-xs font-bold text-white">
            {session?.user?.name?.charAt(0).toUpperCase() || "?"}
          </div>
          <span className="text-sm font-medium">{session?.user?.name}</span>
        </div>
        <form action="/api/auth/signout" method="POST">
          <button
            type="submit"
            className="rounded-lg bg-destructive px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-destructive/80"
          >
            Salir
          </button>
        </form>
      </div>
    </nav>
  );
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-animated" />
      <Navbar />
      <main className="mx-auto max-w-5xl p-6">{children}</main>
      <ChatWidget />
    </div>
  );
}