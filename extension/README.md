# AccessHub AI Chrome/Edge extension (early prototype)
This is an **unpublished, unpacked** Manifest V3 extension.
1. Download or clone this repository.
2. Open chrome://extensions (or edge://extensions).
3. Enable Developer mode, select "Load unpacked", and choose this `extension` directory.
4. Pin AccessHub AI to your toolbar; open a normal webpage.
5. Click its icon to apply site-specific visual controls or read only text you selected.

## Security and current limits
- Uses activeTab and scripting permissions only after a click; does not request access to all browsing history or all sites.
- Does **not** automatically send selected text to Gemini or the dashboard.
- Does **not** capture credentials, fill forms, or submit external data.
- Can't modify browser-internal pages or protected domains.
- Tab styles are temporary and may reset on navigation.
- Dashboard pairing and trusted form-field automation are **not yet implemented**. The dashboard's extension status reflects this.
