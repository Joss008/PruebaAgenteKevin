import { auth } from "@/services/auth.service";
import { redirect } from "next/navigation";
import { Navbar } from "@/components/layout/navbar";
import { ChatWidget } from "@/components/chat/chat-widget";

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
      <Navbar user={session.user} />
      <main className="mx-auto max-w-5xl p-6">{children}</main>
      <ChatWidget />
    </div>
  );
}
