# @voyantjs/connect-adapter

## 0.2.10

### Patch Changes

- d37e299: Expose cruise sailing cabin option pricing and qualitative availability in normalized `cruises/v1` content.

## 0.2.9

### Patch Changes

- 869ebe5: Emit flattened `lowest_price_cents` and `currency` fields for `cruises/v1` sailing content instead of the nested `price_from` object.

## 0.2.8

### Patch Changes

- f4e8e75: Upgrade Voyant framework package peers and dev installs to the latest 0.85.3 line.

## 0.2.7

### Patch Changes

- 10d4451: Expose cruise price-from fields on operator cruise summaries and normalize sailing price-from values from canonical Connect price columns.
- Updated dependencies [10d4451]
  - @voyantjs/connect-sdk@0.1.5

## 0.2.6

### Patch Changes

- 306b849: Expose canonical cruise projection/provenance fields on Connect cruise rows and prefer those fields when normalizing adapter cruise content.
- Updated dependencies [306b849]
  - @voyantjs/connect-sdk@0.1.4

## 0.2.5

### Patch Changes

- 3fccb5b: Keep cruise itinerary variants scoped to their sailings instead of flattening every departure into one top-level itinerary.

## 0.2.4

### Patch Changes

- Updated dependencies [9825584]
  - @voyantjs/connect-sdk@0.1.3

## 0.2.3

### Patch Changes

- b23180f: Publish `@voyantjs/catalog` as a peer dependency so host apps own the catalog package graph.

## 0.2.2

### Patch Changes

- ad55f01: Add normalized cruise content resolution to the Connect catalog adapter, including source-ref recovery for flat Connect search-document ids.

## 0.2.1

### Patch Changes

- e267f77: Support live Connect search document rows that are returned as flat API records instead of `payload`-wrapped records.
- Updated dependencies [e267f77]
  - @voyantjs/connect-sdk@0.1.2

## 0.2.0

### Minor Changes

- 9029eb8: Add the Connect-backed OSS catalog SourceAdapter package for Voyant apps.
