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
        (item) =>
          item.id === entityId ||
          getString(normalizeSearchDocumentPayload(item), "id") === entityId,
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
      const rows = await client.bookings.list(connectionId);
      const wantedStatuses = new Set(query.status ?? []);
      const updatedAfter = query.updated_after?.getTime();
      const limit =
        typeof query.limit === "number" && query.limit > 0
          ? query.limit
          : undefined;
      const reservations = rows
        .map((row) => toReservationResult(row))
        .filter((reservation) => {
          if (
            wantedStatuses.size > 0 &&
            !wantedStatuses.has(reservation.status)
          ) {
            return false;
          }
          if (updatedAfter === undefined) return true;
          const sourceUpdatedAt = reservation.source_updated_at?.getTime();
          return (
            sourceUpdatedAt === undefined || sourceUpdatedAt > updatedAfter
          );
        });
      return {
        reservations:
          limit === undefined ? reservations : reservations.slice(0, limit),
        next_cursor: undefined,
      };
    },
  } satisfies SourceAdapter;
}

export function mapSearchDocumentToProjection(
  document: SearchDocument,
  defaults: ProjectionDefaults,
): CatalogProjection | null {
  const payload = normalizeSearchDocumentPayload(document);
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

function normalizeSearchDocumentPayload(document: SearchDocument): JsonRecord {
  const payload = (document as JsonRecord).payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as JsonRecord;
  }

  return {
    id:
      getString(document as JsonRecord, "documentExternalId") ??
      getString(document as JsonRecord, "productExternalId") ??
      document.id,
    sourceRef:
      getString(document as JsonRecord, "documentExternalId") ??
      getString(document as JsonRecord, "productExternalId") ??
      document.id,
    connectionId: document.connectionId,
    productId: getString(document as JsonRecord, "productExternalId"),
    optionId: getString(document as JsonRecord, "optionExternalId"),
    supplierId: getString(document as JsonRecord, "supplierExternalId"),
    accommodationId: getString(
      document as JsonRecord,
      "accommodationExternalId",
    ),
    category: getString(document as JsonRecord, "category"),
    title: getString(document as JsonRecord, "title"),
    name: getString(document as JsonRecord, "title"),
    summary: getString(document as JsonRecord, "summary"),
    searchableText: getString(document as JsonRecord, "searchableText"),
    destinations: document.destinations,
    countryCodes: document.countryCodes,
    tags: document.tags,
    imageUrl: getString(document as JsonRecord, "imageUrl"),
    priceFrom: getRecordOrNull(document as JsonRecord, "priceFrom"),
    availabilityStatus: getString(document as JsonRecord, "availabilityStatus"),
    marketContext: document.marketContext ?? document.market ?? null,
    source: document.source,
    freshness: document.freshness,
    updatedAt: document.sourceUpdatedAt ?? document.updatedAt,
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
  if (module.includes("cruise")) {
    return getCruiseContentFromConnect(client, connectionId, request);
  }

  let content: unknown;
  if (module.includes("accommodation") || module.includes("stay")) {
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

async function getCruiseContentFromConnect(
  client: VoyantConnectClient,
  connectionId: string,
  request: GetContentRequest,
): Promise<GetContentResult> {
  const cruise = await resolveCruiseRow(client, connectionId, request);
  const cruiseExternalId =
    getString(cruise, "externalId") ??
    preferredSourceRefForEntityId(request.entity_id) ??
    request.entity_id;
  const cruiseLineExternalId =
    getString(cruise, "cruiseLineExternalId") ??
    getString(getRecord(cruise, "payload"), "cruiseLineExternalId");
  const shipExternalId =
    getString(cruise, "shipExternalId") ??
    getString(getRecord(cruise, "payload"), "shipExternalId") ??
    getString(getRecord(cruise, "payload"), "shipId");

  const sailings = await client.cruises.listSailingsOnConnection(connectionId, {
    cruiseExternalId,
    limit: 200,
  });
  const ship = await resolveCruiseShip(client, connectionId, {
    ...(cruiseLineExternalId ? { cruiseLineExternalId } : {}),
    ...(shipExternalId ? { shipExternalId } : {}),
    locale: request.locale,
  });
  const cabinCategories = shipExternalId
    ? await client.cruises.listCabinCategories(connectionId, shipExternalId, {
        locale: request.locale,
      })
    : [];
  const itineraryStops = await resolveCruiseItineraryStops(
    client,
    connectionId,
    sailings,
  );

  return {
    entity_module: request.entity_module,
    entity_id: request.entity_id,
    source_ref: cruiseExternalId,
    returned_locale: getString(cruise, "locale") ?? request.locale,
    content: {
      cruise: toCruiseContentSummary(cruise, request.entity_id),
      ship: ship ? toCruiseContentShip(ship) : null,
      sailings: sailings
        .map((sailing) => toCruiseContentSailing(sailing))
        .filter((sailing): sailing is JsonRecord => sailing !== null),
      cabin_categories: cabinCategories
        .map((category) => toCruiseContentCabinCategory(category))
        .filter((category): category is JsonRecord => category !== null),
      itinerary_stops: itineraryStops,
      policies: toCruiseContentPolicies(cruise),
    },
    content_schema_version: "cruises/v1",
    source_updated_at:
      dateFromString(getString(cruise, "updatedAt")) ??
      dateFromString(getString(cruise, "lastSyncedAt")) ??
      new Date(),
  };
}

async function resolveCruiseRow(
  client: VoyantConnectClient,
  connectionId: string,
  request: GetContentRequest,
): Promise<JsonRecord> {
  const candidates = sourceRefCandidatesForEntityId(request.entity_id);
  const directCandidates =
    candidates.length > 1
      ? candidates.filter((candidate) => candidate !== request.entity_id)
      : candidates;
  for (const candidate of directCandidates) {
    const row = await tryGetCruiseOnConnection(
      client,
      connectionId,
      candidate,
      request.locale,
    );
    if (row) return row;
  }

  const listedWithLocale = await client.cruises.listOnConnection(connectionId, {
    locale: request.locale,
    limit: 500,
  });
  const localeMatch = listedWithLocale.find((row) =>
    cruiseRowMatchesSourceRef(row, candidates),
  );
  if (localeMatch) return localeMatch;

  const listed = await client.cruises.listOnConnection(connectionId, {
    limit: 500,
  });
  const match = listed.find((row) =>
    cruiseRowMatchesSourceRef(row, candidates),
  );
  if (match) return match;

  throw new Error(
    `Connect cruise content not found for ${request.entity_id} on ${connectionId}`,
  );
}

async function tryGetCruiseOnConnection(
  client: VoyantConnectClient,
  connectionId: string,
  cruiseId: string,
  locale: string,
): Promise<JsonRecord | null> {
  try {
    return await client.cruises.getOnConnection(connectionId, cruiseId, {
      locale,
    });
  } catch (error) {
    if (isNotFoundError(error)) return null;
    throw error;
  }
}

async function resolveCruiseShip(
  client: VoyantConnectClient,
  connectionId: string,
  options: {
    cruiseLineExternalId?: string;
    shipExternalId?: string;
    locale: string;
  },
): Promise<JsonRecord | null> {
  if (!options.cruiseLineExternalId && !options.shipExternalId) return null;
  const ships = await client.cruises.listShips(connectionId, {
    ...(options.cruiseLineExternalId
      ? { cruiseLineExternalId: options.cruiseLineExternalId }
      : {}),
    locale: options.locale,
    limit: 100,
  });
  if (!options.shipExternalId) return ships[0] ?? null;
  const refs = sourceRefCandidatesForEntityId(options.shipExternalId);
  return ships.find((ship) => recordMatchesAnyRef(ship, refs)) ?? null;
}

async function resolveCruiseItineraryStops(
  client: VoyantConnectClient,
  connectionId: string,
  sailings: JsonRecord[],
): Promise<JsonRecord[]> {
  const fromPayload = sailings.flatMap((sailing) =>
    getRecordArray(getRecord(sailing, "payload"), "itinerary")
      .map((day) => toCruiseContentItineraryStop(day))
      .filter((day): day is JsonRecord => day !== null),
  );
  if (fromPayload.length > 0) return fromPayload;

  const sailingExternalId =
    getString(sailings[0] ?? {}, "externalId") ??
    getString(getRecord(sailings[0] ?? {}, "payload"), "externalId");
  if (!sailingExternalId) return [];
  const days = await client.cruises.listItinerary(
    connectionId,
    sailingExternalId,
  );
  return days
    .map((day) => toCruiseContentItineraryStop(day))
    .filter((day): day is JsonRecord => day !== null);
}

function toCruiseContentSummary(
  cruise: JsonRecord,
  entityId: string,
): JsonRecord {
  const payload = getRecord(cruise, "payload");
  return {
    id: entityId,
    name: getString(cruise, "name") ?? getString(payload, "name") ?? entityId,
    status: getString(cruise, "status") ?? getString(payload, "status"),
    description:
      getString(payload, "description") ??
      getString(cruise, "description") ??
      getString(payload, "summary") ??
      null,
    cruise_type:
      getString(cruise, "cruiseType") ??
      getString(payload, "cruiseType") ??
      null,
    hero_image_url: getCruiseHeroImageUrl(cruise) ?? null,
    highlights: getStringArray(payload, "highlights") ?? [],
    cruise_line:
      getString(payload, "cruiseLineName") ??
      getString(payload, "cruiseLine") ??
      getString(cruise, "cruiseLineExternalId") ??
      null,
    duration_nights:
      getNumber(cruise, "nights") ?? getNumber(payload, "nights"),
    embarkation_port: getPortLabel(
      cruise,
      payload,
      "embarkationPort",
      "embarkationPortCode",
    ),
    disembarkation_port: getPortLabel(
      cruise,
      payload,
      "disembarkationPort",
      "disembarkationPortCode",
    ),
  };
}

function toCruiseContentShip(ship: JsonRecord): JsonRecord | null {
  const payload = getRecord(ship, "payload");
  const name = getString(ship, "name") ?? getString(payload, "name");
  if (!name) return null;
  return {
    id:
      getString(ship, "externalId") ??
      getString(payload, "externalId") ??
      getString(ship, "id") ??
      null,
    name,
    description:
      getString(payload, "description") ??
      getString(ship, "description") ??
      null,
    capacity:
      getNumber(ship, "capacityGuests") ??
      getNumber(payload, "capacityGuests") ??
      getNumber(payload, "capacity") ??
      null,
    decks:
      getNumber(ship, "deckCount") ??
      getNumber(payload, "deckCount") ??
      getNumber(payload, "decks") ??
      null,
    year_built:
      getNumber(ship, "yearBuilt") ?? getNumber(payload, "yearBuilt") ?? null,
  };
}

function toCruiseContentSailing(sailing: JsonRecord): JsonRecord | null {
  const payload = getRecord(sailing, "payload");
  const sourceRef =
    getString(sailing, "externalId") ??
    getString(payload, "externalId") ??
    getString(sailing, "id");
  const startDate =
    getString(sailing, "departureDate") ?? getString(payload, "departureDate");
  const endDate =
    getString(sailing, "returnDate") ?? getString(payload, "returnDate");
  if (!sourceRef || !startDate || !endDate) return null;
  return {
    id: sourceRef,
    source_ref: sourceRef,
    start_date: startDate,
    end_date: endDate,
    duration_nights:
      getNumber(sailing, "nights") ??
      getNumber(payload, "nights") ??
      durationNights(startDate, endDate),
    status:
      getString(sailing, "salesStatus") ??
      getString(payload, "salesStatus") ??
      null,
    embarkation_port: getPortLabel(
      sailing,
      payload,
      "embarkationPort",
      "embarkationPortCode",
    ),
    disembarkation_port: getPortLabel(
      sailing,
      payload,
      "disembarkationPort",
      "disembarkationPortCode",
    ),
  };
}

function toCruiseContentCabinCategory(category: JsonRecord): JsonRecord | null {
  const payload = getRecord(category, "payload");
  const sourceRef =
    getString(category, "externalId") ??
    getString(payload, "externalId") ??
    getString(category, "id");
  const name = getString(category, "name") ?? getString(payload, "name");
  if (!sourceRef || !name) return null;
  return {
    id: sourceRef,
    code: getString(category, "code") ?? getString(payload, "code") ?? null,
    name,
    description:
      getString(payload, "description") ??
      getString(category, "description") ??
      null,
    type:
      getString(category, "roomType") ?? getString(payload, "roomType") ?? null,
    capacity_min: getNumber(payload, "minOccupancy"),
    capacity_max:
      getNumber(category, "maxTotal") ??
      getNumber(payload, "maxTotal") ??
      getNumber(getRecord(category, "maxOccupancy"), "total") ??
      getNumber(getRecord(payload, "maxOccupancy"), "total") ??
      getNumber(payload, "maxOccupancy"),
    inclusions:
      getStringArray(category, "features") ??
      getStringArray(payload, "features") ??
      [],
  };
}

function toCruiseContentItineraryStop(day: JsonRecord): JsonRecord | null {
  const dayNumber = getNumber(day, "dayNumber") ?? getNumber(day, "day_number");
  if (dayNumber === null || dayNumber < 1) return null;
  return {
    day_number: dayNumber,
    date: getString(day, "date") ?? null,
    port_name:
      getString(day, "portName") ??
      getString(day, "port_name") ??
      getString(day, "title") ??
      "",
    arrival_time:
      getString(day, "arriveAt") ??
      getString(day, "arrivalTime") ??
      getString(day, "arrival_time") ??
      null,
    departure_time:
      getString(day, "departAt") ??
      getString(day, "departureTime") ??
      getString(day, "departure_time") ??
      null,
    description: getString(day, "description") ?? null,
    is_at_sea:
      getBoolean(day, "isSeaDay") ||
      getBoolean(day, "is_at_sea") ||
      getString(day, "portName") === undefined,
  };
}

function toCruiseContentPolicies(cruise: JsonRecord): JsonRecord[] {
  const payload = getRecord(cruise, "payload");
  const policies: JsonRecord[] = [];
  const inclusions = textListFromUnknown(payload.inclusions);
  if (inclusions.length > 0) {
    policies.push({
      kind: "supplier_notes",
      body: `Inclusions: ${inclusions.join(", ")}`,
    });
  }
  const notes =
    getString(payload, "supplierNotes") ??
    getString(payload, "terms") ??
    getString(payload, "policy");
  if (notes) policies.push({ kind: "supplier_notes", body: notes });
  return policies;
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

function sourceRefCandidatesForEntityId(entityId: string): string[] {
  const candidates: string[] = [];
  const add = (value: string | undefined) => {
    if (value && !candidates.includes(value)) candidates.push(value);
  };
  if (entityId.startsWith("crus_")) add(entityId.slice("crus_".length));
  const parts = entityId.split(":");
  if (parts.length > 1) {
    const withoutKind = parts.slice(1);
    let strippedLocale = false;
    if (
      withoutKind.length > 1 &&
      isLocaleTag(withoutKind[withoutKind.length - 1])
    ) {
      add(withoutKind.slice(0, -1).join(":"));
      strippedLocale = true;
    }
    if (!strippedLocale) add(withoutKind.join(":"));
  }
  add(entityId);
  try {
    const decoded = decodeURIComponent(entityId);
    if (decoded !== entityId) add(decoded);
  } catch {
    // Keep the raw id when it is not URI-encoded.
  }
  return candidates;
}

function preferredSourceRefForEntityId(entityId: string): string | undefined {
  return sourceRefCandidatesForEntityId(entityId).find(
    (candidate) => candidate !== entityId,
  );
}

function isLocaleTag(value: string | undefined): boolean {
  return value ? /^[A-Za-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(value) : false;
}

function cruiseRowMatchesSourceRef(
  row: JsonRecord,
  candidates: string[],
): boolean {
  return recordMatchesAnyRef(row, candidates);
}

function recordMatchesAnyRef(row: JsonRecord, candidates: string[]): boolean {
  const refs = new Set(candidates);
  const payload = getRecord(row, "payload");
  for (const ref of [
    getString(row, "id"),
    getString(row, "externalId"),
    getString(row, "sourceRef"),
    getString(row, "documentExternalId"),
    getString(payload, "id"),
    getString(payload, "externalId"),
    getString(payload, "sourceRef"),
    getString(payload, "documentExternalId"),
  ]) {
    if (!ref) continue;
    if (
      sourceRefCandidatesForEntityId(ref).some((candidate) =>
        refs.has(candidate),
      )
    ) {
      return true;
    }
  }
  return false;
}

function getCruiseHeroImageUrl(cruise: JsonRecord): string | undefined {
  const payload = getRecord(cruise, "payload");
  const direct =
    getString(cruise, "heroImageUrl") ??
    getString(payload, "heroImageUrl") ??
    getString(payload, "imageUrl");
  if (direct) return direct;
  for (const item of [
    ...getRecordArray(cruise, "media"),
    ...getRecordArray(payload, "media"),
  ]) {
    const url = getString(item, "url");
    if (url) return url;
  }
  return undefined;
}

function getPortLabel(
  row: JsonRecord,
  payload: JsonRecord,
  objectKey: string,
  codeKey: string,
): string | null {
  const port = getRecord(payload, objectKey);
  return (
    getString(port, "name") ??
    getString(port, "label") ??
    getString(row, codeKey) ??
    getString(payload, codeKey) ??
    null
  );
}

function durationNights(startDate: string, endDate: string): number | null {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) {
    return null;
  }
  return Math.max(
    0,
    Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)),
  );
}

function textListFromUnknown(value: unknown): string[] {
  if (typeof value === "string" && value.length > 0) return [value];
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object" && !Array.isArray(item)) {
        const record = item as JsonRecord;
        return (
          getString(record, "label") ??
          getString(record, "name") ??
          getString(record, "description") ??
          getString(record, "body")
        );
      }
      return undefined;
    })
    .filter((item): item is string => item !== undefined);
}

function isNotFoundError(error: unknown): boolean {
  return (
    error !== null &&
    typeof error === "object" &&
    (error as { status?: unknown }).status === 404
  );
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

function getRecordArray(record: JsonRecord, key: string): JsonRecord[] {
  const value = record[key];
  if (!Array.isArray(value)) return [];
  return value.filter(
    (item): item is JsonRecord =>
      item !== null && typeof item === "object" && !Array.isArray(item),
  );
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

function toReservationResult(row: JsonRecord) {
  return {
    upstream_ref: `booking:${getString(row, "id") ?? getString(row, "externalBookingId") ?? ""}`,
    status: reservationStatusFromConnect(getString(row, "status")),
    source_updated_at: dateFromString(getString(row, "updatedAt")),
    upstream_payload: row,
  };
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
