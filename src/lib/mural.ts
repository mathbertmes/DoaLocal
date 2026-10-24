// Regras do mural de doações (RF04, RF05). Funções puras, testadas em
// tests/unidade/mural.test.mjs. O import relativo com ".ts" permite que os
// testes rodem direto no Node, sem etapa de build.
import { CATEGORIAS, type Categoria } from "./validacao/anuncio.ts";

export type FiltrosMural = {
  busca: string;
  categoria: Categoria | "";
  bairro: string;
};

type Parametros = Record<string, string | string[] | undefined>;

const primeiro = (valor: string | string[] | undefined) =>
  (Array.isArray(valor) ? valor[0] : valor) ?? "";

// Lê os filtros da URL (?q=&categoria=&bairro=) ignorando valores inválidos,
// para que um link adulterado nunca quebre a consulta.
export function lerFiltros(parametros: Parametros): FiltrosMural {
  const categoria = primeiro(parametros.categoria);
  return {
    busca: primeiro(parametros.q).trim().slice(0, 100),
    categoria: CATEGORIAS.some((c) => c.valor === categoria) ? (categoria as Categoria) : "",
    bairro: primeiro(parametros.bairro).trim().slice(0, 80),
  };
}

// A busca usa ILIKE; % e _ digitados pelo usuário viram caracteres comuns.
export function escaparCuringas(texto: string): string {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function padraoBusca(busca: string): string {
  return `%${escaparCuringas(busca)}%`;
}

// Lista de bairros para o filtro: sem repetição, ignorando maiúsculas e
// espaços, em ordem alfabética (pt-BR).
export function bairrosDisponiveis(bairros: string[]): string[] {
  const unicos = new Map<string, string>();
  for (const bairro of bairros) {
    const limpo = bairro.trim();
    const chave = limpo.toLocaleLowerCase("pt-BR");
    if (limpo && !unicos.has(chave)) unicos.set(chave, limpo);
  }
  return [...unicos.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

export function rotuloCategoria(valor: string): string {
  return CATEGORIAS.find((c) => c.valor === valor)?.rotulo ?? valor;
}
