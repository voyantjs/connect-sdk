import assert from "node:assert/strict";
import {
  mkdtempSync,
  mkdirSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const packDir = mkdtempSync(path.join(tmpdir(), "voyant-sdk-pack-"));

function readPackageVersion(relativePath) {
  const manifestPath = path.join(repoRoot, relativePath, "package.json");
  const raw = execFileSync(
    "node",
    [
      "-e",
      `process.stdout.write(require(${JSON.stringify(manifestPath)}).version)`,
    ],
    {
      encoding: "utf8",
    },
  );
  return raw.trim();
}

const sdkCoreVersion = readPackageVersion("packages/sdk-core");
const connectSdkVersion = readPackageVersion("packages/connect-sdk");

const packages = [
  {
    dir: path.join(repoRoot, "packages", "connect-sdk"),
    expectedName: "@voyantjs/connect-sdk",
    dependencies: {
      "@voyant-sdk/sdk-core": sdkCoreVersion,
    },
    bundleDependencies: ["@voyant-sdk/sdk-core"],
    bundledFiles: [
      "package/node_modules/@voyant-sdk/sdk-core/package.json",
      "package/node_modules/@voyant-sdk/sdk-core/dist/index.js",
      "package/node_modules/@voyant-sdk/sdk-core/dist/index.d.ts",
    ],
  },
  {
    dir: path.join(repoRoot, "packages", "connect-provider-sdk"),
    expectedName: "@voyantjs/connect-provider-sdk",
    dependencies: {},
    bundleDependencies: undefined,
    bundledFiles: [],
    extraExports: {
      "./hosted-worker": {
        import: "./dist/hosted-worker.js",
        types: "./dist/hosted-worker.d.ts",
      },
    },
    extraFiles: [
      "package/dist/hosted-worker.js",
      "package/dist/hosted-worker.d.ts",
    ],
  },
  {
    dir: path.join(repoRoot, "packages", "connect-cruises"),
    expectedName: "@voyantjs/connect-cruises",
    dependencies: {
      "@voyantjs/connect-sdk": connectSdkVersion,
    },
    bundleDependencies: undefined,
    bundledFiles: [],
  },
  {
    dir: path.join(repoRoot, "packages", "connect-adapter"),
    expectedName: "@voyantjs/connect-adapter",
    dependencies: {
      "@voyantjs/catalog": "*",
      "@voyantjs/connect-sdk": connectSdkVersion,
    },
    bundleDependencies: undefined,
    bundledFiles: [],
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
  const raw = execFileSync(
    "tar",
    ["-xOf", tarballPath, "package/package.json"],
    {
      encoding: "utf8",
    },
  );

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
  execFileSync("tar", ["-xzf", tarballPath, "-C", extractDir], {
    encoding: "utf8",
  });
  renameSync(path.join(extractDir, "package"), packageDir);
  rmSync(extractDir, { force: true, recursive: true });
}

function createCatalogTypeStub(appDir) {
  const catalogDir = path.join(appDir, "node_modules", "@voyantjs", "catalog");
  mkdirSync(path.join(catalogDir, "adapter"), { recursive: true });
  writeFileSync(
    path.join(catalogDir, "package.json"),
    JSON.stringify(
      {
        name: "@voyantjs/catalog",
        type: "module",
        exports: {
          "./adapter/contract": "./adapter/contract.d.ts",
          "./provenance": "./provenance.d.ts",
        },
      },
      null,
      2,
    ),
  );
  writeFileSync(
    path.join(catalogDir, "adapter", "contract.d.ts"),
    [
      "export type SourceAdapter = { kind: string; capabilities: AdapterCapabilities; discover?: Function; liveResolve?: Function; getContent?: Function; reserve?: Function; cancel?: Function; getReservation?: Function; listReservations?: Function };",
      "export type AdapterCapabilities = { verticals: string[]; supportsLiveResolution: boolean; supportsDriftDetection: boolean; supportsBookingForwarding: boolean; postBookOperations: readonly string[]; [key: string]: unknown };",
      "export type SourceAdapterContext = { connection_id: string; credentials?: Record<string, string>; tenant_id?: string; correlation_id?: string };",
      "export type DiscoveryCursor = string | undefined;",
      "export type CatalogProjection = { entity_module: string; entity_id: string; provenance: unknown; fields: Record<string, unknown> };",
      "export type DiscoveryPage = { projections: CatalogProjection[]; next_cursor: DiscoveryCursor };",
      "export type SourceAdapterRequestScope = { locale: string; audience: string; market: string; currency?: string };",
      "export type LiveResolveRequest = { ids: string[]; scope: SourceAdapterRequestScope; parameters?: Record<string, unknown> };",
      "export type LiveResolveResult = { values: Record<string, Record<string, unknown>>; failed?: Record<string, string> };",
      "export type GetContentRequest = { entity_module: string; entity_id: string; locale: string; market?: string; currency?: string };",
      "export type GetContentResult = { entity_module: string; entity_id: string; source_ref: string; returned_locale: string; content: unknown; content_schema_version: string };",
      "export type ReserveRequest = { entity_module: string; entity_id: string; parameters: Record<string, unknown>; idempotency_key?: string };",
      "export type ReserveResult = { upstream_ref: string; status: 'held' | 'confirmed' | 'ticketed' | 'failed'; upstream_payload?: Record<string, unknown> };",
      "export type CancelRequest = { upstream_ref: string; reason?: string; idempotency_key?: string };",
      "export type CancelResult = { status: 'cancelled' | 'pending' | 'refused' | 'failed' };",
      "export type ReservationStatus = ReserveResult['status'] | CancelResult['status'] | 'cancelling';",
      "export type GetReservationRequest = { upstream_ref: string; scope?: SourceAdapterRequestScope };",
      "export type GetReservationResult = { upstream_ref: string; status: ReservationStatus; source_updated_at?: Date; upstream_payload?: Record<string, unknown> };",
      "export type ListReservationsQuery = { cursor?: DiscoveryCursor; limit?: number; status?: readonly ReservationStatus[]; updated_after?: Date; scope?: SourceAdapterRequestScope };",
      "export type ListReservationsPage = { reservations: GetReservationResult[]; next_cursor: DiscoveryCursor };",
      "export type ConnectionState = 'active' | 'paused' | 'disconnected' | 'error';",
      "",
    ].join("\n"),
  );
  writeFileSync(
    path.join(catalogDir, "provenance.d.ts"),
    [
      "export type Provenance = { source_kind: string; source_provider?: string; source_connection_id?: string; source_ref?: string; source_freshness: 'sync' | 'event' | 'request' | 'static' | null; last_sourced_at?: Date };",
      "",
    ].join("\n"),
  );
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
          import { defineConnectProvider } from "@voyantjs/connect-provider-sdk";
          import { CONNECTOR_WORKER_PROTOCOL_VERSION } from "@voyantjs/connect-provider-sdk/hosted-worker";
          import { createConnectCruiseAdapter } from "@voyantjs/connect-cruises";
          import { createVoyantConnectSourceAdapter } from "@voyantjs/connect-adapter";

          const connect = createVoyantConnectClient({ apiKey: "connect_key" });
          const provider = defineConnectProvider({
            key: "example-cruises",
            displayName: "Example Cruises",
            authModel: "bring_your_own_credentials",
            accessModel: "credential_scoped",
            supportedDirections: ["inbound"],
            categoryCoverage: ["cruise"],
          });
          const cruiseAdapter = createConnectCruiseAdapter({ client: connect });
          const sourceAdapter = createVoyantConnectSourceAdapter({
            client: connect,
            operatorId: "op_1",
          });

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
          assert.equal(typeof connect.products.list, "function");
          assert.equal(typeof connect.products.listOnConnection, "function");
          assert.equal(typeof connect.options.listUnits, "function");
          assert.equal(typeof connect.suppliers.list, "function");
          assert.equal(typeof connect.availability.list, "function");
          assert.equal(typeof connect.availability.calendar, "function");
          assert.equal(typeof connect.bookings.list, "function");
          assert.equal(typeof connect.bookings.listAll, "function");
          assert.equal(typeof connect.bookings.create, "function");
          assert.equal(typeof connect.bookings.listActivities, "function");
          assert.equal(typeof connect.health.get, "function");
          assert.equal(typeof connect.flights.search, "function");
          assert.equal(typeof connect.flights.searchStream, "function");
          assert.equal(typeof connect.flights.book, "function");
          assert.equal(CONNECTOR_WORKER_PROTOCOL_VERSION, "2026-05-28");
          assert.equal(provider.key, "example-cruises");
          assert.equal(typeof cruiseAdapter.listEntries, "function");
          assert.equal(sourceAdapter.kind, "voyant-connect");
          assert.equal(typeof sourceAdapter.discover, "function");
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
    createCatalogTypeStub(appDir);

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
        import {
          defineConnectProvider,
          type ConnectProviderDescriptor,
        } from "@voyantjs/connect-provider-sdk";
        import {
          CONNECTOR_WORKER_PROTOCOL_VERSION,
          connectorError,
          connectorWorkerManifestPath,
          connectorWorkerOperationPaths,
          ok,
          type ConnectorWorkerManifest,
          type ConnectorWorkerRequest,
          type ConnectorWorkerResponse,
        } from "@voyantjs/connect-provider-sdk/hosted-worker";
        import {
          createConnectCruiseAdapter,
          type ConnectCruiseAdapter,
        } from "@voyantjs/connect-cruises";
        import {
          createVoyantConnectSourceAdapter,
          type SourceAdapter,
        } from "@voyantjs/connect-adapter";

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
        const provider: ConnectProviderDescriptor = defineConnectProvider({
          key: "example-cruises",
          displayName: "Example Cruises",
          authModel: "bring_your_own_credentials",
          accessModel: "credential_scoped",
          supportedDirections: ["inbound"],
          categoryCoverage: ["cruise"],
        });
        const cruiseAdapter: ConnectCruiseAdapter = createConnectCruiseAdapter({ client: connect });
        const sourceAdapter: SourceAdapter = createVoyantConnectSourceAdapter({
          client: connect,
          operatorId: "op_1",
        });
        const manifest: ConnectorWorkerManifest = {
          protocolVersion: CONNECTOR_WORKER_PROTOCOL_VERSION,
          providerKey: "example-cruises",
          categories: ["cruise"],
          capabilities: ["validateCredentials", "health"],
        };
        const workerRequest: ConnectorWorkerRequest = {
          protocolVersion: CONNECTOR_WORKER_PROTOCOL_VERSION,
          operation: "validateCredentials",
          context: { connectionId: "conn_1" },
          input: {},
        };
        const workerResponse: ConnectorWorkerResponse = ok({
          path: connectorWorkerManifestPath,
          validatePath: connectorWorkerOperationPaths.validateCredentials,
        });
        const workerError: ConnectorWorkerResponse = connectorError("invalid_credentials", "Nope");

        void tokenPromise;
        void operatorsPromise;
        void operatorPromise;
        void connectionsPromise;
        void connectionPromise;
        void auditLogsPromise;
        void flightStreamPromise;
        void provider;
        void cruiseAdapter;
        void sourceAdapter;
        void manifest;
        void workerRequest;
        void workerResponse;
        void workerError;
      `,
    );

    execFileSync(
      process.execPath,
      [
        path.join(repoRoot, "node_modules", "typescript", "bin", "tsc"),
        "-p",
        appDir,
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
    for (const [subpath, expectedExport] of Object.entries(
      pkg.extraExports ?? {},
    )) {
      assert.deepEqual(manifest.exports?.[subpath], expectedExport);
    }

    if (pkg.bundleDependencies === undefined) {
      assert.equal(manifest.bundleDependencies, undefined);
    } else {
      assert.deepEqual(manifest.bundleDependencies, pkg.bundleDependencies);
    }
    for (const [dependency, expectedVersion] of Object.entries(
      pkg.dependencies,
    )) {
      assert.equal(manifest.dependencies?.[dependency], expectedVersion);
    }

    assert.ok(files.includes("package/README.md"));
    assert.ok(files.includes("package/package.json"));
    assert.ok(files.includes("package/dist/index.js"));
    assert.ok(files.includes("package/dist/index.d.ts"));
    for (const extraFile of pkg.extraFiles ?? []) {
      assert.ok(files.includes(extraFile));
    }
    for (const bundledFile of pkg.bundledFiles) {
      assert.ok(files.includes(bundledFile));
    }

    const hasSrcFiles = files.some((file) => file.startsWith("package/src/"));
    assert.equal(hasSrcFiles, false);
  }

  verifyInstalledImports(tarballs);
  verifyInstalledTypecheck(tarballs);

  console.log("Package artifact verification passed.");
} finally {
  rmSync(packDir, { force: true, recursive: true });
}
