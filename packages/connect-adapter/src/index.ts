import {
  createVoyantConnectClient,
  type ConnectAvailabilityQuery,
  type CreateBookingInput,
  type CruiseConfirmInput,
  type CruiseLockSelectionInput,
  type CruiseSearchQuery,
  type SearchDocument,
  type StayConfirmInput,
  type StaySearchQuery,
  type VoyantConnectClient,
  type VoyantConnectClientOptions,
} from "@voyantjs/connect-sdk";
import type {
  AdapterCapabilities,
  CancelRequest,
  CancelResult,
  CatalogProjection,
  GetContentRequest,
  GetContentResult,
  LiveResolveRequest,
  LiveResolveResult,
  ReservationStatus,
  ReserveRequest,
  ReserveResult,
  SourceAdapter,
  SourceAdapterContext,
} from "@voyantjs/catalog/adapter/contract";

type JsonRecord = Record<string, unknown>;

export type {
  AdapterCapabilities,
  CancelRequest,
  CancelResult,
  CatalogProjection,
  ConnectionState,
  DiscoveryCursor,
  DiscoveryPage,
  GetContentRequest,
  GetContentResult,
  GetReservationRequest,
  GetReservationResult,
  ListReservationsPage,
  ListReservationsQuery,
  LiveResolveRequest,
  LiveResolveResult,
  ReservationStatus,
  ReserveRequest,
  ReserveResult,
  SourceAdapter,
  SourceAdapterContext,
  SourceAdapterRequestScope,
} from "@voyantjs/catalog/adapter/contract";
export type { Provenance } from "@voyantjs/catalog/provenance";

export interface VoyantConnectSourceAdapterOptions {
  client?: VoyantConnectClient;
  connect?: VoyantConnectClientOptions;
  operatorId?: string;
  sourceKind?: string;
  sourceProvider?: string;
  connectionIds?: string[];
  market?: string;
  discoverLimit?: number;
  capabilities?: Partial<AdapterCapabilities>;
  mapDocument?: (
    document: SearchDocument,
    defaults: ProjectionDefaults,
  ) => CatalogProjection | null;
  liveResolve?: (
    ctx: SourceAdapterContext,
    request: LiveResolveRequest,
    client: VoyantConnectClient,
  ) => Promise<LiveResolveResult>;
  getContent?: (
    ctx: SourceAdapterContext,
    request: GetContentRequest,
    client: VoyantConnectClient,
  ) => Promise<GetContentResult>;
  reserve?: (
    ctx: SourceAdapterContext,
    request: ReserveRequest,
    client: VoyantConnectClient,
  ) => Promise<ReserveResult>;
  cancel?: (
    ctx: SourceAdapterContext,
    request: CancelRequest,
    client: VoyantConnectClient,
  ) => Promise<CancelResult>;
}

export interface ProjectionDefaults {
  sourceKind: string;
  sourceProvider?: string;
  connectionId: string;
  operatorId?: string;
}

export interface VoyantConnectAdapterContextInput {
  sourceConnectionId?: string | null;
  sourceKind?: string | null;
  fallbackConnectionId?: string | null;
  credentials?: Record<string, string>;
  tenantId?: string;
  correlationId?: string;
}

export function resolveVoyantConnectAdapterContext(
  input: VoyantConnectAdapterContextInput,
): SourceAdapterContext {
  const connectionId = input.sourceConnectionId ?? input.fallbackConnectionId;
  if (!connectionId || connectionId === "engine") {
    throw new Error(
      "Voyant Connect adapter context requires the quote or sourced row source_connection_id. Configure catalog resolveAdapterContext to pass provenance.sourceConnectionId for book/cancel/status calls.",
    );
  }
  if (input.sourceKind && input.sourceKind !== "voyant-connect") {
    throw new Error(
      `Voyant Connect adapter cannot handle source kind ${input.sourceKind}`,
    );
  }
  return {
    connection_id: connectionId,
    ...(input.credentials ? { credentials: input.credentials } : {}),
    ...(input.tenantId ? { tenant_id: input.tenantId } : {}),
    ...(input.correlationId ? { correlation_id: input.correlationId } : {}),
  };
}

