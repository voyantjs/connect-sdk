export const CONNECTOR_WORKER_PROTOCOL_VERSION = "2026-05-28" as const;
export const connectorWorkerManifestPath = "/.well-known/voyant-connect/manifest" as const;

export type ConnectorWorkerOperation =
  | "validateCredentials"
  | "syncCatalog"
  | "syncPricing"
  | "searchCruises"
  | "quoteCruise"
  | "lockCruise"
  | "confirmCruise"
  | "cancelCruise"
  | "getCruiseBooking"
  | "health";

export const connectorWorkerOperationPaths: Record<ConnectorWorkerOperation, string> = {
  validateCredentials: "/validate-credentials",
  syncCatalog: "/sync/catalog",
  syncPricing: "/sync/pricing",
  searchCruises: "/cruises/search",
  quoteCruise: "/cruises/quote",
  lockCruise: "/cruises/lock",
  confirmCruise: "/cruises/confirm",
  cancelCruise: "/cruises/cancel",
  getCruiseBooking: "/cruises/bookings/get",
  health: "/health",
};

export type ConnectorWorkerContext = {
  connectionId: string;
  operatorId?: string | null;
  connection?: {
    id?: string;
    name?: string;
    providerKey: string;
    adapterKey?: string;
    direction?: "inbound" | "outbound";
    categories?: string[];
    status?: "active" | "paused";
  };
  credentials?: Record<string, string>;
  marketContext?: {
    market?: string | null;
    language?: string | null;
    currency?: string | null;
  };
  now?: string;
};

export type ConnectorWorkerManifest = {
  protocolVersion: typeof CONNECTOR_WORKER_PROTOCOL_VERSION | string;
  providerKey: string;
  displayName?: string;
  categories: string[];
  capabilities: ConnectorWorkerOperation[];
};

export type HostedConnectorWorkerDeployment = {
  type: "hosted_worker";
  scriptName: string;
  protocolVersion?: string;
};

export type ConnectorWorkerRequest<TInput = unknown> = {
  protocolVersion: typeof CONNECTOR_WORKER_PROTOCOL_VERSION;
  operation: ConnectorWorkerOperation;
  context: ConnectorWorkerContext;
  input: TInput;
};

export type ConnectorWorkerResponse<TData = unknown> =
  | { ok: true; data: TData }
  | {
      ok: false;
      error: {
        code?: string;
        message: string;
        details?: unknown;
      };
    };

export function ok<TData>(data: TData): ConnectorWorkerResponse<TData> {
  return { ok: true, data };
}

export function connectorError(
  code: string,
  message: string,
  details?: unknown,
): ConnectorWorkerResponse<never> {
  return { ok: false, error: { code, message, details } };
}
