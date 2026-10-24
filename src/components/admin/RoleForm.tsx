"use client";

import { useKeptForm } from "@/components/admin/useKeptForm";
import { setRole } from "@/app/admin/(app)/users/actions";
import { Result } from "./ui";

export function RoleForm({ id, role, label, ready }: { id: string; role: string; label: string; ready: boolean }) {
  const [state, action, pending] = useKeptForm(setRole, {});
  return (
    <form onSubmit={action} className="a-row">
      <input type="hidden" name="id" value={id} />
      <select name="role" defaultValue={role} className="a-select" aria-label={`Role for ${label}`} style={{ width: 130 }}>
        <option value="pending">Pending</option>
        <option value="viewer" disabled={!ready && role !== "viewer"}>
          Viewer
        </option>
        <option value="editor" disabled={!ready && role !== "editor"}>
          Editor
        </option>
        <option value="owner" disabled={!ready && role !== "owner"}>
          Owner
        </option>
      </select>
      <button className="a-btn sm" disabled={pending}>
        Save
      </button>
      <Result state={state} />
    </form>
  );
}
