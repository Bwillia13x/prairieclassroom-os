# Security And Header Notes

Generated: 2026-05-15T02:32:08.350Z

## Redirect And Headers

- Root `/` returns `307` to `/?demo=true&tab=today&classroom=demo-okafor-grade34`.
- Canonical HTML returns `200` with `strict-transport-security`, `x-content-type-options: nosniff`, `x-frame-options: DENY`, `permissions-policy`, and `referrer-policy`.
- Main JS bundle is served with `cache-control: public, max-age=31536000, immutable`.

## Bundle Scan

| Pattern | Count |
| --- | ---: |
| localhost | 0 |
| 127.0.0.1 | 0 |
| 0.0.0.0 | 0 |
| PRAIRIE env | 0 |
| VITE env | 0 |
| Gemini | 0 |
| API key literal | 0 |
| secret literal | 0 |
| token literal | 0 |
| OpenAI-like key | 4 |

The `OpenAI-like key` matches are CSS class-name false positives from `sk-windows*`; no secret-bearing API key literal was found.

Raw header captures:
- [raw/root-headers.txt](raw/root-headers.txt)
- [raw/main-bundle-headers.txt](raw/main-bundle-headers.txt)
- [raw/bundle-scan.json](raw/bundle-scan.json)
