"use client";

import { useRef, useState, useImperativeHandle, forwardRef } from "react";

export type SignatureCanvasHandle = {
  toDataUrl: () => string | null;
  clear: () => void;
};

// Dessin de signature à l'écran — canvas HTML5 natif + pointer events, sans
// dépendance externe (aucune lib de signature dans les deps du projet).
export const SignatureCanvas = forwardRef<SignatureCanvasHandle>(function SignatureCanvas(_, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const hasDrawnRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useImperativeHandle(ref, () => ({
    toDataUrl: () => {
      if (!hasDrawnRef.current || !canvasRef.current) return null;
      return canvasRef.current.toDataURL("image/png");
    },
    clear: () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasDrawnRef.current = false;
      setIsEmpty(true);
    },
  }));

  function getContext() {
    return canvasRef.current?.getContext("2d") ?? null;
  }

  function pointerPosition(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function handlePointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = getContext();
    if (!ctx) return;
    drawingRef.current = true;
    const { x, y } = pointerPosition(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  }

  function handlePointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = pointerPosition(event);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111111";
    ctx.lineTo(x, y);
    ctx.stroke();
    hasDrawnRef.current = true;
    setIsEmpty(false);
  }

  function handlePointerUp() {
    drawingRef.current = false;
  }

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = getContext();
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    hasDrawnRef.current = false;
    setIsEmpty(true);
  }

  return (
    <div>
      <canvas
        ref={canvasRef}
        width={400}
        height={140}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className="w-full touch-none rounded-xl border border-line bg-white"
      />
      {!isEmpty && (
        <button
          type="button"
          onClick={handleClear}
          className="mt-2 text-xs text-ink-muted transition-colors hover:text-ink"
        >
          Effacer
        </button>
      )}
    </div>
  );
});
