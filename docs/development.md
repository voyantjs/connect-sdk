# Development

This repo is a package workspace, not an application workspace.

## Local commands

```sh
pnpm install
pnpm check-types
pnpm lint
pnpm build
pnpm sync:contracts
pnpm verify:client-route-coverage
pnpm verify:api-parity
pnpm verify:package-artifacts
pnpm verify:package-manifests
pnpm verify:readmes
pnpm verify
```

`verify:api-parity` compares the local SDK route inventory against the sibling
`voyant-cloud` route files. It skips cleanly when that repo is not available.

Run a single package if needed:

```sh
pnpm --filter @voyantjs/connect-sdk check-types
pnpm --filter @voyantjs/connect-sdk lint
```

## Workspace structure

- `packages/connect-sdk`: Voyant Connect SDK
- `packages/sdk-core`: shared transport and error handling
- `packages/eslint-config`: shared ESLint config
- `packages/typescript-config`: shared TypeScript config

## Development expectations

- keep package APIs explicit and product-scoped
- prefer additive changes to breaking renames
- document any new top-level client method in Markdown
- avoid adding a runtime dependency unless it materially improves the SDK

## Docs

This repo intentionally uses plain Markdown docs for now. The unified docs app
will live in `voyant`.
