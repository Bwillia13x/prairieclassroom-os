# Security And Header Notes

## Public Headers

Root response:

```text
HTTP/2 307
cache-control: public, max-age=0, must-revalidate
content-type: text/plain
date: Fri, 15 May 2026 13:24:48 GMT
location: /?demo=true&tab=today&classroom=demo-okafor-grade34
server: Vercel
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-vercel-enable-rewrite-caching: 1
x-vercel-id: pdx1::8dh59-1778851488311-4555ff50f52a
```

Canonical demo response:

```text
HTTP/2 200
accept-ranges: bytes
access-control-allow-origin: *
age: 0
cache-control: public, max-age=0, must-revalidate
content-disposition: inline
content-type: text/html; charset=utf-8
date: Fri, 15 May 2026 13:24:48 GMT
etag: "a80e1c1198dccfaf4d76fd27e1f78044"
last-modified: Fri, 15 May 2026 13:24:48 GMT
permissions-policy: geolocation=(), microphone=(), camera=()
referrer-policy: strict-origin-when-cross-origin
server: Vercel
strict-transport-security: max-age=63072000; includeSubDomains; preload
x-content-type-options: nosniff
x-frame-options: DENY
x-vercel-cache: HIT
x-vercel-enable-rewrite-caching: 1
x-vercel-id: pdx1::s6gl9-1778851488312-cd7cabe446e8
content-length: 2184
```

## Bundle Secret Scan

- Scanned build files: 54
- Actionable findings: 0
- False positives: 13
- False-positive notes: `security/bundle-secret-scan-false-positive-notes.json`

No browser-exposed Gemini key, bearer token, OpenAI-style secret, loopback URL, or `VITE_*KEY/SECRET/TOKEN` value was found in the built HTML/JS/CSS. Production Vercel env names remain server-side/encrypted and are not present in the browser bundle.
