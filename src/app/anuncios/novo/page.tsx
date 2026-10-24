import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormularioAnuncio } from "./formulario-anuncio";
import { obterUsuarioAtual } from "@/lib/supabase/usuario-atual";

export const metadata: Metadata = { title: "Anunciar doação | DoaLocal" };

export default function NovoAnuncioPage() {
  return (
    <section className="mx-auto w-full max-w-xl flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Anunciar doação</h1>
        <p className="text-sm text-zinc-600">
          Descreva o item e informe o bairro onde ele pode ser retirado. O endereço exato é
          combinado depois, pelo chat.
        </p>
      </div>
      <Suspense fallback={<div className="h-96 rounded-md bg-zinc-100" aria-hidden />}>
        <ConteudoNovoAnuncio />
      </Suspense>
    </section>
  );
}

// Rota protegida: o proxy já redireciona visitantes, e a página confere de novo.
async function ConteudoNovoAnuncio() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login?next=/anuncios/novo");

  return <FormularioAnuncio usuarioId={usuario.id} />;
}
