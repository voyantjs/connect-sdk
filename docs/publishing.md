# Publishing

## Packages intended for publish

- `@voyantjs/connect-sdk`

## Private workspace packages

- `@voyant-sdk/sdk-core`
- `@voyant-sdk/eslint-config`
- `@voyant-sdk/typescript-config`

## Publish expectations

- build from `dist`
- keep release notes scoped to the public package
- do not publish internal workspace packages accidentally

## Pre-publish checks

- `pnpm sync:contracts`
- `pnpm verify`
- `pnpm release`
- `pnpm verify:client-route-coverage`
- `pnpm verify:api-parity`
- `pnpm verify:package-artifacts`
- `pnpm verify:package-manifests`
- `pnpm verify:readmes`

`pnpm release` should stay a thin wrapper around `pnpm verify` plus
`changeset publish`, so local release behavior matches CI as closely as
possible.

## GitHub automation

The repo includes:

- CI verification on pull requests and pushes
- a Changesets release workflow for `main`

The release workflow should:

- open or update a release PR when unreleased changesets exist
- publish the package once those changesets land on `main`
- require `NPM_TOKEN` in repository secrets

## Tagging and release notes

Release notes should answer:

- what changed for SDK consumers
- whether auth or request behavior changed
- whether new endpoints or methods were added
- whether any previously documented surface changed incompatibly
