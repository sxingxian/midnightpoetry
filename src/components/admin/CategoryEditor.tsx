"use client";

import { useActionState } from "react";
import { deleteCategory, saveCategory } from "@/app/admin/(app)/products/actions";
import type { Category } from "@/lib/content/types";
import { Result } from "./ui";

function Row({ c, canEdit }: { c: Category; canEdit: boolean }) {
  const [state, save, saving] = useActionState(saveCategory, {});
  const [delState, del, deleting] = useActionState(deleteCategory, {});
  return (
    <li style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <form action={save} className="a-row" style={{ flexWrap: "wrap" }}>
        <input type="hidden" name="id" value={c.id} />
        <input type="hidden" name="product_id" value={c.product_id} />
        <input aria-label="Category name" name="name" className="a-input" defaultValue={c.name} style={{ flex: "1 1 160px", width: "auto" }} disabled={!canEdit} />
        <input aria-label="Category short name" name="slug" className="a-input mono" defaultValue={c.slug} style={{ flex: "1 1 120px", width: "auto" }} disabled={!canEdit} />
        <input aria-label="Order" name="sort_order" type="number" className="a-input" defaultValue={c.sort_order} style={{ width: 80 }} disabled={!canEdit} />
        {canEdit ? (
          <button className="a-btn sm" disabled={saving}>
            Save
          </button>
        ) : null}
      </form>
      {canEdit ? (
        <form action={del}>
          <input type="hidden" name="id" value={c.id} />
          <button className="a-btn sm danger" disabled={deleting}>
            Remove
          </button>
        </form>
      ) : null}
      <Result state={state.error ? state : delState} />
    </li>
  );
}

export function CategoryEditor({ productId, categories, canEdit }: { productId: string; categories: Category[]; canEdit: boolean }) {
  const [state, add, adding] = useActionState(saveCategory, {});
  return (
    <section className="a-panel" aria-labelledby="cat-h" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <h2 id="cat-h" style={{ margin: 0, fontSize: 14 }}>
        Guide categories
      </h2>
      <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 12 }}>
        {categories.map((c) => (
          <Row key={c.id} c={c} canEdit={canEdit} />
        ))}
      </ul>
      {canEdit ? (
        <form action={add} className="a-row" key={state.n}>
          <input type="hidden" name="product_id" value={productId} />
          <input aria-label="New category name" name="name" className="a-input" placeholder="New category" style={{ flex: "1 1 200px", width: "auto" }} required maxLength={60} />
          <button className="a-btn sm" disabled={adding}>
            Add
          </button>
        </form>
      ) : null}
      <Result state={state} />
    </section>
  );
}
