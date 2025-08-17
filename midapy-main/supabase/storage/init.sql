-- Storage rules for generations bucket
create policy "Public Access"
on storage.objects for select
using ( bucket_id = 'generations' );

create policy "Insert Access"
on storage.objects for insert
with check ( bucket_id = 'generations' );

create policy "Update Access"
on storage.objects for update
using ( bucket_id = 'generations' );
