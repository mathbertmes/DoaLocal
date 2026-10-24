-- =====================================================================
-- DoaLocal — 0002: armazenamento das fotos dos anúncios (US02)
-- Requisitos atendidos: RF03 e RN03 (1 a 5 fotos JPG, PNG ou WebP de
-- até 5 MB cada).
-- Executar no SQL Editor do Supabase, depois da 0001.
-- =====================================================================

-- Bucket público: as fotos aparecem no mural para qualquer visitante.
-- O próprio Storage recusa arquivos acima de 5 MB ou de outro formato.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('anuncios', 'anuncios', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Cada usuário envia fotos apenas para a pasta com o próprio id
-- (anuncios/<id do usuário>/<arquivo>).
create policy "fotos: usuário envia na própria pasta"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'anuncios'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

-- Permite remover as próprias fotos (ex.: publicação que falhou).
create policy "fotos: usuário remove as próprias"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'anuncios'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
