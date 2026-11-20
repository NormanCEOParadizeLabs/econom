import type { Metadata } from "next";
import Link from "next/link";
import { BottomNav, SideNav } from "@/components/app-nav";
import { IconBell, IconChat } from "@/components/icons";
import { Symbol } from "@/components/logo";
import { isAdmin, requireUser } from "@/lib/auth";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser("/app");
  const supabase = await supabaseServer();
  const [{ count }, admin] = await Promise.all([
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", user.id).is("read_at", null),
    isAdmin(),
  ]);
  const unread = count ?? 0;
  return (
    <>
      {/* Écran de lancement : affiché à l'ouverture de l'application, puis s'efface. */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] grid place-items-center bg-[#5638F5] [animation:splash-out_.45s_ease_1.05s_forwards]">
        <div className="flex flex-col items-center gap-5">
          <Symbol className="h-28 w-28 animate-pop [--brand:#4326d9] [--accent:#D8FF55]" />
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white/20"><span className="block h-full origin-left rounded-full bg-[#D8FF55] [animation:splash-bar_.9s_ease_.1s_both]" /></span>
        </div>
      </div>
      <header className="sticky top-0 z-30 border-b border-line/70 bg-bg/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <Link href="/app" aria-label="ECONOM. — tableau de bord"><Symbol className="h-9 w-9" /></Link>
          <div className="flex items-center gap-1">
            <Link href="/app/assistant" aria-label="Assistant ECONOM." className="pressable grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2"><IconChat /></Link>
            <Link href="/app/notifications" aria-label={unread ? `Notifications : ${unread} non lue${unread > 1 ? "s" : ""}` : "Notifications"} className="pressable relative grid h-11 w-11 place-items-center rounded-full hover:bg-surface-2">
              <IconBell />
              {unread > 0 && <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-danger ring-2 ring-bg [animation:pulse-dot_1.6s_ease_infinite]" />}
            </Link>
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-8 px-4 pt-5 pb-28 lg:pb-12">
        <SideNav admin={admin} />
        <main id="contenu" className="min-w-0 flex-1 lg:max-w-2xl">{children}</main>
      </div>
      <BottomNav />
    </>
  );
}
