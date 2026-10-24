import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { urlDaFoto } from "@/lib/fotos";
import { rotuloCategoria } from "@/lib/mural";

export const metadata: Metadata = { title: "Anúncio | DoaLocal" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SITUACAO: Record<string, string> = {
  DOADO: "Este item já foi doado.",
  CANCELADO: "Este anúncio foi retirado pelo doador.",
};

export default function AnuncioPage({ params }: PageProps<"/anuncios/[id]">) {
  return (
    <section className="flex flex-col gap-4">
      <Link href="/" className="text-sm text-emerald-700 hover:underline">
        ← Voltar ao mural
      </Link>
      <Suspense fallback={<div className="h-96 rounded-lg bg-zinc-100" aria-hidden />}>
        <DetalhesAnuncio params={params} />
      </Suspense>
    </section>
  );
}

// RF05 — detalhes do anúncio. O e-mail do doador nunca é exibido (M07):
// a consulta busca só o nome no perfil público.
async function DetalhesAnuncio({ params }: Pick<PageProps<"/anuncios/[id]">, "params">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  // Leitura no momento da requisição: o cliente do Supabase usa a hora atual.
  await connection();
  const supabase = await createClient();
  // O RLS só devolve anúncios disponíveis, os do próprio doador ou aqueles
  // em que o usuário tem chat; qualquer outro caso vira 404.
  const { data: anuncio } = await supabase
    .from("anuncios")
    .select("titulo, descricao, categoria, bairro, cidade, fotos, status, publicado_em, perfis(nome)")
    .eq("id", id)
    .maybeSingle();
  if (!anuncio) notFound();

  // Sem tipos gerados do banco, o supabase-js tipa a junção como lista, mas
  // anuncios → perfis é muitos-para-um e retorna um único objeto.
  const doador = anuncio.perfis as unknown as { nome: string } | null;
  const [principal, ...demais] = anuncio.fotos as string[];
  const publicadoEm = new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(
    new Date(anuncio.publicado_em),
  );

  return (
    <article className="grid gap-6 md:grid-cols-2">
      <div className="flex flex-col gap-2">
        <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-zinc-100">
          <Image
            src={urlDaFoto(principal)}
            alt={anuncio.titulo}
            fill
            sizes="(min-width: 768px) 480px, 100vw"
            className="object-cover"
            preload
          />
        </div>
        {demais.length > 0 && (
          <ul className="grid grid-cols-4 gap-2">
            {demais.map((foto, i) => (
              <li key={foto} className="relative aspect-square overflow-hidden rounded-md bg-zinc-100">
                <a href={urlDaFoto(foto)} target="_blank" rel="noreferrer" title="Abrir foto em tamanho original">
                  <Image
                    src={urlDaFoto(foto)}
                    alt={`${anuncio.titulo} — foto ${i + 2}`}
                    fill
                    sizes="120px"
                    className="object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-4">
        {SITUACAO[anuncio.status] && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">{SITUACAO[anuncio.status]}</p>
        )}
        <div>
          <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            {rotuloCategoria(anuncio.categoria)}
          </span>
          <h1 className="text-2xl font-semibold">{anuncio.titulo}</h1>
          <p className="text-zinc-500">
            {anuncio.bairro} · {anuncio.cidade}
          </p>
        </div>
        <p className="whitespace-pre-line text-zinc-700">{anuncio.descricao}</p>
        <dl className="grid grid-cols-2 gap-3 rounded-lg border border-zinc-200 bg-white p-4 text-sm">
          <div>
            <dt className="text-zinc-500">Doador</dt>
            <dd className="font-medium">{doador?.nome ?? "Usuário"}</dd>
          </div>
          <div>
            <dt className="text-zinc-500">Publicado em</dt>
            <dd className="font-medium">{publicadoEm}</dd>
          </div>
        </dl>
        <p className="text-sm text-zinc-500">
          O contato com o doador pelo chat será disponibilizado na próxima versão.
        </p>
      </div>
    </article>
  );
}
