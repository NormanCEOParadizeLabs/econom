"use client";
import { Button, EmptyState } from "@/components/ui";
import { IconX } from "@/components/icons";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <EmptyState icon={<IconX />} title="Quelque chose s'est mal passé" action={<Button onClick={reset}>Réessayer</Button>}>
      Tes données sont en sécurité. Réessaie, ou reviens dans un instant.
    </EmptyState>
  );
}
