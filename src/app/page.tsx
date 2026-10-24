import { Suspense } from "react";

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <section className="flex flex-col gap-3">
      <Suspense>
        <AvisoPublicado searchParams={searchParams} />
      </Suspense>
      <h1 className="text-2xl font-semibold">Mural de doações</h1>
      <p className="text-zinc-600">
        Conectamos quem quer doar a quem precisa, na sua comunidade e sem custo.
      </p>
      <p className="text-sm text-zinc-500">O mural de anúncios será disponibilizado na Sprint 2.</p>
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
