export type ConnectProviderDirection = "inbound" | "outbound" | "bidirectional";

export type ConnectProviderCategory =
  | "activity"
  | "accommodation"
  | "airline"
  | "cruise"
  | "charter"
  | "transport"
  | "restaurant"
  | "content"
  | "other";

export type ConnectProviderAuthModel =
  | "bring_your_own_credentials"
  | "oauth"
  | "api_key"
  | "manual";

export type ConnectProviderAccessModel =
  | "credential_scoped"
  | "operator_scoped"
  | "network_scoped";

export type ConnectProviderCredentialValidationResult = {
  allowedMarkets?: string[];
  scope?: Record<string, unknown>;
};

export type ConnectProviderDescriptor<TCredentials = unknown> = {
  key: string;
  displayName: string;
  description?: string;
  authModel: ConnectProviderAuthModel;
  accessModel: ConnectProviderAccessModel;
  supportedDirections: ConnectProviderDirection[];
  categoryCoverage: ConnectProviderCategory[];
  supportsMarkets?: boolean;
  metadata?: Record<string, unknown>;
  parseCredentials?: (raw: unknown) => TCredentials;
  validateCredentials?: (
    credentials: TCredentials,
  ) => ConnectProviderCredentialValidationResult;
};

export type ConnectConnectionContext<TCredentials = unknown> = {
  connectionId: string;
  operatorId: string;
  providerKey: string;
  credentials: TCredentials;
  market?: string | null;
  locale?: string | null;
  currency?: string | null;
  now?: Date;
};

export class ConnectProviderSdkError extends Error {
  readonly code: string;
  readonly status?: number;

  constructor(message: string, options: { code?: string; status?: number } = {}) {
    super(message);
    this.name = "ConnectProviderSdkError";
    this.code = options.code ?? "connect_provider_sdk_error";
    this.status = options.status;
  }
}

export function defineConnectProvider<TCredentials>(
  descriptor: ConnectProviderDescriptor<TCredentials>,
): ConnectProviderDescriptor<TCredentials> {
  assertProviderKey(descriptor.key);
  if (descriptor.displayName.trim().length === 0) {
    throw new ConnectProviderSdkError("Provider displayName is required", {
      code: "invalid_provider_display_name",
    });
  }
  if (descriptor.supportedDirections.length === 0) {
    throw new ConnectProviderSdkError("Provider must declare at least one direction", {
      code: "invalid_provider_directions",
    });
  }
  if (descriptor.categoryCoverage.length === 0) {
    throw new ConnectProviderSdkError("Provider must declare at least one category", {
      code: "invalid_provider_categories",
    });
  }
  return Object.freeze({ ...descriptor });
}

export function assertProviderKey(key: string): string {
  if (!/^[a-z][a-z0-9-]{1,62}$/.test(key)) {
    throw new ConnectProviderSdkError(
      "Provider key must be lowercase kebab-case, start with a letter, and be 2-63 characters",
      { code: "invalid_provider_key" },
    );
  }
  return key;
}

export function parseJsonCredentials(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    throw new ConnectProviderSdkError("Credentials must be valid JSON", {
      code: "invalid_credentials_json",
      status: 400,
    });
  }
}

export {
  CONNECTOR_WORKER_PROTOCOL_VERSION,
  connectorError,
  connectorWorkerManifestPath,
  connectorWorkerOperationPaths,
  ok,
} from "./hosted-worker.js";
export type {
  ConnectorWorkerContext,
  ConnectorWorkerManifest,
  ConnectorWorkerOperation,
  ConnectorWorkerRequest,
  ConnectorWorkerResponse,
  HostedConnectorWorkerDeployment,
} from "./hosted-worker.js";