export function createVoyantConnectSourceAdapter(
  options: VoyantConnectSourceAdapterOptions,
): SourceAdapter {
  const client = options.client ?? createClient(options);
  const sourceKind = options.sourceKind ?? "voyant-connect";
  const capabilities = mergeCapabilities(options.capabilities);

  return {
    kind: sourceKind,
    capabilities,

    async connect() {
      return undefined;
    },

    async pause() {
      return undefined;
    },

    async disconnect() {
      return undefined;
    },

    async getState(ctx) {
      const connectionId = requireConnectConnectionId(ctx);
      const connection = await client.connections.get(
        resolveOperatorId(options),
        connectionId,
      );
      if (connection.status === "paused") return "paused";
      if (connection.status === "errored") return "error";
      if (connection.status === "active") return "active";
      return "disconnected";
    },

    async discover(ctx, cursor) {
      const connectionId = requireConnectConnectionId(ctx);
      const connectionIds = options.connectionIds ?? [connectionId];
      const documentPages = await Promise.all(
        connectionIds.map((id) =>
          client.operators.listSearchDocuments(resolveOperatorId(options), {
            connectionId: id,
            limit: options.discoverLimit,
            market: options.market,
            updatedSince: cursor,
          }),
        ),
      );
      const documents = documentPages.flat();
      const defaults = {
        sourceKind,
        sourceProvider: options.sourceProvider,
        connectionId,
        operatorId: resolveOperatorId(options),
      } satisfies ProjectionDefaults;
      return {
        projections: documents
          .map((document) =>
            (options.mapDocument ?? mapSearchDocumentToProjection)(
              document,
              defaults,
            ),
          )
          .filter(
            (projection): projection is CatalogProjection =>
              projection !== null,
          ),
        next_cursor: undefined,
      };
    },

    async freshnessCheck(ctx, entityId) {
      const connectionId = requireConnectConnectionId(ctx);
      const documents = await client.operators.listSearchDocuments(
        resolveOperatorId(options),
        {
          connectionId,
          limit: 1,
        },
      );
      const document = documents.find(
        (item) => item.id === entityId || item.payload.id === entityId,
      );
      if (!document) return undefined;
      return { etag: document.id, updated_at: new Date(document.updatedAt) };
    },

    async liveResolve(ctx, request) {
      if (options.liveResolve) return options.liveResolve(ctx, request, client);
      return liveResolveFromConnect(client, ctx, request);
    },

    async getContent(ctx, request) {
      if (options.getContent) return options.getContent(ctx, request, client);
      return getContentFromConnect(client, ctx, request);
    },

    async reserve(ctx, request) {
      if (options.reserve) return options.reserve(ctx, request, client);
      return reserveThroughConnect(client, ctx, request);
    },

    async cancel(ctx, request) {
      if (options.cancel) return options.cancel(ctx, request, client);
      return cancelThroughConnect(client, ctx, request);
    },

    async getReservation(ctx, request) {
      const connectionId = requireConnectConnectionId(ctx);
      const ref = parseUpstreamRef(request.upstream_ref);
      const booking = await getBookingByRef(client, connectionId, ref);
      if (!booking) return null;
      return {
        upstream_ref: request.upstream_ref,
        status: reservationStatusFromConnect(getString(booking, "status")),
        source_updated_at: dateFromString(getString(booking, "updatedAt")),
        upstream_payload: booking,
      };
    },

    async listReservations(ctx, query) {
      const connectionId = requireConnectConnectionId(ctx);
      const rows = await client.bookings.list(connectionId, {
        localDateStart: query.updated_after?.toISOString(),
      });
      return {
        reservations: rows.map((row) => ({
          upstream_ref: `booking:${getString(row, "id") ?? getString(row, "externalBookingId") ?? ""}`,
          status: reservationStatusFromConnect(getString(row, "status")),
          source_updated_at: dateFromString(getString(row, "updatedAt")),
          upstream_payload: row,
        })),
        next_cursor: undefined,
      };
    },
  } satisfies SourceAdapter;
}

