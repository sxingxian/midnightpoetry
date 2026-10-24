import { requireAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { AdForm } from "@/components/admin/AdForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New ad" };

export default async function NewAdPage() {
  await requireAdmin("editor", "/admin/ads/new");
  return (
    <>
      <div className="a-top">
        <h1>New ad</h1>
      </div>
      <div className="a-section" style={{ maxWidth: 820 }}>
        <AdForm canEdit supabaseUrl={publicEnv().supabaseUrl} />
      </div>
    </>
  );
}
