# @voyantjs/connect-sdk

## 0.1.5

### Patch Changes

- 10d4451: Expose cruise price-from fields on operator cruise summaries and normalize sailing price-from values from canonical Connect price columns.

## 0.1.4

### Patch Changes

- 306b849: Expose canonical cruise projection/provenance fields on Connect cruise rows and prefer those fields when normalizing adapter cruise content.

## 0.1.3

### Patch Changes

- 9825584: Preserve the global fetch receiver in the default transport path so Worker-style runtimes do not require callers to pass a bound fetch.

## 0.1.2

### Patch Changes

- e267f77: Support live Connect search document rows that are returned as flat API records instead of `payload`-wrapped records.
