"use client";

import { Eraser } from "lucide-react";
import { useEffect, useRef, useState } from "react";

/**
 * Quadro para desenhar a assinatura com o dedo ou o mouse.
 * Grava a imagem (PNG) no campo oculto "imagem" do formulário.
 */
export function QuadroAssinatura({ nome = "imagem" }: { nome?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [imagem, setImagem] = useState("");
  const desenhando = useRef(false);

  useEffect(() => {
    const c = canvas.current!;
    const escala = window.devicePixelRatio || 1;
    c.width = c.offsetWidth * escala;
    c.height = c.offsetHeight * escala;
    const ctx = c.getContext("2d")!;
    ctx.scale(escala, escala);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#0f172a";
  }, []);

  const ponto = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const inicio = (e: React.PointerEvent) => {
    canvas.current!.setPointerCapture(e.pointerId);
    desenhando.current = true;
    const ctx = canvas.current!.getContext("2d")!;
    const p = ponto(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + 0.1, p.y + 0.1);
    ctx.stroke();
  };
  const move = (e: React.PointerEvent) => {
    if (!desenhando.current) return;
    const ctx = canvas.current!.getContext("2d")!;
    const p = ponto(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const fim = () => {
    if (!desenhando.current) return;
    desenhando.current = false;
    setImagem(canvas.current!.toDataURL("image/png"));
  };
  const limpar = () => {
    const c = canvas.current!;
    c.getContext("2d")!.clearRect(0, 0, c.width, c.height);
    setImagem("");
  };

  return (
    <div>
      <div className="relative">
        {/* Fundo sempre branco: a assinatura fica legível no tema escuro e na impressão. */}
        <canvas
          ref={canvas}
          aria-label="Quadro para desenhar a assinatura"
          className="h-36 w-full touch-none rounded-md border border-dashed border-slate-400 bg-[#fff]"
          onPointerDown={inicio}
          onPointerMove={move}
          onPointerUp={fim}
          onPointerLeave={fim}
        />
        {!imagem && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-[#94a3b8]">
            Assine aqui com o dedo ou o mouse
          </span>
        )}
      </div>
      <button type="button" onClick={limpar} className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600 hover:underline">
        <Eraser className="size-3.5" /> Limpar
      </button>
      <input type="hidden" name={nome} value={imagem} />
    </div>
  );
}
