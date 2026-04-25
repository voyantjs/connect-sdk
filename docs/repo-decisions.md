# Repo Decisions

`connect-sdk` exists to publish the public `@voyantjs/connect-sdk` package.

## What belongs here

- the public `@voyantjs/connect-sdk` package
- shared SDK runtime code consumed by that package
- package-level tests
- lightweight Markdown documentation

## What does not belong here

- private Voyant Connect implementation code
- product dashboards or internal tooling
- a standalone docs app

The main docs application will live in `voyant`. This repo only needs enough
Markdown to explain package boundaries, release expectations, and contract
generation.

## Package boundaries

- `@voyantjs/connect-sdk` is for Voyant Connect services
- `@voyant-sdk/sdk-core` is private and should contain only transport-level
  concerns

## Scope rule

- no product-specific business logic in `sdk-core`
- docs and examples should stay scoped to the Connect surface
