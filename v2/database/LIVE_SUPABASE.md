# HUNT 2.0 — Live Supabase migrations

The production beta database is managed in Supabase project **Hunt 2**.

Applied migrations:

1. `hunt2_core_schema`
   - global market tables
   - user/profile tables
   - matching/dossier/application tables
   - RLS and Data API grants

2. `hunt2_private_cv_storage`
   - private `cvs` Storage bucket
   - 8 MB upload limit
   - PDF/DOC/DOCX allowlist
   - per-user Storage RLS policies

3. `hunt2_security_and_fk_indexes`
   - explicit client denial on engine-only tables
   - foreign-key covering indexes
   - Security Advisor clean after application

## Security rules

- Every table in `public` has RLS enabled.
- Internal engine tables are not granted to authenticated clients.
- User-owned tables use `auth.uid() = user_id` policies.
- CV files live only in private Storage under `<user-id>/...`.
- Publishable keys may be used in browser code.
- Secret/service-role keys must never be committed or exposed to the browser.

## Verification

After the migrations:
- 18 public tables exist
- RLS is enabled on all 18
- private `cvs` bucket exists
- Supabase Security Advisor reports zero security lints

The generated frontend database types are stored at:
`v2/web/lib/database.types.ts` on the web branch.