export function mapSearchDocumentToProjection(
  document: SearchDocument,
  defaults: ProjectionDefaults,
): CatalogProjection | null {
  const payload = document.payload;
  if (isCatalogProjection(payload)) {
    return withProjectionDefaults(payload, document, defaults);
  }

  const entityId =
    getString(payload, "id") ?? getString(payload, "productId") ?? document.id;
  const source = getRecord(payload, "source");
  const freshness = getRecord(payload, "freshness");
  const sourceConnectionId =
    getString(source, "connectionId") ??
    getString(payload, "connectionId") ??
    document.connectionId ??
    defaults.connectionId;
  const sourceProvider =
    defaults.sourceProvider ?? getString(source, "providerKey");
  const refreshedAt = getString(freshness, "refreshedAt") ?? document.updatedAt;
  const sourceRef = getSourceRef(payload, entityId);
  const imageUrl = getString(payload, "imageUrl") ?? null;
  const priceFrom = getRecordOrNull(payload, "priceFrom");

  return {
    entity_module: categoryToEntityModule(getString(payload, "category")),
    entity_id: entityId,
    provenance: {
      source_kind: defaults.sourceKind,
      ...(sourceProvider ? { source_provider: sourceProvider } : {}),
      source_connection_id: sourceConnectionId,
      source_ref: sourceRef,
      source_freshness: "sync",
      ...(refreshedAt ? { last_sourced_at: new Date(refreshedAt) } : {}),
    },
    fields: {
      id: entityId,
      "source.kind": defaults.sourceKind,
      "source.ref": sourceRef,
      "source.connection_id": sourceConnectionId,
      "seller.operator_id": defaults.operatorId ?? document.operatorId,
      supplierId: getString(payload, "supplierId") ?? null,
      productId: getString(payload, "productId") ?? entityId,
      optionId: getString(payload, "optionId") ?? null,
      category: getString(payload, "category") ?? null,
      active: true,
      status: availabilityStatusToCatalogStatus(
        getString(payload, "availabilityStatus"),
      ),
      name:
        getString(payload, "name") ?? getString(payload, "title") ?? entityId,
      title: getString(payload, "title") ?? entityId,
      summary: getString(payload, "summary") ?? null,
      description:
        getString(payload, "description") ??
        getString(payload, "summary") ??
        null,
      shortDescription:
        getString(payload, "shortDescription") ??
        getString(payload, "summary") ??
        null,
      thumbnailUrl: imageUrl,
      heroImageUrl: imageUrl,
      searchable_text: getString(payload, "searchableText") ?? "",
      destinations: getStringArray(payload, "destinations"),
      country_codes: getStringArray(payload, "countryCodes"),
      countryCodes: getStringArray(payload, "countryCodes"),
      tags: getStringArray(payload, "tags"),
      image_url: getString(payload, "imageUrl") ?? null,
      price_from: priceFrom,
      lowestPriceCached: moneyToDecimalString(priceFrom),
      lowestPriceCachedCurrency: getString(priceFrom ?? {}, "currency") ?? null,
      cruiseType: normalizeCruiseType(getString(payload, "cruiseType")),
      nights: getNumber(payload, "nights"),
      embarkationPortCode: getString(payload, "embarkationPortCode") ?? null,
      disembarkationPortCode:
        getString(payload, "disembarkationPortCode") ?? null,
      availability_status: getString(payload, "availabilityStatus") ?? null,
      market_context: payload.marketContext ?? document.market ?? null,
      connect_document: payload,
    },
  };
}

function mergeCapabilities(
  overrides: Partial<AdapterCapabilities> | undefined,
): AdapterCapabilities {
  return {
    verticals: ["products", "accommodations", "cruises", "stays", "flights"],
    supportsLiveResolution: true,
    supportsDriftDetection: false,
    supportsBookingForwarding: true,
    supportsReservationRetrieval: true,
    supportsSyncCancellation: true,
    postBookOperations: ["cancel", "status"],
    cacheTtlSeconds: 60,
    supportsContentFetch: true,
    ownsContentCache: false,
    ownsAvailabilityCache: true,
    ...overrides,
  };
}

function createClient(
  options: VoyantConnectSourceAdapterOptions,
): VoyantConnectClient {
  if (!options.connect) {
    throw new Error(
      "createVoyantConnectSourceAdapter requires either client or connect options",
    );
  }
  return createVoyantConnectClient(options.connect);
}

function resolveOperatorId(options: VoyantConnectSourceAdapterOptions): string {
  const operatorId =
    options.operatorId ??
    options.connect?.operatorId ??
    options.client?.defaultOperatorId;
  if (!operatorId) {
    throw new Error(
      "createVoyantConnectSourceAdapter requires operatorId for catalog discovery",
    );
  }
  return operatorId;
}

function requireConnectConnectionId(ctx: SourceAdapterContext): string {
  if (!ctx.connection_id || ctx.connection_id === "engine") {
    throw new Error(
      "Voyant Connect adapter calls require SourceAdapterContext.connection_id to be the Connect source_connection_id.",
    );
  }
  return ctx.connection_id;
}

