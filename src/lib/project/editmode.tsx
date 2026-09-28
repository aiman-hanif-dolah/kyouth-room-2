import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getEditStatus, lockEdit, unlockEdit } from "../gate.functions";

interface Ctx {
  canEdit: boolean;
  ready: boolean;
  unlock: (passcode: string) => Promise<boolean>;
  lock: () => Promise<void>;
  expire: () => void;
}

const g = globalThis as unknown as { __tvEditCtx?: React.Context<Ctx | null> };
const EditContext = g.__tvEditCtx ?? (g.__tvEditCtx = createContext<Ctx | null>(null));

const LS_KEY = "tv-edit-unlocked";

export function EditModeProvider({ children }: { children: ReactNode }) {
  // Restore from localStorage right after mount so a reload keeps Edit mode;
  // the server cookie (30 days) still gates every write.
  const [canEdit, setCanEdit] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(LS_KEY) === "1") setCanEdit(true);
    } catch {
      /* storage unavailable */
    }
    getEditStatus()
      .then((r) => {
        setCanEdit(r.edit);
        try {
          if (r.edit) window.localStorage.setItem(LS_KEY, "1");
          else window.localStorage.removeItem(LS_KEY);
        } catch {
          /* storage unavailable */
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const unlock = useCallback(async (passcode: string) => {
    try {
      const r = await unlockEdit({ data: { passcode } });
      if (r.ok) {
        setCanEdit(true);
        try {
          window.localStorage.setItem(LS_KEY, "1");
        } catch {
          /* storage unavailable */
        }
      }
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
    try {
      window.localStorage.removeItem(LS_KEY);
    } catch {
      /* storage unavailable */
    }
    setCanEdit(false);
  }, []);

  // Server said the unlock is gone (cookie missing/expired): drop to Published locally.
  const expire = useCallback(() => {
    try {
      window.localStorage.removeItem(LS_KEY);
    } catch {
      /* storage unavailable */
    }
    setCanEdit(false);
  }, []);

  const value = useMemo(() => ({ canEdit, ready, unlock, lock, expire }), [canEdit, ready, unlock, lock, expire]);
  return <EditContext.Provider value={value}>{children}</EditContext.Provider>;
}

export function useEditMode() {
  const c = useContext(EditContext);
  if (!c) throw new Error("useEditMode must be used within EditModeProvider");
  return c;
}
