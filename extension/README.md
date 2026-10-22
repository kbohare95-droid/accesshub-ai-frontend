# AccessHub AI Browser Extension — v0.2 (Chrome / Edge, Manifest V3)

This is the **unpacked developer prototype**, not a Chrome Web Store release.

## Install
1. Open [Download latest repository ZIP](https://github.com/kbohare95-droid/accesshub-ai-frontend/archive/refs/heads/main.zip).
2. Extract the ZIP to a permanent folder (e.g. `Documents/AccessHub-AI`). Do not load the ZIP itself.
3. Chrome: type `chrome://extensions` in the address bar. Edge: use `edge://extensions`.
4. Enable **Developer mode**.
5. Select **Load unpacked** and choose the extracted `extension` folder containing `manifest.json`, not the top-level repository folder.
6. Pin **AccessHub AI — Accessible Web** to the toolbar.
7. Open a regular webpage and click the icon. The Page tab works without login.

> If you update extension source files, return to chrome://extensions and click **Reload** on AccessHub, then reopen the page. No updates install automatically for this unpacked extension.

## Connect to your existing dashboard
1. Open the extension popup, go to **Account**.
2. Sign in with the same verified email + password as [AccessHub AI dashboard](https://accesshub-ai-frontend.vercel.app).
3. The extension authenticates with **Supabase Auth** and records a device check-in on the authenticated `extension_devices` table. It does **not** share your active tab or browsing history as part of check-in.
4. Open the dashboard → **Browser Extension** → **Refresh connection status**. The newest signed-in device entry appears (if you have network access and RLS permissions).
5. This is **authenticated account sync**; not a real-time remote-control channel. No webpage is scanned automatically.

## Feature matrix

| Feature | Where | Interaction and permission |
|---|---|---|
| Font size + / − | Page | Click; activeTab scripting |
| Line / letter spacing | Page | User changes slider |
| High contrast, dark color scheme | Page | Click toggles |
| Reduce animation | Page | Click toggle |
| Emphasize hyperlinks | Page | Click toggle |
| Reading ruler + focus view | Page | Click toggles |
| Hide images | Page | Click toggle; reversible |
| Reset page | Page | Click |
| Save/apply per-site preferences | Page | Manual save, origin kept locally |
| Apply dashboard default profile | Page | Sign in, click; reads only your default profile |
| Get selected webpage text | Read & AI | Explicit click; up to 12,000 characters |
| Text-to-speech (TTS) | Read & AI | Chrome / OS TTS; does not send text to Gemini |
| Simplify, summarize, translate, explain | Read & AI | Sign in, tick per-request cloud consent, click Analyze |
| Copy result | Read & AI | Explicit click |
| Save AI result in private notes | Read & AI | Sign in, click |
| Scan visible form labels and types | Forms | Explicit click; **no filled values read** |
| Type/edit answers | Forms | In popup, not webpage |
| Review then fill one field | Forms | Two separate clicks; no automatic form submission |
| Save reviewed form draft | Forms | Sign in, separate opt-in consent |
| Device status | Account / dashboard | Only a user-initiated sync, not browsing activity tracking |
| Sign out from extension | Account | Clears saved extension session and attempts device removal |

## Permissions
- `activeTab`: only the user-invoked tab, not full history or every site.
- `scripting`: inject packaged, fixed local functions following a user action. No remote JS.
- `storage`: the extension's own credentials and preferences; storage local is limited to trusted extension contexts.
- `tts`: Chrome's operating-system text-to-speech.
- Supabase host permission: only the existing AccessHub AI backend's origin, for login and consented requests.

**Secrets:** Bundled project publishable key is public by design, paired with user authentication and RLS. Gemini API key and service-role key remain only on the server. Do not paste a secret into the extension.

**Privacy and forms:** The extension scans only visible, supported input field names/types without reading their filled answers. Passwords, OTPs, payment, bank and selected identity-number fields are excluded. A webpage can run scripts in response to field changes, so only fill forms on sites you trust, and inspect all changes. The extension itself never invokes submit. No auto-submit or bulk filling. Some forms use custom components or iframes and cannot be scanned. Cloud saving form drafts requires an additional checkbox.

**Accessibility:** Meaningful controls, keyboard focus styles, reduced-motion support, screen-reader status announcements. Accessibility compliance with WCAG 2.2 has *not* been externally audited.

## Development tests
```bash
node extension/tests/check.mjs
npm install
npm run build
```

This runs static manifest validation, JS parse checks and a mocked DOM test that checks protected fields are excluded and existing form answers are not read. It does **not** replace testing with Chrome, Edge, screen readers and real websites.

## Known limits
- This is not published to the Chrome Web Store; installation requires Developer mode.
- Some browser-internal pages, Chrome Web Store pages, sandboxed cross-origin frames and heavily restricted sites block scripting.
- Dynamic/React forms may replace inputs after scanning; rescan after navigation or changes.
- Popup state is temporary. Closing the popup clears unsaved form answers and selected text.
- Local page appearance adjustments may reset on navigation and can conflict with unusual website styles.
- The dashboard receives only authenticated device check-in metadata; no full live tab/control pairing.
- Gemini features require valid account authentication, the Supabase Edge Function and your provider quota.
- Never use browser-based autofill for security-critical or sensitive form submissions.

## Backend
- Public Supabase table `extension_devices` protected by authenticated owner-only RLS.
- Authentication via `/auth/v1/token` (email/password and refresh) with the **publishable** key.
- `/rest/v1/extension_devices` stores device ID, device/browser name, extension version, and time last clicked or synced.
- Consent-based AI via the existing authenticated `/functions/v1/accesshub-ai` Edge Function.
- Optional cloud save uses the existing RLS-protected `notes` and `form_sessions` tables.

## v0.3 update

Reload this folder in `chrome://extensions` after downloading the updated repository. Page controls now include **One-click large green text**, font choice, custom colours and spectrum adjustment. Save site settings, then use Apply saved on future visits. Size changes apply to fixed-pixel text as well as relative text, up to 250%; reset restores modified properties. Spectrum presets are adjustable hue shifts, not medically validated colour correction. Exact custom colours override spectrum shifts.

Read & AI offers 23 target languages. Choose Hindi → Translate → approve the AI request → Analyze → **Speak translated / AI result** for Hindi output. Speak alone reads the original input. A matching installed voice is required; the extension reports missing voices instead of silently selecting English. Voice, rate, pitch and language settings are saved locally.
