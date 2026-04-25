import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const repoRoot = path.resolve(import.meta.dirname, "..");
const routesFile = path.join(repoRoot, "generated", "public-routes.json");
const connectClientFile = path.join(
  repoRoot,
  "packages",
  "connect-sdk",
  "src",
  "client.ts",
);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function normalizeParameterizedPath(pathname) {
  return pathname.replace(/:[A-Za-z0-9_]+/g, ":param");
}

function normalizeRoute(route) {
  const [method, ...pathParts] = route.split(" ");
  return `${method} ${normalizeParameterizedPath(pathParts.join(" "))}`;
}

function resolveStringExpression(expression, sourceFile) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }

  if (ts.isTemplateExpression(expression)) {
    return expression.head.text + expression.templateSpans
      .map((span) => `:${span.expression.getText(sourceFile)}${span.literal.text}`)
      .join("");
  }

  return null;
}

function resolveRouteExpression(expression, sourceFile) {
  return resolveStringExpression(expression, sourceFile);
}

function resolveRequestMethod(callExpression) {
  const options = callExpression.arguments[1];

  if (!options || !ts.isObjectLiteralExpression(options)) {
    return "GET";
  }

  for (const property of options.properties) {
    if (
      ts.isPropertyAssignment(property) &&
      ts.isIdentifier(property.name) &&
      property.name.text === "method" &&
      (ts.isStringLiteral(property.initializer) ||
        ts.isNoSubstitutionTemplateLiteral(property.initializer))
    ) {
      return property.initializer.text;
    }
  }

  return "GET";
}

function extractTransportRoutes(filePath) {
  const source = fs.readFileSync(filePath, "utf8");
  const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const routes = new Set();

  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      (node.expression.name.text === "request" ||
        node.expression.name.text === "fetchRaw")
    ) {
      const routePath = resolveRouteExpression(node.arguments[0], sourceFile);

      if (routePath) {
        const method = resolveRequestMethod(node).toUpperCase();
        routes.add(`${method} ${routePath}`);
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return routes;
}

function verifyProductCoverage(product, clientRoutes, manifestRoutes) {
  const actual = new Set([...clientRoutes].map(normalizeRoute));
  const expected = new Set(manifestRoutes.map(normalizeRoute));

  const missingRoutes = [...expected].filter((route) => !actual.has(route)).sort();
  const unexpectedRoutes = [...actual].filter((route) => !expected.has(route)).sort();

  assert.equal(
    missingRoutes.length,
    0,
    `${product} client is missing generated public routes:\n${missingRoutes.join("\n")}`,
  );
  assert.equal(
    unexpectedRoutes.length,
    0,
    `${product} client exposes routes not present in the generated public manifest:\n${unexpectedRoutes.join("\n")}`,
  );
}

assert.ok(fs.existsSync(routesFile), "generated/public-routes.json is missing.");
assert.ok(
  fs.existsSync(connectClientFile),
  "packages/connect-sdk/src/client.ts is missing.",
);

const routesManifest = readJson(routesFile);
const connectRoutes = extractTransportRoutes(connectClientFile);

verifyProductCoverage("Connect", connectRoutes, routesManifest.connect);

console.log("Client route coverage verification passed.");