function withProjectionDefaults(
  projection: CatalogProjection,
  document: SearchDocument,
  defaults: ProjectionDefaults,
): CatalogProjection {
  const sourceConnectionId =
    projection.provenance.source_connection_id ??
    document.connectionId ??
    defaults.connectionId;
  return {
    ...projection,
    provenance: {
      ...projection.provenance,
      source_kind: projection.provenance.source_kind || defaults.sourceKind,
      ...(defaults.sourceProvider && !projection.provenance.source_provider
        ? { source_provider: defaults.sourceProvider }
        : {}),
      source_connection_id: sourceConnectionId,
      source_ref: projection.provenance.source_ref ?? document.id,
      source_freshness: projection.provenance.source_freshness ?? "sync",
    },
  };
}

async function liveResolveFromConnect(
  client: VoyantConnectClient,
  ctx: SourceAdapterContext,
  request: LiveResolveRequest,
): Promise<LiveResolveResult> {
  const connectionId = requireConnectConnectionId(ctx);
  if (request.parameters?.connectRoute === "stays") {
    return liveResolveStays(client, connectionId, request);
  }
  if (request.parameters?.connectRoute === "cruises") {
    return liveResolveCruises(client, connectionId, request);
  }
  return liveResolveAvailability(client, connectionId, request);
}

async function liveResolveAvailability(
  client: VoyantConnectClient,
  connectionId: string,
  request: LiveResolveRequest,
): Promise<LiveResolveResult> {
  const values: Record<string, JsonRecord> = {};
  const failed: LiveResolveResult["failed"] = {};
  const baseQuery = request.parameters ?? {};

  await Promise.all(
    request.ids.map(async (id) => {
      try {
        const slots = await client.availability.list(connectionId, {
          ...baseQuery,
          productId: getString(baseQuery, "productId") ?? id,
        } as ConnectAvailabilityQuery);
        values[id] = {
          available: slots.some((slot) => getBoolean(slot, "available")),
          availability: slots,
          price: lowestSlotPrice(slots),
          price_from: lowestSlotPrice(slots),
          lowestPriceCached: moneyToDecimalString(lowestSlotPrice(slots)),
          lowestPriceCachedCurrency:
            getString(lowestSlotPrice(slots) ?? {}, "currency") ?? null,
          refreshed_at: new Date().toISOString(),
        };
      } catch {
        failed[id] = "error";
      }
    }),
  );

  return Object.keys(failed).length > 0 ? { values, failed } : { values };
}

async function liveResolveStays(
  client: VoyantConnectClient,
  connectionId: string,
  request: LiveResolveRequest,
): Promise<LiveResolveResult> {
  const response = await client.stays.search(
    connectionId,
    request.parameters as unknown as StaySearchQuery,
  );
  const values: Record<string, JsonRecord> = {};
  for (const offer of response.offers) {
    if (
      request.ids.includes(offer.accommodationId) ||
      request.ids.includes(offer.id)
    ) {
      const value = {
        available: true,
        offer,
        price: offer.totals.total,
        expires_at: offer.expiresAt,
      };
      values[offer.accommodationId] = value;
      values[offer.id] = value;
    }
  }
  return withMissingFailures(request.ids, values);
}

async function liveResolveCruises(
  client: VoyantConnectClient,
  connectionId: string,
  request: LiveResolveRequest,
): Promise<LiveResolveResult> {
  const response = await client.cruises.search(
    connectionId,
    request.parameters as unknown as CruiseSearchQuery,
  );
  const values: Record<string, JsonRecord> = {};
  for (const offer of response.offers) {
    if (
      request.ids.includes(offer.cruiseId) ||
      request.ids.includes(offer.sailingId) ||
      request.ids.includes(offer.id)
    ) {
      const value = {
        available: true,
        offer,
        price: offer.pricing.totalPrice,
        expires_at: offer.expiresAt,
      };
      values[offer.cruiseId] = value;
      values[offer.sailingId] = value;
      values[offer.id] = value;
    }
  }
  return withMissingFailures(request.ids, values);
}

function withMissingFailures(
  ids: string[],
  values: Record<string, JsonRecord>,
): LiveResolveResult {
  const failed: LiveResolveResult["failed"] = {};
  for (const id of ids) {
    if (!values[id]) failed[id] = "not_found";
  }
  return Object.keys(failed).length > 0 ? { values, failed } : { values };
}

