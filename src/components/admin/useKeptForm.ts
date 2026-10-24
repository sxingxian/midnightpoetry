"use client";

import { startTransition, useActionState, type FormEvent } from "react";

/**
 * Like useActionState, but the form keeps what's on screen after it's sent.
 *
 * With <form action={…}>, React resets the form's fields to their initial values
 * once the action finishes — so a saved setting appeared to "revert" until the
 * page was reloaded, and a failed save wiped what had been typed. Submitting
 * through onSubmit instead leaves the fields exactly as the person left them.
 * The pressed button's name/value (e.g. intent=publish) is still included.
 */
export function useKeptForm<S>(action: (state: Awaited<S>, form: FormData) => S | Promise<S>, initial: Awaited<S>) {
  const [state, dispatch, pending] = useActionState(action, initial);
  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (pending) return;
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLElement | null;
    const data = new FormData(e.currentTarget, submitter);
    startTransition(() => dispatch(data));
  };
  return [state, onSubmit, pending] as const;
}
