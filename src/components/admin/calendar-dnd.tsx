"use client";

import { useState, useTransition, type ReactNode } from "react";

// Glisser-déposer du calendrier (2026-09-18, publications réseaux) : une
// publication déplacée sur un autre jour garde son heure. Glisser-déposer
// HTML natif — souris uniquement ; sur téléphone la date se change depuis
// la fiche.

const DRAG_TYPE = "application/x-calendar-item";

export function CalendarDraggable({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, id);
        event.dataTransfer.effectAllowed = "move";
      }}
      className="cursor-grab active:cursor-grabbing"
    >
      {children}
    </div>
  );
}

export function CalendarDropZone({
  day,
  onMove,
  className,
  children,
}: {
  /** "AAAA-MM-JJ". */
  day: string;
  onMove: (id: string, day: string) => Promise<{ error?: string }>;
  className: string;
  children: ReactNode;
}) {
  const [over, setOver] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes(DRAG_TYPE)) return;
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const id = event.dataTransfer.getData(DRAG_TYPE);
        if (!id) return;
        startTransition(async () => {
          const result = await onMove(id, day);
          if (result.error) window.alert(result.error);
        });
      }}
      className={`${className} ${over ? "bg-accent/10 ring-2 ring-accent" : ""} ${pending ? "opacity-60" : ""}`}
    >
      {children}
    </div>
  );
}
