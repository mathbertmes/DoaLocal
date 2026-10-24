import { Suspense } from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { obterUsuarioAtual } from "@/lib/supabase/usuario-atual";
import { sair } from "../(auth)/actions";

export const metadata: Metadata = { title: "Meu perfil | DoaLocal" };

export default function PerfilPage() {
  return (
    <section className="mx-auto w-full max-w-sm flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Meu perfil</h1>
      <Suspense fallback={<div className="h-40 rounded-lg bg-zinc-100" aria-hidden />}>
        <DadosPerfil />
      </Suspense>
    </section>
  );
}

// Rota protegida: o proxy já redireciona visitantes, e a página confere de novo.
async function DadosPerfil() {
  const usuario = await obterUsuarioAtual();
  if (!usuario) redirect("/login?next=/perfil");

  return (
    <>
      <dl className="rounded-lg border border-zinc-200 bg-white p-4 flex flex-col gap-3">
        <div>
          <dt className="text-sm text-zinc-500">Nome</dt>
          <dd className="font-medium">{usuario.nome}</dd>
        </div>
        <div>
          <dt className="text-sm text-zinc-500">E-mail (não é exibido a outros usuários)</dt>
          <dd className="font-medium">{usuario.email}</dd>
        </div>
      </dl>
      <form action={sair}>
        <button
          type="submit"
          className="h-10 w-full rounded-md border border-zinc-300 bg-white font-medium hover:bg-zinc-100"
        >
          Sair
        </button>
      </form>
    </>
  );
}
