# `@voyant-sdk/sdk-core`

Private shared runtime for the public Voyant SDK packages.

## Purpose

This package centralizes:

- request transport
- auth header handling
- query serialization
- JSON encoding
- API error handling

It is bundled into `@voyantjs/connect-sdk` so consumers do not need to install it
directly.

## Rules

- keep this package private
- keep it transport-focused
- do not move product-specific business logic here

## Current exports

- `VoyantTransport`
- `VoyantApiError`
- transport option and request option types

If this package starts accumulating product-specific types, the boundary is
wrong and should be corrected.
