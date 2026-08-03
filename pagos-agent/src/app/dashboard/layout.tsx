import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";

async function Navbar() {
  const session = await auth();

  return (
    <nav className="border-b bg-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="font-bold text-lg">
          Pagos Agent
        </Link>
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-sm text-gray-600 hover:text-gray-900">
            Pagos
          </Link>
          <Link href="/dashboard/chat" className="text-sm text-gray-600 hover:text-gray-900">
            Chat
          </Link>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{session?.user?.name}</span>
        <form action="/api/auth/signout" method="POST">
          <button type="submit" className="text-sm text-red-600 hover:underline">
            Cerrar sesión
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
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="mx-auto max-w-5xl p-6">{children}</main>
    </div>
  );
}