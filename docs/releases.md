# Release Model

This repo publishes the `@voyantjs/connect-sdk` package.

## Release expectations

- keep changelog entries package-specific
- only publish when the public package actually changed

## Stability model

`@voyantjs/connect-sdk` is the public SDK. `@voyant-sdk/sdk-core` is a private
runtime bundled into the public package and is not part of the public support
surface.

## Versioning while in 0.x

The package stays in `0.x.x` until we declare it stable. While `major === 0`,
`pnpm version-packages` (the wrapper around `changeset version`) automatically
demotes any `major` changeset to `minor`. Concretely:

- a `patch` changeset bumps `0.1.0 → 0.1.1`
- a `minor` changeset bumps `0.1.0 → 0.2.0`
- a `major` changeset is treated as `minor` and bumps `0.1.0 → 0.2.0`

This prevents an accidental jump to `1.0.0` before the API is stable. When
we're ready to commit to a stable surface, hand-edit the version to `1.0.0`
and the wrapper steps out of the way (the demotion only applies while the
current major is `0`).
