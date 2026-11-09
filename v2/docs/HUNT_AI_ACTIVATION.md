# HUNT — Activating contextual AI writing

## Current state
The HUNT AI capability endpoint is deployed at `hunt-ai-status`. It currently returns `enabled: false`, because the production Edge Function secret `OPENAI_API_KEY` is absent.

HUNT has a real AI-backed flow, not a browser prompt template:
- `hunt-letter-polish`: `mode: "generate"` writes a human-sounding letter from the verified account CV, original vacancy text and candidate preferences; `mode: "revise"` edits the current draft according to the candidate's instructions.
- Previous letters modified by the candidate can be used as **tone-only** examples; they cannot supply factual claims for a different vacancy.
- The generated letter replaces only the unsaved browser editor text. The user must explicitly save it, and can restore the previous version.
- It refuses CVs not confirmed by the user, requires authenticated access and checks user ownership of the selected CV and dossier.
- OpenAI requests use `store:false`; no API token is exposed to browsers, saved to the repository or pasted into chat.
- An internal server-only usage table limits the writer to 20 generate/revise requests per user per rolling 24-hour window.

## Admin activation
1. Sign into https://platform.openai.com/api-keys, create a project API key and ensure your API organisation has available usage credits or billing.
2. Open the Supabase dashboard for the HUNT project (`dfiokxjfgqoboxckcuut`), then **Edge Functions → Secrets**.
3. Add secret **Name:** `OPENAI_API_KEY` and **Value:** the private API key, and save. **Do not share the value in ChatGPT or put it in app.js/GitHub.**
4. The deployed functions read new environment secrets immediately. In the app, check that the AI status changes from "AI da attivare" to available.
5. Test against one confirmed CV and one verified job, checking factual evidence, natural voice and that pressing Save is required to persist the result.
6. Monitor API usage and set provider-level project spending limits before public rollout.

Optional: set `HUNT_WRITER_MODEL` to a permitted Responses API model. The default is `gpt-4.1` and must be available in the API organization.

## Not yet validated
Because the key is not configured, **actual language model generation has not been end-to-end tested**. The front-end, secure APIs and deployment are installed, but that does not prove output quality until production authentication and a real API call are verified.

This feature does not inherit API credits automatically from an ordinary ChatGPT subscription.
