"use client";

import { startTransition, useActionState, useEffect, useMemo, useState, type FormEvent } from "react";
import { publicarAnuncio, type EstadoAnuncio } from "../actions";
import { Campo } from "@/components/campo";
import { createClient } from "@/lib/supabase/client";
import {
  CATEGORIAS,
  FOTO_TIPOS,
  FOTOS_MAXIMO,
  validarAnuncio,
  validarFotos,
} from "@/lib/validacao/anuncio";

const BUCKET = "anuncios";

const classeCampo =
  "rounded-md border border-zinc-300 bg-white px-3 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 aria-invalid:border-red-500";

function Erro({ id, texto }: { id: string; texto?: string }) {
  if (!texto) return null;
  return (
    <p id={id} className="text-sm text-red-600">
      {texto}
    </p>
  );
}

export function FormularioAnuncio({ usuarioId }: { usuarioId: string }) {
  const [fotos, setFotos] = useState<File[]>([]);
  const previas = useMemo(() => fotos.map((f) => URL.createObjectURL(f)), [fotos]);
  useEffect(() => () => previas.forEach((url) => URL.revokeObjectURL(url)), [previas]);

  // A ação roda no navegador: valida, envia as fotos ao Storage e só então
  // chama a Server Action com os caminhos. Se algo falhar depois do envio,
  // as fotos já enviadas são removidas para não ficarem órfãs.
  const [estado, acao, enviando] = useActionState(
    async (anterior: EstadoAnuncio, formData: FormData): Promise<EstadoAnuncio> => {
      const dados = {
        titulo: String(formData.get("titulo") ?? ""),
        descricao: String(formData.get("descricao") ?? ""),
        categoria: String(formData.get("categoria") ?? ""),
        bairro: String(formData.get("bairro") ?? ""),
        cidade: String(formData.get("cidade") ?? ""),
      };
      const erros = validarAnuncio(dados);
      const erroFotos = validarFotos(fotos);
      if (erroFotos) erros.fotos = erroFotos;
      if (Object.keys(erros).length > 0) return { erros };

      const supabase = createClient();
      const caminhos: string[] = [];
      for (const foto of fotos) {
        const extensao = foto.type.split("/")[1].replace("jpeg", "jpg");
        const caminho = `${usuarioId}/${crypto.randomUUID()}.${extensao}`;
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(caminho, foto, { contentType: foto.type });
        if (error) {
          if (caminhos.length) await supabase.storage.from(BUCKET).remove(caminhos);
          return { mensagem: "Não foi possível enviar as fotos. Tente novamente." };
        }
        caminhos.push(caminho);
      }

      formData.delete("arquivos");
      caminhos.forEach((c) => formData.append("fotos", c));
      const resultado = await publicarAnuncio(anterior, formData);

      // Só chega aqui se a publicação falhou (no sucesso há redirecionamento).
      await supabase.storage.from(BUCKET).remove(caminhos);
      return resultado;
    },
    {},
  );

  // Envio manual (sem o action do <form>) para o React não limpar os campos
  // e as fotos escolhidas quando a publicação retorna um erro.
  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formData = new FormData(evento.currentTarget);
    startTransition(() => acao(formData));
  }

  function adicionarFotos(lista: FileList | null) {
    if (!lista) return;
    setFotos((atuais) => [...atuais, ...Array.from(lista)].slice(0, FOTOS_MAXIMO));
  }

  const erros = estado.erros ?? {};

  return (
    <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
      <Campo rotulo="Título" name="titulo" maxLength={100} required erro={erros.titulo} />

      <div className="flex flex-col gap-1">
        <label htmlFor="descricao" className="text-sm font-medium text-zinc-700">
          Descrição
        </label>
        <textarea
          id="descricao"
          name="descricao"
          rows={4}
          maxLength={2000}
          required
          placeholder="Estado de conservação, medidas, detalhes para a retirada..."
          aria-invalid={erros.descricao ? true : undefined}
          aria-describedby={erros.descricao ? "descricao-erro" : undefined}
          className={`${classeCampo} py-2`}
        />
        <Erro id="descricao-erro" texto={erros.descricao} />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="categoria" className="text-sm font-medium text-zinc-700">
          Categoria
        </label>
        <select
          id="categoria"
          name="categoria"
          required
          defaultValue=""
          aria-invalid={erros.categoria ? true : undefined}
          aria-describedby={erros.categoria ? "categoria-erro" : undefined}
          className={`${classeCampo} h-10`}
        >
          <option value="" disabled>
            Selecione...
          </option>
          {CATEGORIAS.map((c) => (
            <option key={c.valor} value={c.valor}>
              {c.rotulo}
            </option>
          ))}
        </select>
        <Erro id="categoria-erro" texto={erros.categoria} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Campo rotulo="Bairro" name="bairro" maxLength={80} required erro={erros.bairro} />
        <Campo rotulo="Cidade" name="cidade" maxLength={80} required erro={erros.cidade} />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="text-sm font-medium text-zinc-700">
          Fotos ({fotos.length}/{FOTOS_MAXIMO}) — JPG, PNG ou WebP, até 5 MB cada
        </legend>

        {fotos.length > 0 && (
          <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5">
            {fotos.map((foto, i) => (
              <li key={previas[i]} className="relative aspect-square overflow-hidden rounded-md border border-zinc-200 bg-zinc-100">
                {/* Prévia local (blob:) antes do envio; não passa pelo otimizador de imagens. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previas[i]} alt={`Foto ${i + 1}: ${foto.name}`} className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setFotos((atuais) => atuais.filter((_, j) => j !== i))}
                  className="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs font-medium text-zinc-700 hover:bg-white"
                  aria-label={`Remover foto ${i + 1}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}

        {fotos.length < FOTOS_MAXIMO && (
          <label className="flex h-20 cursor-pointer items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white text-sm text-zinc-600 hover:border-emerald-600 hover:text-emerald-700">
            Adicionar fotos
            <input
              type="file"
              name="arquivos"
              accept={FOTO_TIPOS.join(",")}
              multiple
              className="sr-only"
              aria-describedby={erros.fotos ? "fotos-erro" : undefined}
              onChange={(e) => {
                adicionarFotos(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
        <Erro id="fotos-erro" texto={erros.fotos} />
      </fieldset>

      {estado.mensagem && (
        <p aria-live="polite" className="rounded-md bg-zinc-100 px-3 py-2 text-sm text-zinc-700">
          {estado.mensagem}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="h-10 rounded-md bg-emerald-700 font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
      >
        {enviando ? "Publicando..." : "Publicar anúncio"}
      </button>
    </form>
  );
}