async function getContentFromConnect(
  client: VoyantConnectClient,
  ctx: SourceAdapterContext,
  request: GetContentRequest,
): Promise<GetContentResult> {
  const connectionId = requireConnectConnectionId(ctx);
  const module = request.entity_module;
  let content: unknown;
  if (module.includes("cruise")) {
    const row = await client.cruises.getOnConnection(
      connectionId,
      request.entity_id,
      {
        locale: request.locale,
      },
    );
    content = row;
  } else if (module.includes("accommodation") || module.includes("stay")) {
    const row = await client.accommodations.getOnConnection(
      connectionId,
      request.entity_id,
      {
        locale: request.locale,
      },
    );
    content = row;
  } else {
    const row = await client.products.getOnConnection(
      connectionId,
      request.entity_id,
    );
    content = row;
  }
  return {
    entity_module: request.entity_module,
    entity_id: request.entity_id,
    source_ref: request.entity_id,
    returned_locale: request.locale,
    content,
    content_schema_version: `${request.entity_module}/connect-v1`,
    source_updated_at: new Date(),
  };
}

async function reserveThroughConnect(
  client: VoyantConnectClient,
  ctx: SourceAdapterContext,
  request: ReserveRequest,
): Promise<ReserveResult> {
  const connectionId = requireConnectConnectionId(ctx);
  if (request.parameters.connectRoute === "stays") {
    const booking = await client.stays.confirm(
      connectionId,
      request.parameters as unknown as StayConfirmInput,
      { idempotencyKey: request.idempotency_key },
    );
    return {
      upstream_ref: `stay:${booking.id}`,
      status: booking.status === "confirmed" ? "confirmed" : "held",
      upstream_payload: booking as unknown as JsonRecord,
    };
  }

  if (request.parameters.connectRoute === "cruises") {
    const quoteId =
      getString(request.parameters, "quoteId") ??
      (
        await client.cruiseBookings.lockSelection(
          connectionId,
          request.parameters as unknown as CruiseLockSelectionInput,
        )
      ).id;
    const booking = await client.cruiseBookings.confirm(
      connectionId,
      {
        ...request.parameters,
        quoteId,
      } as unknown as CruiseConfirmInput,
      { idempotencyKey: request.idempotency_key },
    );
    return {
      upstream_ref: `cruise:${booking.id}`,
      status: booking.status === "confirmed" ? "confirmed" : "held",
      upstream_payload: booking as unknown as JsonRecord,
    };
  }

  const booking = await client.bookings.create(
    connectionId,
    {
      ...request.parameters,
      productId:
        getString(request.parameters, "productId") ?? request.entity_id,
      contact: request.party?.contact ?? request.parameters.contact,
    } as unknown as CreateBookingInput,
    { idempotencyKey: request.idempotency_key },
  );
  const bookingId =
    getString(booking, "id") ??
    getString(booking, "externalBookingId") ??
    request.entity_id;
  const shouldConfirm =
    request.payment_intent !== undefined || request.parameters.confirm === true;
  const confirmed = shouldConfirm
    ? await client.bookings.confirm(connectionId, bookingId)
    : booking;
  return {
    upstream_ref: `booking:${bookingId}`,
    status: connectBookingStatusToReserveStatus(getString(confirmed, "status")),
    upstream_payload: confirmed,
  };
}

async function cancelThroughConnect(
  client: VoyantConnectClient,
  ctx: SourceAdapterContext,
  request: CancelRequest,
): Promise<CancelResult> {
  const connectionId = requireConnectConnectionId(ctx);
  const ref = parseUpstreamRef(request.upstream_ref);
  const reason = request.reason ? { reason: request.reason } : undefined;
  if (ref.kind === "stay") {
    const booking = await client.stays.cancel(connectionId, ref.id, reason);
    return { status: booking.status === "cancelled" ? "cancelled" : "pending" };
  }
  if (ref.kind === "cruise") {
    const booking = await client.cruiseBookings.cancel(
      connectionId,
      ref.id,
      reason,
    );
    return { status: booking.status === "cancelled" ? "cancelled" : "pending" };
  }
  const booking = await client.bookings.cancel(connectionId, ref.id, reason);
  return {
    status:
      getString(booking, "status") === "cancelled" ? "cancelled" : "pending",
  };
}

async function getBookingByRef(
  client: VoyantConnectClient,
  connectionId: string,
  ref: { kind: string; id: string },
): Promise<JsonRecord | null> {
  if (ref.kind === "stay")
    return client.stays.get(connectionId, ref.id) as unknown as JsonRecord;
  if (ref.kind === "cruise")
    return client.cruiseBookings.get(
      connectionId,
      ref.id,
    ) as unknown as JsonRecord;
  return client.bookings.get(connectionId, ref.id);
}

