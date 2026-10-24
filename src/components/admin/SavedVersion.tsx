"use client";

import { Fragment, createContext, useContext, useRef, useState, type MutableRefObject, type ReactNode } from "react";

type Ctx = { discard: () => void; flash: MutableRefObject<unknown> };
const SavedVersionContext = createContext<Ctx | null>(null);

/**
 * Shows a form exactly as it is saved in the database.
 *
 * `version` comes from the saved record (its updated_at). After a successful save
 * the page is refreshed from the database, the version changes and the form is
 * rebuilt from the saved values — so what you see is what was stored (trimmed,
 * normalised, and nothing that the save didn't keep). "Discard changes" rebuilds
 * it from the saved values too.
 */
export function SavedVersion({ version, children }: { version: string; children: ReactNode }) {
  const [round, setRound] = useState(0);
  const flash = useRef<unknown>(null);
  return (
    <SavedVersionContext.Provider value={{ discard: () => setRound((r) => r + 1), flash }}>
      <Fragment key={`${version}#${round}`}>{children}</Fragment>
    </SavedVersionContext.Provider>
  );
}

export function useSavedVersion() {
  return useContext(SavedVersionContext);
}
