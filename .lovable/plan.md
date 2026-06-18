## QR Code Safety Checker — Plan

A mobile-first single-page app that scans QR codes with the device camera, then runs heuristic safety checks on the decoded URL and shows a clear verdict. Fully client-side — no backend, no accounts, no history.

### User flow
1. Land on a clean mobile scanner screen with a big "Start scanning" button (camera permission is only requested on tap, not on page load).
2. Tap → live camera preview fills the screen with a framing reticle overlay.
3. As soon as a QR code is detected, scanning stops and the app shows:
   - The decoded URL (full, copyable)
   - A safety verdict badge: **Safe** / **Caution** / **Dangerous**
   - A checklist of each heuristic with pass/fail and a short human explanation
   - Buttons: "Copy URL", "Open in new tab" (with a confirm step if not Safe), "Scan another"
4. If the QR contains non-URL data (plain text, wifi, vcard), show the payload and skip URL analysis.
5. If camera permission is denied or unavailable, show a clear message with retry guidance.

### Safety heuristics (all local, no API keys)
- **Not HTTPS** → Caution
- **IP address instead of domain** → Dangerous
- **Punycode / IDN homograph** (`xn--`, mixed scripts) → Dangerous
- **Known URL shortener** (bit.ly, tinyurl, t.co, goo.gl, ow.ly, is.gd, buff.ly, rebrand.ly, cutt.ly, …) → Caution
- **Suspicious TLD** (.zip, .mov, .top, .xyz, .tk, .ml, .ga, .cf, .gq, .work, .click) → Caution
- **Excessive subdomains** (>3 levels — phishing pattern like `paypal.com.login.evil.xyz`) → Caution
- **Brand keyword in subdomain but not registrable domain** (e.g. `paypal-secure.example.com`) → Caution
- **Credentials in URL** (`user:pass@host`) → Dangerous
- **Non-standard port** → Caution
- **`@` symbol in URL** (classic obfuscation) → Dangerous
- **Very long URL or many query params** → informational note
- **`data:` / `javascript:` URI scheme** → Dangerous

Verdict: any Dangerous → Dangerous; else any Caution → Caution; else Safe.

### Tech approach
- Library: `jsqr` for decoding.
- Pipeline: `navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })` → `<video>` element → draw each frame to an offscreen canvas via `requestAnimationFrame` → `jsQR(imageData)` → on hit, stop the stream.
- Stop tracks on unmount / "Scan another" to release the camera light.
- All heuristics in `src/lib/url-safety.ts` returning `{ verdict, checks: [{id, label, severity, passed, detail}] }`.
- Tailwind + shadcn (Card, Badge, Button, Alert). Mobile-first, generous tap targets, green/amber/red semantic tokens.

### Camera permission note
Camera access requires HTTPS. The Lovable preview and published URLs are HTTPS, so it works in both — just not on a plain `http://` host.

### Files
- `src/routes/index.tsx` — main scanner screen (replaces placeholder)
- `src/components/qr-scanner.tsx` — camera lifecycle + decode loop
- `src/components/safety-report.tsx` — verdict badge + checklist
- `src/lib/decode-qr.ts` — canvas → string via jsqr
- `src/lib/url-safety.ts` — heuristic engine (pure)
- `src/styles.css` — add success/warning/danger semantic tokens
- `src/routes/__root.tsx` — title/meta → "QR Safety Checker"
- `package.json` — add `jsqr`

### Out of scope
Image upload, live external lookups (Safe Browsing, VirusTotal), history, accounts.
