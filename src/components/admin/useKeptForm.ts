"use client";

import { startTransition, useActionState, useState, type FormEvent } from "react";
import { useSavedVersion } from "./SavedVersion";

type Result = { ok?: string; error?: string };

/**
 * Form submission for the admin.
 *
 * - Submits through onSubmit, so React doesn't reset the fields to the values
 *   the page first loaded with (that made saves look reverted).
 * - Inside <SavedVersion>, a successful save rebuilds the form from what the
 *   database now holds, and the "Saved" message carries over to the rebuilt form.
 * - A failed save leaves your edits on screen, marked as not saved, with a
 *   "Discard changes" option that goes back to the saved values.
 * The pressed button's name/value (e.g. intent=publish) is still sent.
 */
export function useKeptForm<S>(action: (state: Awaited<S>, form: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const saved = useSavedVersion();
  const [start] = useState<Awaited<S>>(() => {
    const f = saved?.flash.current as Awaited<S> | null | undefined;
    if (saved) saved.flash.current = null;
    return f ?? initial;
  });
  const [state, dispatch, pending] = useActionState(async (prev: Awaited<S>, form: FormData) => {
    const next = await action(prev, form);
    const r = next as Result | undefined;
    if (saved && r && r.ok && !r.error) saved.flash.current = next; // shown again after the form is rebuilt
    return next;
  }, start);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(data));
  };
  return [state, onSubmit, pending, saved?.discard] as const;
}
