import { requireAdmin } from "@/lib/auth";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdmin("editor", "/admin/products/new");
  return (
    <>
      <div className="a-top">
        <h1>New product</h1>
      </div>
      <div className="a-section">
        <ProductForm canEdit />
      </div>
    </>
  );
}
