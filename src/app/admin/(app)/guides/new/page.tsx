import { requireAdmin } from "@/lib/auth";
import { publicEnv } from "@/lib/env";
import { GuideEditor } from "@/components/admin/GuideEditor";
import { editorData } from "../editor-data";

export const dynamic = "force-dynamic";
export const metadata = { title: "New guide" };

export default async function NewGuidePage() {
  const { supabase, profile } = await requireAdmin("editor", "/admin/guides/new");
  const { products, categories } = await editorData(supabase);
  const env = publicEnv();
  if (!products.length)
    return (
      <div className="a-alert warn">
        Add a product first — its guides are written here.
      </div>
    );
  return <GuideEditor products={products} categories={categories} canEdit siteUrl={env.siteUrl} supabaseUrl={env.supabaseUrl} defaultAuthor={profile.display_name} />;
}
