import { SavedVersion } from "@/components/admin/SavedVersion";
import { notFound } from "next/navigation";
import { z } from "zod";
import { atLeast, requireAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import type { Ad } from "@/lib/content/types";
import { AdForm } from "@/components/admin/AdForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit ad" };

export default async function EditAdPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string }> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, profile } = await requireAdmin("viewer", `/admin/ads/${id}`);
  const { data } = await supabase.from("ads").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const ad = data as Ad;
  return (
    <>
      <div className="a-top">
        <h1>{ad.name}</h1>
        {sp.saved ? <span className="pill ok">Created</span> : null}
      </div>
      <div className="a-section" style={{ maxWidth: 820 }}>
        <SavedVersion version={String(data.updated_at)}>
          <AdForm ad={ad} canEdit={atLeast(profile.role, "editor")} supabaseUrl={publicEnv().supabaseUrl} />
        </SavedVersion>
      </div>
    </>
  );
}
