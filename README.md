# AccessHub AI · Team IronSkull

**Unified accessibility workspace** for reading, documents, speech, communication, form guidance, and user-controlled task assistance.

- **Production**: https://accesshub-ai-frontend.vercel.app/
- **Frontend**: React 19 + Vite + Lucide
- **Backend**: Supabase Auth, PostgreSQL (RLS), private Storage, Deno Edge Functions
- **AI**: Gemini 3.5 Flash-Lite (default, configurable via `GEMINI_MODEL`)
- **Security**: authenticated sessions, user-isolated RLS, explicit AI consent, server-side API secrets.

## Setup
In Vercel or `.env.local` set:
```env
VITE_SUPABASE_URL=https://eoagdssuvjzlsslriovv.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_PUBLISHABLE_KEY
```
Never put `GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` or `sb_secret_...` in the frontend.
In Supabase **Edge Functions → Secrets**, set `GEMINI_API_KEY`, optionally `GEMINI_MODEL`.

```bash
npm install
npm run build
npm run dev
```
Vercel deploys automatically when main changes. The repository includes a Vite build workflow.

## Dashboard modules (current implementation)
| Module | Features live | Limitations / planned |
|---|---|---|
| Home | Task input, microphone input when supported, quick actions, navigation, responsive layout | Favourites are currently fixed shortcuts |
| AI Assistant | Authenticated Gemini requests, cloud-consent checkbox, readable responses | Source references are not synthesized without evidence |
| Reading Workspace | Original text, assisted transform, TTS, font/spacing/speed controls, find, save/export | Side-by-side and word highlighting planned |
| Documents & Images | Private upload/download/delete, text preview, OCR/description via consented Gemini, saved AI results | AI file limit 10 MB; storage limit 25 MB; PDF page navigator planned |
| Audio & Captions | Media transcription via Gemini; live browser recognition; editable/searchable saved transcript, text export | Timestamps/diarization unavailable without accurate timing data |
| Communication Board | Type/speak/stop, seeded and custom phrases, categories, speed/language, display mode | Browser speech availability varies; two-way call pairing planned |
| Form Assistant | Create/edit fields, step-by-step answers, validation summary, resume saved drafts, export | **Does not submit arbitrary external sites** |
| Notes & Saved | Notes, highlights, reading list, checklists, bookmarks, edit/search/delete/export, TTS | Rich tagging/editor/annotations planned |
| Tasks & History | Proposal, explicit approval, run, retry, cancel, result export, activity log | Text-only actions; cancellation may not abort an already-running provider request |
| Accessibility Profiles | Text scale, letter spacing, contrast, themes, reduced motion, simpler layout, default profiles, import/export | Per-site profiles need extension pairing |
| Browser Extension | Honest connection state and setup guidance; `extension/` holds unpacked MV3 prototype for site visual tools and selected text | Not published to Chrome Web Store; no dashboard pairing or external forms automation |
| Help & Feedback | Accessible walkthrough, keyboard instructions, privacy explanations, bug/barrier reports, report export | Optional screenshot redaction planned |
| Account & Privacy | Sign-in/out, history preference, data export and account deletion | Saved export contains metadata, not uploaded binary document contents |

## Data isolation
Supabase tables: `profiles`, `notes`, `documents`, `history`, `tasks`, `saved_items`, `phrases`, `form_sessions`, `accessibility_profiles`, `transcripts`, `feedback`, `document_results`, `task_steps`, and server-only `ai_usage`. All exposed user-data tables have owner-specific RLS; tasks updates occur server-side after session validation and explicit approval. Private bucket: `accesshub-documents` with per-user path policies.

## Supported behavior and honesty
- No claim of controlling third-party websites or submitting forms without a real extension.
- Browser speech synthesis/recognition may be unavailable, depending on browser language and permissions.
- Images, PDFs, audio and video sent to Gemini only on explicit action + consent.
- Gemini AI can be incorrect; original content should be checked, particularly for medical or legal matters.
- Secrets stay in Supabase, not in browser code.
- There is no claim that production end-to-end AI, permissions or accessibility have been fully tested just because the build succeeds.

## Extension install
See `extension/README.md` for Developer Mode loading in Chrome/Edge; this is an early, user-initiated MV3 extension and **is not connected to the dashboard yet**.

## Verification checklist
1. Production Vite build succeeds.
2. Sign in with two accounts and confirm RLS isolation for notes, forms and documents.
3. Check Auth redirects to the production domain.
4. Add a note, a phrase, a form draft and a profile; reload and verify persistence.
5. Upload an image, consent to Gemini analysis, check document result; repeat with PDF.
6. Enable microphone and test browser live captions where supported.
7. Test Gemini text request and quota error feedback.
8. Check layout by keyboard, screen reader, 200% zoom and mobile viewport.
9. Export data and verify no private storage URL or secret is leaked.
10. Configure Gemini key rotation if any screenshot has exposed a key.

This README distinguishes **implemented** from **extension-dependent / provider-dependent / planned** features.