function parseUpstreamRef(upstreamRef: string): { kind: string; id: string } {
  const index = upstreamRef.indexOf(":");
  if (index === -1) return { kind: "booking", id: upstreamRef };
  return {
    kind: upstreamRef.slice(0, index),
    id: upstreamRef.slice(index + 1),
  };
}

function categoryToEntityModule(category: string | undefined): string {
  if (category === "hotel") return "accommodations";
  if (category === "cruise") return "cruises";
  if (category === "airline") return "flights";
  if (
    category === "transfer" ||
    category === "transport" ||
    category === "experience"
  )
    return "products";
  return category ? `${category}s` : "products";
}

function getSourceRef(payload: JsonRecord, fallback: string): string {
  const sourceRef =
    getString(payload, "sourceRef") ?? getString(payload, "externalId");
  const optionId = getString(payload, "optionId");
  if (sourceRef) return sourceRef;
  if (optionId)
    return `${getString(payload, "productId") ?? fallback}:${optionId}`;
  return getString(payload, "productId") ?? fallback;
}

function isCatalogProjection(value: unknown): value is CatalogProjection {
  if (!value || typeof value !== "object") return false;
  const record = value as JsonRecord;
  return (
    typeof record.entity_module === "string" &&
    typeof record.entity_id === "string" &&
    !!record.provenance &&
    typeof record.provenance === "object" &&
    !!record.fields &&
    typeof record.fields === "object"
  );
}

function getRecord(record: JsonRecord, key: string): JsonRecord {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function getRecordOrNull(record: JsonRecord, key: string): JsonRecord | null {
  const value = record[key];
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function getString(record: JsonRecord, key: string): string | undefined {
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNumber(record: JsonRecord, key: string): number | null {
  const value = record[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getBoolean(record: JsonRecord, key: string): boolean {
  return record[key] === true;
}

function getStringArray(record: JsonRecord, key: string): string[] | undefined {
  const value = record[key];
  if (!Array.isArray(value)) return undefined;
  const strings = value.filter(
    (item): item is string => typeof item === "string",
  );
  return strings.length > 0 ? strings : undefined;
}

function dateFromString(value: string | undefined): Date | undefined {
  return value ? new Date(value) : undefined;
}

function normalizeCruiseType(value: string | undefined): string | null {
  if (
    value === "ocean" ||
    value === "river" ||
    value === "expedition" ||
    value === "coastal"
  ) {
    return value;
  }
  return value ? "ocean" : null;
}

function availabilityStatusToCatalogStatus(value: string | undefined): string {
  if (value === "soldOut" || value === "closed") return "unavailable";
  if (value === "onRequest") return "on_request";
  return "active";
}

function lowestSlotPrice(slots: JsonRecord[]): JsonRecord | null {
  let lowest: JsonRecord | null = null;
  for (const slot of slots) {
    const price = getRecordOrNull(slot, "priceFrom");
    if (!price) continue;
    if (!lowest || moneyAmountMinor(price) < moneyAmountMinor(lowest)) {
      lowest = price;
    }
  }
  return lowest;
}

function moneyAmountMinor(money: JsonRecord): number {
  const value = money.amountMinor;
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : Number.POSITIVE_INFINITY;
}

function moneyToDecimalString(money: JsonRecord | null): string | null {
  if (!money) return null;
  const amountMinor = money.amountMinor;
  const currencyPrecision = money.currencyPrecision;
  if (
    typeof amountMinor !== "number" ||
    !Number.isFinite(amountMinor) ||
    typeof currencyPrecision !== "number" ||
    !Number.isInteger(currencyPrecision)
  ) {
    return null;
  }
  return (amountMinor / 10 ** currencyPrecision).toFixed(currencyPrecision);
}

function connectBookingStatusToReserveStatus(
  value: string | undefined,
): ReserveResult["status"] {
  if (value === "confirmed" || value === "completed") return "confirmed";
  if (value === "failed") return "failed";
  return "held";
}

function reservationStatusFromConnect(
  value: string | undefined,
): ReservationStatus {
  if (
    value === "held" ||
    value === "confirmed" ||
    value === "ticketed" ||
    value === "failed" ||
    value === "cancelled" ||
    value === "pending" ||
    value === "refused" ||
    value === "cancelling"
  ) {
    return value;
  }
  if (value === "reserved") return "held";
  return "pending";
}
