# Lighthouse Summary

Final Lighthouse spot checks against the public Vercel alias. Scores are out of 100.

| Target | Perf | A11y | Best Practices | SEO | FCP | LCP | TBT | CLS | Speed Index |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Canonical demo desktop | 99 | 100 | 100 | 100 | 0.6 s | 0.9 s | 0 ms | 0.025 | 0.7 s |
| Canonical demo mobile | 84 | 100 | 100 | 100 | 2.9 s | 3.4 s | 60 ms | 0 | 4.4 s |
| Review Support Patterns desktop | 83 | 100 | 100 | 100 | 0.7 s | 0.8 s | 0 ms | 0.342 | 0.7 s |

## Interpretation

- P0/P1: none found. Accessibility, Best Practices, and SEO are 100 on all three spot checks.
- P2: canonical mobile LCP remains above the 2.5s ideal in Lighthouse lab conditions.
- P2: Review Support Patterns desktop still reports high lab CLS on deep-link load, while the route sweep shows no horizontal overflow, console/page errors, bad HTTP responses, or broken interaction.
