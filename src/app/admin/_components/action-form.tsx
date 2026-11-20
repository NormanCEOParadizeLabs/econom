"use client";

import { createContext, startTransition, useActionState, useContext, useEffect, useRef, type ComponentProps, type ReactNode } from "react";
import { Button, Notice } from "@/components/ui";
import { initialState, type ActionState } from "../_lib/util";

export type AdminAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

const PendingContext = createContext(false);

/**
 * Formulaire relié à une Server Action : affiche erreurs et succès, sans vider la saisie en cas d'erreur.
 * `confirm` demande une confirmation avant l'envoi (actions sensibles).
 */
export function ActionForm({
  action, children, className, resetOnSuccess = false, confirm,
}: { action: AdminAction; children: ReactNode; className?: string; resetOnSuccess?: boolean; confirm?: string }) {
  const [state, dispatch, pending] = useActionState(action, initialState);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={ref}
      action={dispatch}
      className={className}
      aria-busy={pending}
      onSubmit={(e) => {
        // Envoi manuel : React ne réinitialise pas le formulaire, la saisie est conservée si la validation échoue.
        e.preventDefault();
        if (pending) return;
        if (confirm && !window.confirm(confirm)) return;
        const submitter = (e.nativeEvent as SubmitEvent).submitter;
        const data = new FormData(e.currentTarget, submitter);
        startTransition(() => dispatch(data));
      }}
    >
      <PendingContext.Provider value={pending}>{children}</PendingContext.Provider>
      <div aria-live="polite">
        {!pending && state.at !== undefined && !state.ok && (
          <Notice tone="danger" title={state.message ?? "L'action a échoué."} className="mt-3">
            {state.errors && state.errors.length > 0 && (
              <ul className="list-disc pl-5">
                {state.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
          </Notice>
        )}
        {!pending && state.ok && state.message && <Notice tone="success" className="mt-3">{state.message}</Notice>}
      </div>
    </form>
  );
}

export function SubmitButton({ children, ...props }: ComponentProps<typeof Button>) {
  const pending = useContext(PendingContext);
  return (
    <Button type="submit" size="sm" {...props} disabled={pending || props.disabled}>
      {children}
    </Button>
  );
}
