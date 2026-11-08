# HUNT 2.0 — Supabase private CV storage

Create a **private** bucket named `cvs` in Supabase Storage.

Recommended constraints:
- public: false
- max file size: 8 MB
- allowed MIME types:
  - application/pdf
  - application/msword
  - application/vnd.openxmlformats-officedocument.wordprocessingml.document

Then add RLS policies to `storage.objects`.

## Upload only into the authenticated user's own folder

```sql
create policy "users upload own cvs"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'cvs'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
);
```

## Read only own CVs

```sql
create policy "users read own cvs"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'cvs'
  and owner_id = (select auth.uid()::text)
);
```

## Delete only own CVs

```sql
create policy "users delete own cvs"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'cvs'
  and owner_id = (select auth.uid()::text)
);
```

Do not use a public bucket for CVs.
Do not store CV files in GitHub.
