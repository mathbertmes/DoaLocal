"use client";

import { useState } from "react";
import Image from "next/image";

// Galeria da página de detalhes: a foto selecionada aparece grande e todas
// ficam em miniatura embaixo; tocar numa miniatura troca a foto principal.
export function GaleriaFotos({ fotos, titulo }: { fotos: string[]; titulo: string }) {
  const [selecionada, setSelecionada] = useState(0);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100">
        <Image
          src={fotos[selecionada]}
          alt={fotos.length > 1 ? `${titulo} — foto ${selecionada + 1} de ${fotos.length}` : titulo}
          fill
          sizes="(min-width: 768px) 480px, 100vw"
          className="object-cover"
          preload={selecionada === 0}
        />
      </div>

      {fotos.length > 1 && (
        <ul className="grid grid-cols-5 gap-2" aria-label="Fotos do anúncio">
          {fotos.map((foto, i) => (
            <li key={foto}>
              <button
                type="button"
                onClick={() => setSelecionada(i)}
                aria-pressed={i === selecionada}
                aria-label={`Ver foto ${i + 1} de ${fotos.length}`}
                className={`relative block aspect-square w-full overflow-hidden rounded-md bg-zinc-100 ring-offset-2 ${
                  i === selecionada ? "ring-2 ring-emerald-600" : "opacity-70 hover:opacity-100"
                }`}
              >
                <Image src={foto} alt="" fill sizes="96px" className="object-cover" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
