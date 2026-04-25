import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const voyantCloudRepo = path.resolve(repoRoot, "../voyant-cloud");

const connectSources = [
  "audit-logs.ts",
  "availability.ts",
  "bookings.ts",
  "connect-channel.ts",
  "connect.ts",
  "connections.ts",
  "connector-providers.ts",
  "custom-connection-requests.ts",
  "flights.ts",
  "grants.ts",
  "invite-tokens.ts",
  "links.ts",
  "oauth-clients.ts",
  "oauth-token.ts",
  "operator-data.ts",
  "operators.ts",
  "products.ts",
  "suppliers.ts",
  "usage.ts",
  "webhook-subscriptions.ts",
].map((file) => ({
  file: path.join(voyantCloudRepo, "apps/connect-api/src/routes/v1", file),
  pathPrefix: "",
}));

const manifestFile = path.join(repoRoot, "generated", "public-routes.json");

// Routes the public Connect SDK does not surface (different auth model or
// internal-only). Kept in sync with verify-api-parity.mjs.
const connectExclusions = new Set([
  "POST /internal/operators/sync",
]);

const connectChannelExcluded = (route) =>
  route.includes(" /v1/connect-channel/");

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function joinPath(prefix, suffix) {
  if (!prefix) return suffix;
  if (suffix === "/" || suffix === "") return prefix;
  return `${prefix}${suffix.startsWith("/") ? "" : "/"}${suffix}`;
}

function extractRoutes(filePath, pathPrefix) {
  const source = fs.readFileSync(filePath, "utf8");
  return [
    ...source.matchAll(/\bapp\.(get|post|patch|delete|put)\(\s*"([^"]+)"/gs),
  ].map(
    ([, method, route]) =>
      `${method.toUpperCase()} ${joinPath(pathPrefix, route)}`,
  );
}

if (!connectSources.every((source) => fileExists(source.file))) {
  console.error(
    "Unable to sync route manifests: sibling voyant-cloud route files were not found.",
  );
  process.exit(1);
}

const connectRoutes = connectSources
  .flatMap((source) => extractRoutes(source.file, source.pathPrefix))
  .filter((route) => !connectExclusions.has(route))
  .filter((route) => !connectChannelExcluded(route))
  .sort();

const manifest = { connect: connectRoutes };

fs.mkdirSync(path.dirname(manifestFile), { recursive: true });
fs.writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(
  `Synced route manifest to ${path.relative(repoRoot, manifestFile)}.`,
);
