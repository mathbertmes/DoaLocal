import { Suspense } from "react";
import Form from "next/form";
import Image from "next/image";
import Link from "next/link";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { urlDaFoto } from "@/lib/fotos";
import {
  bairrosDisponiveis,
  escaparCuringas,
  lerFiltros,
  padraoBusca,
  rotuloCategoria,
  type FiltrosMural,
} from "@/lib/mural";
import { CATEGORIAS } from "@/lib/validacao/anuncio";

const classeCampo =
  "h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

// RF04 — mural público de doações, com busca por título e filtros por
// categoria e bairro (os filtros ficam na URL, então o link pode ser compartilhado).
export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <section className="flex flex-col gap-6">
      <Suspense>
        <AvisoPublicado searchParams={searchParams} />
      </Suspense>
      <div>
        <h1 className="text-2xl font-semibold">Mural de doações</h1>
        <p className="text-zinc-600">
          Conectamos quem quer doar a quem precisa, na sua comunidade e sem custo.
        </p>
      </div>
      <Suspense fallback={<EsqueletoMural />}>
        <Mural searchParams={searchParams} />
      </Suspense>
    </section>
  );
}

// Confirmação exibida após publicar um anúncio (RF03).
async function AvisoPublicado({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { publicado } = await searchParams;
  if (publicado !== "1") return null;

  return (
    <p role="status" className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
      Anúncio publicado! Ele já está disponível no mural.
    </p>
  );
}

async function Mural({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const filtros = lerFiltros(await searchParams);
  // O cliente do Supabase consulta a hora atual (validade da sessão), então a
  // leitura acontece no momento da requisição (Cache Components).
  await connection();
  const supabase = await createClient();

  // RN02: o mural mostra apenas anúncios disponíveis. O filtro é explícito
  // porque o RLS também libera ao doador os próprios anúncios doados/cancelados.
  let consulta = supabase
    .from("anuncios")
    .select("id, titulo, categoria, bairro, cidade, fotos")
    .eq("status", "DISPONIVEL")
    .order("publicado_em", { ascending: false })
    .limit(60);
  if (filtros.busca) consulta = consulta.ilike("titulo", padraoBusca(filtros.busca));
  if (filtros.categoria) consulta = consulta.eq("categoria", filtros.categoria);
  if (filtros.bairro) consulta = consulta.ilike("bairro", escaparCuringas(filtros.bairro));

  const [{ data: anuncios, error }, { data: bairros }] = await Promise.all([
    consulta,
    supabase.from("anuncios").select("bairro").eq("status", "DISPONIVEL"),
  ]);

  const filtrando = Boolean(filtros.busca || filtros.categoria || filtros.bairro);

  return (
    <>
      <FiltrosDoMural filtros={filtros} bairros={bairrosDisponiveis((bairros ?? []).map((b) => b.bairro))} />

      {error ? (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          Não foi possível carregar o mural. Tente novamente em instantes.
        </p>
      ) : anuncios.length === 0 ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
          {filtrando ? (
            <>
              Nenhum item encontrado com esses filtros.{" "}
              <Link href="/" className="font-medium text-emerald-700 hover:underline">
                Limpar filtros
              </Link>
            </>
          ) : (
            "Ainda não há doações disponíveis. Que tal anunciar a primeira?"
          )}
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {anuncios.map((anuncio, i) => (
            <li key={anuncio.id}>
              <Link
                href={`/anuncios/${anuncio.id}`}
                className="group flex h-full flex-col overflow-hidden rounded-lg border border-zinc-200 bg-white hover:border-emerald-600"
              >
                <div className="relative aspect-[4/3] bg-zinc-100">
                  <Image
                    src={urlDaFoto(anuncio.fotos[0])}
                    alt={anuncio.titulo}
                    fill
                    sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
                    className="object-cover"
                    preload={i === 0}
                  />
                </div>
                <div className="flex flex-col gap-1 p-3">
                  <span className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                    {rotuloCategoria(anuncio.categoria)}
                  </span>
                  <h2 className="font-medium text-zinc-900 group-hover:text-emerald-800">{anuncio.titulo}</h2>
                  <p className="text-sm text-zinc-500">
                    {anuncio.bairro} · {anuncio.cidade}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

// Formulário GET: os filtros viram parâmetros da URL (?q=&categoria=&bairro=).
function FiltrosDoMural({ filtros, bairros }: { filtros: FiltrosMural; bairros: string[] }) {
  return (
    <Form action="/" className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-3 sm:grid-cols-[1fr_auto_auto_auto]">
      <label className="sr-only" htmlFor="q">
        Buscar pelo título
      </label>
      <input
        id="q"
        name="q"
        type="search"
        defaultValue={filtros.busca}
        placeholder="Buscar pelo título (ex.: sofá, geladeira)"
        className={classeCampo}
      />
      <label className="sr-only" htmlFor="filtro-categoria">
        Categoria
      </label>
      <select id="filtro-categoria" name="categoria" defaultValue={filtros.categoria} className={classeCampo}>
        <option value="">Todas as categorias</option>
        {CATEGORIAS.map((c) => (
          <option key={c.valor} value={c.valor}>
            {c.rotulo}
          </option>
        ))}
      </select>
      <label className="sr-only" htmlFor="filtro-bairro">
        Bairro
      </label>
      <select id="filtro-bairro" name="bairro" defaultValue={filtros.bairro} className={classeCampo}>
        <option value="">Todos os bairros</option>
        {bairros.map((b) => (
          <option key={b} value={b}>
            {b}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="h-10 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-800"
      >
        Filtrar
      </button>
    </Form>
  );
}

function EsqueletoMural() {
  return (
    <div aria-hidden className="flex flex-col gap-4">
      <div className="h-16 rounded-lg bg-zinc-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="aspect-[4/3] rounded-lg bg-zinc-100" />
        ))}
      </div>
    </div>
  );
}
