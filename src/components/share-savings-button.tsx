"use client";
import { useState } from "react";
import { SavingsCardStudio, type CardData } from "@/components/savings-card";
import { Button } from "@/components/ui";
import { IconShare } from "@/components/icons";

export function ShareSavingsButton({ data, label = "Créer ma carte", variant = "accent" as "accent" | "outline" | "light", shareText }: { data: CardData; label?: string; variant?: "accent" | "outline" | "light"; shareText?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}><IconShare width={18} height={18} /> {label}</Button>
      {open && <SavingsCardStudio data={data} onClose={() => setOpen(false)} shareText={shareText} />}
    </>
  );
}
