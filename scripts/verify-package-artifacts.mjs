import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const packDir = mkdtempSync(path.join(tmpdir(), "voyant-sdk-pack-"));

const packages = [
  {
    dir: path.join(repoRoot, "packages", "connect-sdk"),
    expectedName: "@voyantjs/connect-sdk",
  },
];

function packPackage(packageDir) {
  const output = execFileSync("pnpm", ["pack", "--pack-destination", packDir], {
    cwd: packageDir,
    encoding: "utf8",
  }).trim();

  return output.split("\n").at(-1);
}

function readPackedManifest(tarballPath) {
  const raw = execFileSync("tar", ["-xOf", tarballPath, "package/package.json"], {
    encoding: "utf8",
  });

  return JSON.parse(raw);
}

function readPackedFileList(tarballPath) {
  return execFileSync("tar", ["-tzf", tarballPath], {
    encoding: "utf8",
  })
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function installPackedPackage(appDir, tarballPath, packageName) {
  const [scope, name] = packageName.split("/");
  const scopeDir = path.join(appDir, "node_modules", scope);
  const packageDir = path.join(scopeDir, name);
  const extractDir = mkdtempSync(path.join(tmpdir(), "voyant-sdk-unpack-"));

  mkdirSync(scopeDir, { recursive: true });
  execFileSync("tar", ["-xzf", tarballPath, "-C", extractDir], { encoding: "utf8" });
  renameSync(path.join(extractDir, "package"), packageDir);
  rmSync(extractDir, { force: true, recursive: true });
}

function verifyInstalledImports(tarballs) {
  const appDir = mkdtempSync(path.join(tmpdir(), "voyant-sdk-app-"));

  try {
    mkdirSync(path.join(appDir, "node_modules"), { recursive: true });
    writeFileSync(
      path.join(appDir, "package.json"),
      JSON.stringify(
        {
          name: "voyant-sdk-artifact-test",
          private: true,
          type: "module",
        },
        null,
        2,
      ),
    );

    for (const [packageName, tarballPath] of tarballs) {
      installPackedPackage(appDir, tarballPath, packageName);
    }

    execFileSync(
      "node",
      [
        "--input-type=module",
        "-e",
        `
          import assert from "node:assert/strict";
          import { createVoyantConnectClient } from "@voyantjs/connect-sdk";

          const connect = createVoyantConnectClient({ apiKey: "connect_key" });

          assert.equal(typeof connect.oauth.issueToken, "function");
          assert.equal(typeof connect.operators.list, "function");
          assert.equal(typeof connect.operators.create, "function");
          assert.equal(typeof connect.connections.list, "function");
          assert.equal(typeof connect.connections.create, "function");
          assert.equal(typeof connect.connections.rotateWebhookSecret, "function");
          assert.equal(typeof connect.connectorProviders.list, "function");
          assert.equal(typeof connect.connectorProviders.upsertRegistration, "function");
          assert.equal(typeof connect.links.create, "function");
          assert.equal(typeof connect.oauthClients.create, "function");
          assert.equal(typeof connect.grants.create, "function");
          assert.equal(typeof connect.auditLogs.list, "function");
          assert.equal(typeof connect.inviteTokens.lookup, "function");
          assert.equal(typeof connect.webhookSubscriptions.create, "function");
          assert.equal(typeof connect.customConnectionRequests.create, "function");
          assert.equal(typeof connect.gateway.createBooking, "function");
          assert.equal(typeof connect.gateway.getAvailability, "function");
          assert.equal(typeof connect.connect.listProducts, "function");
          assert.equal(typeof connect.flights.search, "function");
          assert.equal(typeof connect.flights.searchStream, "function");
          assert.equal(typeof connect.flights.book, "function");
        `,
      ],
      {
        cwd: appDir,
        encoding: "utf8",
      },
    );
  } finally {
    rmSync(appDir, { force: true, recursive: true });
  }
}

function verifyInstalledTypecheck(tarballs) {
  const appDir = mkdtempSync(path.join(tmpdir(), "voyant-sdk-types-"));

  try {
    mkdirSync(path.join(appDir, "node_modules"), { recursive: true });
    writeFileSync(
      path.join(appDir, "package.json"),
      JSON.stringify(
        {
          name: "voyant-sdk-types-test",
          private: true,
          type: "module",
        },
        null,
        2,
      ),
    );

    for (const [packageName, tarballPath] of tarballs) {
      installPackedPackage(appDir, tarballPath, packageName);
    }

    writeFileSync(
      path.join(appDir, "tsconfig.json"),
      JSON.stringify(
        {
          compilerOptions: {
            module: "NodeNext",
            moduleResolution: "NodeNext",
            noEmit: true,
            strict: true,
            target: "ES2022",
          },
          include: ["index.ts"],
        },
        null,
        2,
      ),
    );

    writeFileSync(
      path.join(appDir, "index.ts"),
      `
        import {
          createVoyantConnectClient,
          VoyantConnectClient,
          type AuditLogPage,
          type ConnectionSummary,
          type CreateConnectionInput,
          type CreateOperatorInput,
          type IssueTokenInput,
          type OAuthTokenResponse,
          type OperatorSummary,
          type VoyantConnectClientOptions,
        } from "@voyantjs/connect-sdk";

        const connect: VoyantConnectClient = createVoyantConnectClient({
          apiKey: "connect_key",
        } satisfies VoyantConnectClientOptions);

        const tokenInput: IssueTokenInput = {
          clientId: "client_id",
          clientSecret: "client_secret",
        };
        const tokenPromise: Promise<OAuthTokenResponse> = connect.oauth.issueToken(tokenInput);

        const operatorsPromise: Promise<OperatorSummary[]> = connect.operators.list();
        const createOperatorInput: CreateOperatorInput = {
          slug: "alpine",
          name: "Alpine",
        };
        const operatorPromise: Promise<OperatorSummary> = connect.operators.create(createOperatorInput);

        const connectionsPromise: Promise<ConnectionSummary[]> = connect.connections.list("op_1");
        const createConnectionInput: CreateConnectionInput = {
          supplierName: "Alpine Adventures",
        };
        const connectionPromise: Promise<ConnectionSummary> = connect.connections.create(
          "op_1",
          createConnectionInput,
        );

        const auditLogsPromise: Promise<AuditLogPage> = connect.auditLogs.list({});
        const flightStreamPromise: Promise<Response> = connect.flights.searchStream({
          origin: "DUB",
          destination: "JFK",
          departureDate: "2026-06-01",
          passengers: [{ type: "adult", count: 1 }],
        });

        void tokenPromise;
        void operatorsPromise;
        void operatorPromise;
        void connectionsPromise;
        void connectionPromise;
        void auditLogsPromise;
        void flightStreamPromise;
      `,
    );

    execFileSync(
      process.execPath,
      [path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"), "-p", appDir],
      {
        cwd: appDir,
        encoding: "utf8",
      },
    );
  } finally {
    rmSync(appDir, { force: true, recursive: true });
  }
}

try {
  const tarballs = new Map();

  for (const pkg of packages) {
    const tarballPath = packPackage(pkg.dir);
    const manifest = readPackedManifest(tarballPath);
    const files = readPackedFileList(tarballPath);
    tarballs.set(pkg.expectedName, tarballPath);

    assert.equal(manifest.name, pkg.expectedName);
    assert.equal(manifest.main, "./dist/index.js");
    assert.equal(manifest.types, "./dist/index.d.ts");
    assert.equal(manifest.publishConfig?.access, "public");
    assert.equal(manifest.exports?.["."].import, "./dist/index.js");
    assert.equal(manifest.exports?.["."].types, "./dist/index.d.ts");

    assert.deepEqual(manifest.bundleDependencies, ["@voyant-sdk/sdk-core"]);
    assert.equal(manifest.dependencies?.["@voyant-sdk/sdk-core"], "0.1.0");

    assert.ok(files.includes("package/README.md"));
    assert.ok(files.includes("package/package.json"));
    assert.ok(files.includes("package/dist/index.js"));
    assert.ok(files.includes("package/dist/index.d.ts"));
    assert.ok(files.includes("package/node_modules/@voyant-sdk/sdk-core/package.json"));
    assert.ok(files.includes("package/node_modules/@voyant-sdk/sdk-core/dist/index.js"));
    assert.ok(files.includes("package/node_modules/@voyant-sdk/sdk-core/dist/index.d.ts"));

    const hasSrcFiles = files.some((file) => file.startsWith("package/src/"));
    assert.equal(hasSrcFiles, false);
  }

  verifyInstalledImports(tarballs);
  verifyInstalledTypecheck(tarballs);

  console.log("Package artifact verification passed.");
} finally {
  rmSync(packDir, { force: true, recursive: true });
}
