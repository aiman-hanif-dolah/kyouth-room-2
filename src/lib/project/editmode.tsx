import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getEditStatus, lockEdit, unlockEdit } from "../gate.functions";

interface Ctx {
  canEdit: boolean;
  ready: boolean;
  unlock: (passcode: string) => Promise<boolean>;
  lock: () => Promise<void>;
}

const g = globalThis as unknown as { __tvEditCtx?: React.Context<Ctx | null> };
const EditContext = g.__tvEditCtx ?? (g.__tvEditCtx = createContext<Ctx | null>(null));

export function EditModeProvider({ children }: { children: ReactNode }) {
  const [canEdit, setCanEdit] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    getEditStatus()
      .then((r) => setCanEdit(r.edit))
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const unlock = useCallback(async (passcode: string) => {
    try {
      const r = await unlockEdit({ data: { passcode } });
      if (r.ok) setCanEdit(true);
      return r.ok;
    } catch {
      return false;
    }
  }, []);

  const lock = useCallback(async () => {
    try {
      await lockEdit();
    } catch {
      /* still lock locally */
    }
    setCanEdit(false);
  }, []);

  const value = useMemo(() => ({ canEdit, ready, unlock, lock }), [canEdit, ready, unlock, lock]);
  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}

export function useEditMode() {
  const c = useContext(EditContext);
  if (!c) throw new Error("useEditMode must be used within EditModeProvider");
  return c;
}
