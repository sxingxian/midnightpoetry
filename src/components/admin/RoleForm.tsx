"use client";

import { useActionState } from "react";
import { setRole } from "@/app/admin/(app)/users/actions";
import { Result } from "./ui";

export function RoleForm({ id, role, label }: { id: string; role: string; label: string }) {
  const [state, action, pending] = useActionState(setRole, {});
  return (
    <form action={action} className="a-row">
      <input type="hidden" name="id" value={id} />
      <select name="role" defaultValue={role} className="a-select" aria-label={`Role for ${label}`} style={{ width: 130 }}>
        <option value="pending">Pending</option>
        <option value="viewer">Viewer</option>
        <option value="editor">Editor</option>
        <option value="owner">Owner</option>
      </select>
      <button className="a-btn sm" disabled={pending}>
        Save
      </button>
      <Result state={state} />
    </form>
  );
}
