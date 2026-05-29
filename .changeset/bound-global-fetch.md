---
"@voyantjs/connect-sdk": patch
---

Preserve the global fetch receiver in the default transport path so Worker-style runtimes do not require callers to pass a bound fetch.
