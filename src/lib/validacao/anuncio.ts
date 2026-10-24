// Validações do anúncio de doação (RF03, RN03).
// Funções puras, usadas no formulário (antes do envio das fotos), na Server
// Action e nos testes unitários (npm run test:unidade). Os limites espelham
// as restrições da tabela anuncios e do bucket de fotos.

export const CATEGORIAS = [
  { valor: "MOVEIS", rotulo: "Móveis" },
  { valor: "ELETRODOMESTICOS", rotulo: "Eletrodomésticos" },
  { valor: "VESTUARIO", rotulo: "Vestuário" },
  { valor: "UTILIDADES_DOMESTICAS", rotulo: "Utilidades domésticas" },
  { valor: "OUTROS", rotulo: "Outros" },
] as const;

export type Categoria = (typeof CATEGORIAS)[number]["valor"];

// RN03: de 1 a 5 fotos JPG, PNG ou WebP de até 5 MB cada.
export const FOTOS_MINIMO = 1;
export const FOTOS_MAXIMO = 5;
export const FOTO_TAMANHO_MAXIMO = 5 * 1024 * 1024;
export const FOTO_TIPOS = ["image/jpeg", "image/png", "image/webp"];

export type DadosAnuncio = {
  titulo: string;
  descricao: string;
  categoria: string;
  bairro: string;
  cidade: string;
};

export type ErrosAnuncio = Partial<Record<keyof DadosAnuncio | "fotos", string>>;

function entre(texto: string, minimo: number, maximo: number) {
  const tamanho = texto.trim().length;
  return tamanho >= minimo && tamanho <= maximo;
}

export function validarAnuncio(dados: DadosAnuncio): ErrosAnuncio {
  const erros: ErrosAnuncio = {};

  if (!entre(dados.titulo, 3, 100)) {
    erros.titulo = "Informe um título entre 3 e 100 caracteres.";
  }
  if (!entre(dados.descricao, 10, 2000)) {
    erros.descricao = "Descreva o item com 10 a 2000 caracteres.";
  }
  if (!CATEGORIAS.some((c) => c.valor === dados.categoria)) {
    erros.categoria = "Escolha uma categoria.";
  }
  if (!entre(dados.bairro, 2, 80)) {
    erros.bairro = "Informe o bairro.";
  }
  if (!entre(dados.cidade, 2, 80)) {
    erros.cidade = "Informe a cidade.";
  }

  return erros;
}

// Recebe só o tipo e o tamanho, para funcionar tanto com File (navegador)
// quanto com objetos simples nos testes.
export function validarFotos(fotos: { type: string; size: number }[]): string | undefined {
  if (fotos.length < FOTOS_MINIMO || fotos.length > FOTOS_MAXIMO) {
    return `Envie de ${FOTOS_MINIMO} a ${FOTOS_MAXIMO} fotos.`;
  }
  if (fotos.some((f) => !FOTO_TIPOS.includes(f.type))) {
    return "As fotos devem estar em JPG, PNG ou WebP.";
  }
  if (fotos.some((f) => f.size > FOTO_TAMANHO_MAXIMO)) {
    return "Cada foto deve ter no máximo 5 MB.";
  }
  return undefined;
}

// As fotos chegam à Server Action como caminhos no Storage. Só são aceitos
// caminhos da pasta do próprio doador, para que ninguém anexe fotos de outro.
export function caminhosDeFotosValidos(caminhos: string[], usuarioId: string): boolean {
  return (
    caminhos.length >= FOTOS_MINIMO &&
    caminhos.length <= FOTOS_MAXIMO &&
    caminhos.every((c) => c.startsWith(`${usuarioId}/`) && !c.includes(".."))
  );
}
