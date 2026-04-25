import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const repoRoot = path.resolve(import.meta.dirname, "..");
const voyantCloudRepo = path.resolve(repoRoot, "../voyant-cloud");
const manifestFile = path.join(repoRoot, "generated", "public-routes.json");

const connectRouteFiles = [
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
].map((file) =>
  path.join(voyantCloudRepo, "apps/connect-api/src/routes/v1", file),
);

// Routes the public Connect SDK intentionally does not surface (different
// auth model or internal-only). Kept in sync with sync-route-manifests.mjs.
const connectExclusions = new Set(["POST /internal/operators/sync"]);

function isConnectChannelRoute(route) {
  return route.includes(" /v1/connect-channel/");
}

function fileExists(filePath) {
  return fs.existsSync(filePath);
}

function joinPath(prefix, suffix) {
  if (!prefix) return suffix;
  if (suffix === "/" || suffix === "") return prefix;
  return `${prefix}${suffix.startsWith("/") ? "" : "/"}${suffix}`;
}

function extractRoutes(filePath, pathPrefix = "") {
  const source = fs.readFileSync(filePath, "utf8");
  return new Set(
    [
      ...source.matchAll(
        /\bapp\.(get|post|patch|delete|put)\(\s*"([^"]+)"/gs,
      ),
    ].map(
      ([, method, route]) =>
        `${method.toUpperCase()} ${joinPath(pathPrefix, route)}`,
    ),
  );
}

function verifyManifest(label, actualRoutes, expectedRoutes) {
  const missingRoutes = [...actualRoutes]
    .filter((route) => !expectedRoutes.has(route))
    .sort();
  const staleRoutes = [...expectedRoutes]
    .filter((route) => !actualRoutes.has(route))
    .sort();

  assert.equal(
    missingRoutes.length,
    0,
    `${label} SDK is missing public routes from voyant-cloud:\n${missingRoutes.join("\n")}`,
  );

  assert.equal(
    staleRoutes.length,
    0,
    `${label} SDK parity manifest contains routes no longer present in voyant-cloud:\n${staleRoutes.join("\n")}`,
  );
}

const requiredFiles = [manifestFile, ...connectRouteFiles];

if (!requiredFiles.every(fileExists)) {
  console.log(
    "Skipping API parity verification: sibling voyant-cloud route files not found.",
  );
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));

const actualConnectRoutes = new Set();
for (const file of connectRouteFiles) {
  for (const route of extractRoutes(file)) {
    if (connectExclusions.has(route)) continue;
    if (isConnectChannelRoute(route)) continue;
    actualConnectRoutes.add(route);
  }
}

verifyManifest("Connect", actualConnectRoutes, new Set(manifest.connect));

console.log("API parity verification passed for Connect routes.");
