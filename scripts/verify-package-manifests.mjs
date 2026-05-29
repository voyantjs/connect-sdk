import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(import.meta.dirname, "..");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), "utf8"));
}

function assertEqual(actual, expected, label) {
  assert.deepStrictEqual(
    actual,
    expected,
    `${label} does not match the expected value.`,
  );
}

function verifyRootPackage() {
  const manifest = readJson("package.json");

  assert.equal(manifest.private, true, "root package.json must stay private");
  assert.equal(
    manifest.packageManager,
    "pnpm@9.0.0",
    "root packageManager must stay pinned",
  );
  assert.ok(manifest.scripts, "root package.json must define scripts");
  assert.ok(
    manifest.scripts["verify:package-manifests"],
    "root package.json must define verify:package-manifests",
  );
  assert.ok(
    manifest.scripts.verify.includes("verify:package-manifests"),
    "root verify script must include verify:package-manifests",
  );
}

function verifyPublicPackage(
  relativePath,
  {
    name,
    descriptionKeyword,
    dependencies = {},
    bundleDependencies,
    extraExports = {},
    extraPublishExports = {},
  },
) {
  const manifest = readJson(relativePath);

  assert.equal(
    manifest.name,
    name,
    `${relativePath} has an unexpected package name`,
  );
  assert.ok(
    !("private" in manifest),
    `${relativePath} must not be marked private`,
  );
  assert.equal(manifest.type, "module", `${relativePath} must stay ESM`);
  assert.equal(
    manifest.sideEffects,
    false,
    `${relativePath} must stay side-effect free`,
  );
  assert.equal(
    manifest.main,
    "./dist/index.js",
    `${relativePath} main must point at dist`,
  );
  assert.equal(
    manifest.types,
    "./src/index.ts",
    `${relativePath} types must point at src in-workspace`,
  );
  assert.ok(
    typeof manifest.description === "string" &&
      manifest.description.includes(descriptionKeyword),
    `${relativePath} description must mention ${descriptionKeyword}`,
  );
  assert.ok(
    Array.isArray(manifest.keywords),
    `${relativePath} must define keywords`,
  );
  assert.ok(
    manifest.keywords.includes("voyant") && manifest.keywords.includes("sdk"),
    `${relativePath} keywords must include voyant and sdk`,
  );
  assertEqual(manifest.files, ["dist"], `${relativePath} files`);
  if (bundleDependencies !== undefined) {
    assertEqual(
      manifest.bundleDependencies,
      bundleDependencies,
      `${relativePath} bundleDependencies`,
    );
  } else {
    assert.ok(
      !("bundleDependencies" in manifest),
      `${relativePath} must not bundle dependencies`,
    );
  }
  for (const [dependency, expectedVersion] of Object.entries(dependencies)) {
    assert.equal(
      manifest.dependencies?.[dependency],
      expectedVersion,
      `${relativePath} must depend on ${dependency}`,
    );
  }
  assertEqual(
    manifest.exports,
    {
      ".": {
        types: "./src/index.ts",
        default: "./dist/index.js",
      },
      ...extraExports,
    },
    `${relativePath} exports`,
  );
  assertEqual(
    manifest.publishConfig,
    {
      access: "public",
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
        },
        ...extraPublishExports,
      },
    },
    `${relativePath} publishConfig`,
  );
}

function verifyPrivatePackage(relativePath) {
  const manifest = readJson(relativePath);

  assert.equal(
    manifest.name,
    "@voyant-sdk/sdk-core",
    `${relativePath} has an unexpected package name`,
  );
  assert.equal(manifest.private, true, `${relativePath} must stay private`);
  assert.equal(manifest.type, "module", `${relativePath} must stay ESM`);
  assert.equal(
    manifest.sideEffects,
    false,
    `${relativePath} must stay side-effect free`,
  );
  assert.equal(
    manifest.main,
    "./dist/index.js",
    `${relativePath} main must point at dist`,
  );
  assert.equal(
    manifest.types,
    "./src/index.ts",
    `${relativePath} types must point at src in-workspace`,
  );
  assertEqual(manifest.files, ["dist"], `${relativePath} files`);
  assertEqual(
    manifest.exports,
    {
      ".": {
        types: "./src/index.ts",
        default: "./dist/index.js",
      },
    },
    `${relativePath} exports`,
  );
  assertEqual(
    manifest.publishConfig,
    {
      main: "./dist/index.js",
      types: "./dist/index.d.ts",
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          import: "./dist/index.js",
        },
      },
    },
    `${relativePath} publishConfig`,
  );
}

verifyRootPackage();
verifyPublicPackage("packages/connect-sdk/package.json", {
  name: "@voyantjs/connect-sdk",
  descriptionKeyword: "Voyant Connect",
  dependencies: { "@voyant-sdk/sdk-core": "workspace:*" },
  bundleDependencies: ["@voyant-sdk/sdk-core"],
});
verifyPublicPackage("packages/connect-provider-sdk/package.json", {
  name: "@voyantjs/connect-provider-sdk",
  descriptionKeyword: "provider integrations",
  extraExports: {
    "./hosted-worker": {
      types: "./src/hosted-worker.ts",
      default: "./dist/hosted-worker.js",
    },
  },
  extraPublishExports: {
    "./hosted-worker": {
      types: "./dist/hosted-worker.d.ts",
      import: "./dist/hosted-worker.js",
    },
  },
});
verifyPublicPackage("packages/connect-cruises/package.json", {
  name: "@voyantjs/connect-cruises",
  descriptionKeyword: "cruises adapter",
  dependencies: { "@voyantjs/connect-sdk": "workspace:*" },
});
verifyPublicPackage("packages/connect-adapter/package.json", {
  name: "@voyantjs/connect-adapter",
  descriptionKeyword: "catalog SourceAdapter",
  dependencies: {
    "@voyantjs/catalog": "*",
    "@voyantjs/connect-sdk": "workspace:*",
  },
});
verifyPrivatePackage("packages/sdk-core/package.json");

console.log("Package manifest verification passed.");
