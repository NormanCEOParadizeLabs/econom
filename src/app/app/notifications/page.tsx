import type { Metadata } from "next";
import Link from "next/link";
import { markNotificationsRead } from "@/app/app/actions";
import { Button, EmptyState, PageTitle, cx } from "@/components/ui";
import { IconBell } from "@/components/icons";
import { requireUser } from "@/lib/auth";
import { dateFr } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Notifications" };

export default async function Page() {
  await requireUser();
  const supabase = await supabaseServer();
  const { data } = await supabase.from("notifications").select("id, title, body, link, read_at, created_at").order("created_at", { ascending: false }).limit(50);
  const unread = (data ?? []).some((n) => !n.read_at);
  return (
    <>
      <PageTitle title="Notifications" action={unread ? <form action={markNotificationsRead}><Button type="submit" size="sm" variant="outline">Tout marquer comme lu</Button></form> : undefined} />
      {data?.length ? (
        <ul className="space-y-2">
          {data.map((n) => {
            const inner = (
              <>
                <span className="flex items-start gap-2">{!n.read_at && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand" aria-label="Non lue" />}<span className="font-bold">{n.title}</span></span>
                {n.body && <span className="mt-0.5 block text-sm text-muted">{n.body}</span>}
                <span className="mt-1 block text-xs text-muted">{dateFr(n.created_at, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</span>
              </>
            );
            const cls = cx("block rounded-[1.25rem] border p-4", n.read_at ? "border-line bg-surface" : "border-brand/40 bg-surface-2");
            return <li key={n.id}>{n.link ? <Link href={n.link} className={cx(cls, "pressable hover:border-brand")}>{inner}</Link> : <div className={cls}>{inner}</div>}</li>;
          })}
        </ul>
      ) : (
        <EmptyState icon={<IconBell />} title="Rien de neuf">Les rappels de prélèvement, les fins d&apos;engagement et les alertes apparaîtront ici.</EmptyState>
      )}
    </>
  );
}
