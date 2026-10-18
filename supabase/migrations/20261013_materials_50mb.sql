-- O limite global do Storage também deve permitir pelo menos 50 MiB.
-- Preserva privacidade, MIME types e policies do bucket existente.
update storage.buckets
set file_size_limit = 52428800
where id = 'materials';
