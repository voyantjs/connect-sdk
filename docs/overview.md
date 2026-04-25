# Overview

`connect-sdk` publishes one public TypeScript package:

- `@voyantjs/connect-sdk`

Shared transport and error handling stay in a private internal package so the
public SDK boundary stays clean.

## Package boundaries

- `@voyantjs/connect-sdk` wraps the Voyant Connect operator/connection control
  plane plus the gateway data plane for products, availability, bookings,
  suppliers, flights, and Connect-normalized inventory reads.
- `@voyant-sdk/sdk-core` contains shared request plumbing only.
