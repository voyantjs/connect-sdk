# Roadmap

This repo now has a working public package surface, release scaffolding, CI,
API parity checks, and packed-artifact verification. The remaining work before
the first public release should stay focused on contract generation and final
consumer polish.

## Before first publish

- generate or export contract artifacts from `voyant-cloud` instead of relying
  on hand-mirrored SDK types
- add package-level examples that match real auth and endpoint behavior
- deepen package tests beyond the current smoke coverage
- decide versioning policy for prerelease versus stable releases

## Connect SDK follow-up

- expose the `/v1/connect-channel/*` ingestion surface (different auth model —
  HMAC-signed payloads, not Bearer)
- add an SSE parser for `flights.searchStream` so callers don't have to bring
  one of their own
- decide whether the gateway data plane (`gateway.*`) and the Connect-normalized
  reads (`connect.*`) should stay as two parallel groups or merge in a future
  major version

## Repo follow-up

- add package README validation or snippet verification into release checks
- keep docs in Markdown here until the shared docs app is ready in `voyant`
- decide whether to keep a single bootstrap changeset or split release notes
  into more granular prerelease entries before publishing
