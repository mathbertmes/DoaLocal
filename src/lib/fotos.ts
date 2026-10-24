// Endereço público de uma foto do bucket "anuncios" (migração 0002).
// A tabela guarda só o caminho (<id do doador>/<arquivo>).
export function urlDaFoto(caminho: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/anuncios/${caminho}`;
}
