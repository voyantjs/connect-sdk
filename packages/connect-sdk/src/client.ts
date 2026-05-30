import { VoyantApiError, VoyantTransport } from "@voyant-sdk/sdk-core";
import type { JsonObject } from "@voyant-sdk/sdk-core";

import type {
  AuditLogPage,
  AuditLogQuery,
  AvailabilityCalendarQueryInput,
  CancelBookingInput,
  CabinPricing,
  ConfirmBookingInput,
  ConnectCruiseRow,
  CruiseBooking,
  CruiseConfirmInput,
  CruiseInquireInput,
  CruiseLockSelectionInput,
  CruiseOffer,
  CruisePromotion,
  CruiseQuote,
  CruiseSearchQuery,
  CruiseSearchResponse,
  ListAccommodationsQuery,
  ListCruisesQuery,
  ListItineraryDay,
  ListSailingPricingQuery,
  ListSailingPromotionsQuery,
  ListSailingsQuery,
  OperatorAccommodationDetail,
  OperatorAccommodationSummary,
  OperatorCruiseDetail,
  OperatorCruiseSummary,
  OperatorSailingDetail,
  OperatorSailingSummary,
  RatePlan,
  RoomType,
  StayBooking,
  StayConfirmInput,
  StayHold,
  StayOffer,
  StaySearchQuery,
  StaySearchResponse,
  ConnectAvailabilityQuery,
  ConnectChannelHealth,
  ConnectListBookingsQuery,
  ConnectOptionExtraConfigSummary,
  ConnectOptionSummary,
  ConnectProductExtraSummary,
  ConnectUnitSummary,
  ConnectionScopeFilter,
  ConnectionSummary,
  ConnectorProviderApplicationSummary,
  ConnectorProviderSummary,
  CreateBookingInput,
  CreateConnectionInput,
  CreateCustomConnectionRequestInput,
  CreateInviteTokenInput,
  CreateLinkInput,
  CreateOAuthClientInput,
  CreateOperatorGrantInput,
  CreateOperatorInput,
  CreateWebhookSubscriptionInput,
  CustomConnectionRequestSummary,
  FlightAncillaryInput,
  FlightAncillaryList,
  FlightBookInput,
  FlightCheckInInput,
  FlightExchangeInput,
  FlightMultiSearchInput,
  FlightOrder,
  FlightPriceInput,
  FlightRefundInput,
  FlightSearchInput,
  FlightSearchResult,
  FlightSeatMap,
  FlightSeatSelectionInput,
  FlightSsrInput,
  GrantSummary,
  InviteTokenSummary,
  IssueTokenInput,
  LinkCapability,
  LinkSummary,
  ListBookingActivitiesQuery,
  ListGrantsQuery,
  ListHealthEventsQuery,
  ListLinksQuery,
  ListOperatorBookingsQuery,
  ListProjectionSyncsQuery,
  ListRequestLogsQuery,
  ListWebhookDeliveriesQuery,
  ListWebhookEventsQuery,
  OAuthClientSummary,
  OAuthTokenResponse,
  OperatorBookingSummary,
  OperatorProductDetail,
  OperatorProductSummary,
  OperatorProviderRegistration,
  OperatorScope,
  OperatorSummary,
  OperatorSupplierSummary,
  ProjectionSyncRunReceipt,
  PublicInviteInfo,
  RotatedWebhookSecret,
  SearchDocument,
  SearchDocumentQuery,
  SearchProjectionChangePage,
  SearchProjectionChangeQuery,
  UpdateConnectionInput,
  UpdateConnectorProviderInput,
  UpdateLinkCapabilityInput,
  UpdateLinkInput,
  UpdateOperatorGrantInput,
  UpdateOperatorInput,
  UpdateTuiProviderSettingsInput,
  UpdateWebhookSubscriptionInput,
  UpsertProviderRegistrationInput,
  UsageQuery,
  UsageSummary,
  VoyantConnectClientOptions,
  WebhookDeliveryReplayReceipt,
  WebhookDeliverySummary,
  WebhookSubscriptionSummary,
  WebhookSubscriptionTestReceipt,
} from "./types.js";

function withIdempotency(
  idempotencyKey: string | undefined,
): HeadersInit | undefined {
  if (!idempotencyKey) return undefined;
  return { "idempotency-key": idempotencyKey };
}

type ScopeQuery = Record<string, string | string[] | number | undefined>;

function scopeQuery(filter: ConnectionScopeFilter | undefined): ScopeQuery {
  if (!filter) return {};
  const out: ScopeQuery = {};
  if (filter.connectionId !== undefined) out.connectionId = filter.connectionId;
  if (filter.providerKey !== undefined) out.providerKey = filter.providerKey;
  return out;
}

export class VoyantConnectClient {
  readonly transport: VoyantTransport;
  readonly defaultOperatorId: string | null;

  constructor(options: VoyantConnectClientOptions) {
    this.transport = new VoyantTransport(options);
    this.defaultOperatorId = options.operatorId ?? null;
  }

  private resolveOperatorId(scope?: OperatorScope): string {
    const operatorId = scope?.operatorId ?? this.defaultOperatorId;
    if (!operatorId) {
      throw new VoyantApiError(
        "operatorId is required: pass it via the call's OperatorScope or set VoyantConnectClientOptions.operatorId",
        { status: 0, body: null, requestId: null },
      );
    }
    return operatorId;
  }

  // ── OAuth ─────────────────────────────────────────────────────────────

  readonly oauth = {
    issueToken: (input: IssueTokenInput) =>
      this.transport.request<OAuthTokenResponse>("/connect/v1/oauth/token", {
        body: {
          client_id: input.clientId,
          client_secret: input.clientSecret,
          grant_type: input.grantType ?? "client_credentials",
          scope: input.scope,
        },
        method: "POST",
        unwrapData: false,
      }),
  };

  // ── Operators (control plane) ────────────────────────────────────────

  readonly operators = {
    list: () =>
      this.transport.request<OperatorSummary[]>("/connect/v1/operators"),
    get: (operatorId: string) =>
      this.transport.request<OperatorSummary>(
        `/connect/v1/operators/${operatorId}`,
      ),
    create: (input: CreateOperatorInput) =>
      this.transport.request<OperatorSummary>("/connect/v1/operators", {
        body: input,
        method: "POST",
      }),
    update: (operatorId: string, input: UpdateOperatorInput) =>
      this.transport.request<OperatorSummary>(
        `/connect/v1/operators/${operatorId}`,
        {
          body: input,
          method: "PATCH",
        },
      ),
    deactivate: (operatorId: string) =>
      this.transport.request<OperatorSummary>(
        `/connect/v1/operators/${operatorId}`,
        {
          method: "DELETE",
        },
      ),
    getUsage: (operatorId: string, query?: UsageQuery) =>
      this.transport.request<UsageSummary>(
        `/connect/v1/operators/${operatorId}/usage`,
        {
          query: query as unknown as Record<string, string | undefined>,
        },
      ),
    listSearchDocuments: (operatorId: string, query?: SearchDocumentQuery) =>
      this.transport.request<SearchDocument[]>(
        `/connect/v1/operators/${operatorId}/search-documents`,
        {
          query: query as unknown as Record<
            string,
            string | number | undefined
          >,
        },
      ),
    listSearchProjectionChanges: (
      operatorId: string,
      query?: SearchProjectionChangeQuery,
    ) =>
      this.transport.request<SearchProjectionChangePage>(
        `/connect/v1/operators/${operatorId}/search-projection-changes`,
        {
          query: query as unknown as Record<
            string,
            string | number | undefined
          >,
          unwrapData: false,
        },
      ),
  };

  // ── Connector providers ──────────────────────────────────────────────

  readonly connectorProviders = {
    list: () =>
      this.transport.request<ConnectorProviderSummary[]>(
        "/connect/v1/connector-providers",
      ),
    update: (providerKey: string, input: UpdateConnectorProviderInput) =>
      this.transport.request<ConnectorProviderSummary>(
        `/connect/v1/connector-providers/${providerKey}`,
        { body: input, method: "PATCH" },
      ),
    listApplications: (providerKey: string) =>
      this.transport.request<ConnectorProviderApplicationSummary[]>(
        `/connect/v1/connector-providers/${providerKey}/applications`,
      ),
    listRegistrations: (operatorId: string) =>
      this.transport.request<OperatorProviderRegistration[]>(
        `/connect/v1/operators/${operatorId}/provider-registrations`,
      ),
    getRegistration: (operatorId: string, registrationId: string) =>
      this.transport.request<OperatorProviderRegistration>(
        `/connect/v1/operators/${operatorId}/provider-registrations/${registrationId}`,
      ),
    upsertRegistration: (
      operatorId: string,
      input: UpsertProviderRegistrationInput,
    ) =>
      this.transport.request<OperatorProviderRegistration>(
        `/connect/v1/operators/${operatorId}/provider-registrations`,
        { body: input, method: "POST" },
      ),
    updateRegistration: (
      operatorId: string,
      registrationId: string,
      input: UpsertProviderRegistrationInput,
    ) =>
      this.transport.request<OperatorProviderRegistration>(
        `/connect/v1/operators/${operatorId}/provider-registrations/${registrationId}`,
        { body: input, method: "PATCH" },
      ),
    updateTuiSettings: (
      operatorId: string,
      registrationId: string,
      input: UpdateTuiProviderSettingsInput,
    ) =>
      this.transport.request<OperatorProviderRegistration>(
        `/connect/v1/operators/${operatorId}/provider-registrations/${registrationId}/tui-settings`,
        { body: input, method: "PATCH" },
      ),
    revalidateRegistration: (operatorId: string, registrationId: string) =>
      this.transport.request<OperatorProviderRegistration>(
        `/connect/v1/operators/${operatorId}/provider-registrations/${registrationId}/revalidate`,
        { method: "POST" },
      ),
  };

  // ── Connections (control plane) ──────────────────────────────────────

  readonly connections = {
    list: (operatorId: string) =>
      this.transport.request<ConnectionSummary[]>(
        `/connect/v1/operators/${operatorId}/connections`,
      ),
    get: (operatorId: string, connectionId: string) =>
      this.transport.request<ConnectionSummary>(
        `/connect/v1/operators/${operatorId}/connections/${connectionId}`,
      ),
    create: (operatorId: string, input: CreateConnectionInput) =>
      this.transport.request<ConnectionSummary>(
        `/connect/v1/operators/${operatorId}/connections`,
        { body: input, method: "POST" },
      ),
    update: (
      operatorId: string,
      connectionId: string,
      input: UpdateConnectionInput,
    ) =>
      this.transport.request<ConnectionSummary>(
        `/connect/v1/operators/${operatorId}/connections/${connectionId}`,
        { body: input, method: "PATCH" },
      ),
    delete: (operatorId: string, connectionId: string) =>
      this.transport.request<ConnectionSummary>(
        `/connect/v1/operators/${operatorId}/connections/${connectionId}`,
        { method: "DELETE" },
      ),
    rotateWebhookSecret: (operatorId: string, connectionId: string) =>
      this.transport.request<RotatedWebhookSecret>(
        `/connect/v1/operators/${operatorId}/connections/${connectionId}/webhook-secret/rotate`,
        { method: "POST" },
      ),
    listProjectionSyncs: (
      operatorId: string,
      connectionId: string,
      query?: ListProjectionSyncsQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/operators/${operatorId}/connections/${connectionId}/search-projection-syncs`,
        { query: query as unknown as Record<string, number | undefined> },
      ),
    triggerProjectionSync: (operatorId: string, connectionId: string) =>
      this.transport.request<ProjectionSyncRunReceipt>(
        `/connect/v1/operators/${operatorId}/connections/${connectionId}/search-projection-syncs`,
        { method: "POST" },
      ),
    listWebhookEvents: (
      operatorId: string,
      connectionId: string,
      query?: ListWebhookEventsQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/operators/${operatorId}/connections/${connectionId}/webhook-events`,
        {
          query: query as unknown as Record<
            string,
            string | number | undefined
          >,
        },
      ),
    listHealthEvents: (
      operatorId: string,
      connectionId: string,
      query?: ListHealthEventsQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/operators/${operatorId}/connections/${connectionId}/health-events`,
        {
          query: query as unknown as Record<
            string,
            string | number | undefined
          >,
        },
      ),
    listRequestLogs: (
      operatorId: string,
      connectionId: string,
      query?: ListRequestLogsQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/operators/${operatorId}/connections/${connectionId}/request-logs`,
        {
          query: {
            ...query,
            from:
              query?.from instanceof Date
                ? query.from.toISOString()
                : query?.from,
            to: query?.to instanceof Date ? query.to.toISOString() : query?.to,
          } as unknown as Record<string, string | number | undefined>,
        },
      ),
  };

  // ── Links ────────────────────────────────────────────────────────────

  readonly links = {
    list: (operatorId: string, query?: ListLinksQuery) =>
      this.transport.request<LinkSummary[]>(
        `/connect/v1/operators/${operatorId}/links`,
        {
          query: query as unknown as Record<string, string | undefined>,
        },
      ),
    get: (operatorId: string, linkId: string) =>
      this.transport.request<LinkSummary>(
        `/connect/v1/operators/${operatorId}/links/${linkId}`,
      ),
    create: (operatorId: string, input: CreateLinkInput) =>
      this.transport.request<LinkSummary>(
        `/connect/v1/operators/${operatorId}/links`,
        {
          body: input,
          method: "POST",
        },
      ),
    update: (operatorId: string, linkId: string, input: UpdateLinkInput) =>
      this.transport.request<LinkSummary>(
        `/connect/v1/operators/${operatorId}/links/${linkId}`,
        { body: input, method: "PATCH" },
      ),
    updateCapability: (
      operatorId: string,
      linkId: string,
      capabilityId: string,
      input: UpdateLinkCapabilityInput,
    ) =>
      this.transport.request<LinkCapability>(
        `/connect/v1/operators/${operatorId}/links/${linkId}/capabilities/${capabilityId}`,
        { body: input, method: "PATCH" },
      ),
  };

  // ── OAuth clients ────────────────────────────────────────────────────

  readonly oauthClients = {
    list: (operatorId: string) =>
      this.transport.request<OAuthClientSummary[]>(
        `/connect/v1/operators/${operatorId}/oauth-clients`,
      ),
    create: (operatorId: string, input: CreateOAuthClientInput) =>
      this.transport.request<OAuthClientSummary>(
        `/connect/v1/operators/${operatorId}/oauth-clients`,
        { body: input, method: "POST" },
      ),
    revoke: (operatorId: string, clientId: string) =>
      this.transport.request<OAuthClientSummary>(
        `/connect/v1/operators/${operatorId}/oauth-clients/${clientId}`,
        { method: "DELETE" },
      ),
  };

  // ── Grants ───────────────────────────────────────────────────────────

  readonly grants = {
    listForOperator: (operatorId: string, query?: ListGrantsQuery) =>
      this.transport.request<GrantSummary[]>(
        `/connect/v1/operators/${operatorId}/grants`,
        {
          query: query as unknown as Record<string, string | undefined>,
        },
      ),
    create: (operatorId: string, input: CreateOperatorGrantInput) =>
      this.transport.request<GrantSummary>(
        `/connect/v1/operators/${operatorId}/grants`,
        {
          body: input,
          method: "POST",
        },
      ),
    update: (
      operatorId: string,
      grantId: string,
      input: UpdateOperatorGrantInput,
    ) =>
      this.transport.request<GrantSummary>(
        `/connect/v1/operators/${operatorId}/grants/${grantId}`,
        { body: input, method: "PATCH" },
      ),
    revoke: (operatorId: string, grantId: string) =>
      this.transport.request<GrantSummary>(
        `/connect/v1/operators/${operatorId}/grants/${grantId}`,
        { method: "DELETE" },
      ),
    listReceived: (query?: ListGrantsQuery) =>
      this.transport.request<GrantSummary[]>("/connect/v1/grants/received", {
        query: query as unknown as Record<string, string | undefined>,
      }),
    get: (grantId: string) =>
      this.transport.request<GrantSummary>(`/connect/v1/grants/${grantId}`),
  };

  // ── Audit logs ───────────────────────────────────────────────────────

  readonly auditLogs = {
    list: (query?: AuditLogQuery) =>
      this.transport.request<AuditLogPage>("/connect/v1/audit-logs", {
        query: query as unknown as Record<string, string | number | undefined>,
        unwrapData: false,
      }),
  };

  // ── Invite tokens ────────────────────────────────────────────────────

  readonly inviteTokens = {
    list: (operatorId: string) =>
      this.transport.request<InviteTokenSummary[]>(
        `/connect/v1/operators/${operatorId}/invite-tokens`,
      ),
    create: (operatorId: string, input: CreateInviteTokenInput) =>
      this.transport.request<InviteTokenSummary>(
        `/connect/v1/operators/${operatorId}/invite-tokens`,
        {
          body: {
            ...input,
            expiresAt:
              input.expiresAt instanceof Date
                ? input.expiresAt.toISOString()
                : input.expiresAt,
          },
          method: "POST",
        },
      ),
    revoke: (operatorId: string, inviteId: string) =>
      this.transport.request<InviteTokenSummary>(
        `/connect/v1/operators/${operatorId}/invite-tokens/${inviteId}`,
        { method: "DELETE" },
      ),
    lookup: (token: string) =>
      this.transport.request<PublicInviteInfo>(`/connect/v1/invites/${token}`),
    redeem: (token: string) =>
      this.transport.request<GrantSummary>(
        `/connect/v1/invites/${token}/redeem`,
        {
          method: "POST",
        },
      ),
  };

  // ── Webhook subscriptions ────────────────────────────────────────────

  readonly webhookSubscriptions = {
    list: (operatorId: string) =>
      this.transport.request<WebhookSubscriptionSummary[]>(
        `/connect/v1/operators/${operatorId}/webhook-subscriptions`,
      ),
    create: (operatorId: string, input: CreateWebhookSubscriptionInput) =>
      this.transport.request<WebhookSubscriptionSummary>(
        `/connect/v1/operators/${operatorId}/webhook-subscriptions`,
        { body: input, method: "POST" },
      ),
    update: (
      operatorId: string,
      subscriptionId: string,
      input: UpdateWebhookSubscriptionInput,
    ) =>
      this.transport.request<WebhookSubscriptionSummary>(
        `/connect/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}`,
        { body: input, method: "PATCH" },
      ),
    delete: (operatorId: string, subscriptionId: string) =>
      this.transport.request<WebhookSubscriptionSummary>(
        `/connect/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}`,
        { method: "DELETE" },
      ),
    listDeliveries: (
      operatorId: string,
      subscriptionId: string,
      query?: ListWebhookDeliveriesQuery,
    ) =>
      this.transport.request<WebhookDeliverySummary[]>(
        `/connect/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}/deliveries`,
        {
          query: query as unknown as Record<
            string,
            string | number | undefined
          >,
        },
      ),
    sendTestEvent: (operatorId: string, subscriptionId: string) =>
      this.transport.request<WebhookSubscriptionTestReceipt>(
        `/connect/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}/test`,
        { method: "POST" },
      ),
    replayDelivery: (
      operatorId: string,
      subscriptionId: string,
      deliveryId: string,
    ) =>
      this.transport.request<WebhookDeliveryReplayReceipt>(
        `/connect/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}/deliveries/${deliveryId}/replay`,
        { method: "POST" },
      ),
  };

  // ── Custom connection requests ───────────────────────────────────────

  readonly customConnectionRequests = {
    list: (organizationId: string) =>
      this.transport.request<CustomConnectionRequestSummary[]>(
        `/connect/v1/organizations/${organizationId}/custom-connection-requests`,
      ),
    create: (
      organizationId: string,
      input: CreateCustomConnectionRequestInput,
    ) =>
      this.transport.request<CustomConnectionRequestSummary>(
        `/connect/v1/organizations/${organizationId}/custom-connection-requests`,
        { body: input, method: "POST" },
      ),
  };

  // ── Products ─────────────────────────────────────────────────────────

  readonly products = {
    /**
     * List products across all connections in the operator's catalog.
     * Optionally filter by `connectionId` and/or `providerKey` (single value
     * or array). Falls back to the client's default `operatorId` when omitted.
     */
    list: async (filter?: ConnectionScopeFilter & OperatorScope) => {
      const operatorId = this.resolveOperatorId(filter);
      return this.transport.request<OperatorProductSummary[]>(
        `/connect/v1/operators/${operatorId}/products`,
        { query: scopeQuery(filter) },
      );
    },

    /** Look up a single product in the operator's catalog. */
    get: async (productId: string, scope?: OperatorScope) => {
      const operatorId = this.resolveOperatorId(scope);
      return this.transport.request<OperatorProductDetail>(
        `/connect/v1/operators/${operatorId}/products/${productId}`,
      );
    },

    /** Per-connection list (Connect-normalized). Optional `supplierId` filter. */
    listOnConnection: (
      connectionId: string,
      options?: { supplierId?: string },
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/products`,
        {
          query: options?.supplierId
            ? { supplierId: options.supplierId }
            : undefined,
          unwrapData: false,
        },
      ),

    /** Per-connection product lookup (Connect-normalized). */
    getOnConnection: (connectionId: string, productId: string) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/products/${productId}`,
        { unwrapData: false },
      ),

    /** List options for a product on a connection. */
    listOptions: (connectionId: string, productId: string) =>
      this.transport.request<ConnectOptionSummary[]>(
        `/connect/v1/connections/${connectionId}/products/${productId}/options`,
        { unwrapData: false },
      ),

    /** List extras (add-ons) for a product on a connection. */
    listExtras: (connectionId: string, productId: string) =>
      this.transport.request<ConnectProductExtraSummary[]>(
        `/connect/v1/connections/${connectionId}/products/${productId}/extras`,
        { unwrapData: false },
      ),
  };

  // ── Options ──────────────────────────────────────────────────────────

  readonly options = {
    /** List units (pricing/capacity buckets) for an option. */
    listUnits: (connectionId: string, optionId: string) =>
      this.transport.request<ConnectUnitSummary[]>(
        `/connect/v1/connections/${connectionId}/options/${optionId}/units`,
        { unwrapData: false },
      ),

    /** List per-option extras configuration. */
    listExtraConfigs: (connectionId: string, optionId: string) =>
      this.transport.request<ConnectOptionExtraConfigSummary[]>(
        `/connect/v1/connections/${connectionId}/options/${optionId}/extra-configs`,
        { unwrapData: false },
      ),
  };

  // ── Suppliers ────────────────────────────────────────────────────────

  readonly suppliers = {
    /**
     * List suppliers across all connections in the operator's catalog.
     * Optionally filter by `connectionId` and/or `providerKey`.
     */
    list: async (filter?: ConnectionScopeFilter & OperatorScope) => {
      const operatorId = this.resolveOperatorId(filter);
      return this.transport.request<OperatorSupplierSummary[]>(
        `/connect/v1/operators/${operatorId}/suppliers`,
        { query: scopeQuery(filter) },
      );
    },

    /** Per-connection list (Connect-normalized). */
    listOnConnection: (connectionId: string) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/suppliers`,
        { unwrapData: false },
      ),
  };

  // ── Availability ─────────────────────────────────────────────────────

  readonly availability = {
    /** Per-connection availability slots (Connect-normalized). */
    list: (connectionId: string, query: ConnectAvailabilityQuery) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/availability`,
        {
          query: query as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),

    /** Per-connection calendar query (Connect-normalized). */
    calendar: (connectionId: string, input: AvailabilityCalendarQueryInput) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/availability/calendar`,
        { body: input, method: "POST", unwrapData: false },
      ),
  };

  // ── Bookings ─────────────────────────────────────────────────────────

  readonly bookings = {
    /**
     * List bookings across all connections in the operator's catalog.
     * Filter by `connectionId`, `providerKey`, status, and/or date range.
     */
    listAll: async (
      filter?: ConnectionScopeFilter &
        OperatorScope &
        ListOperatorBookingsQuery,
    ) => {
      const operatorId = this.resolveOperatorId(filter);
      const query: Record<string, string | string[] | number | undefined> = {};
      if (filter?.connectionId !== undefined)
        query.connectionId = filter.connectionId;
      if (filter?.providerKey !== undefined)
        query.providerKey = filter.providerKey;
      if (filter?.status !== undefined) query.status = filter.status;
      if (filter?.localDateStart !== undefined)
        query.localDateStart = filter.localDateStart;
      if (filter?.localDateEnd !== undefined)
        query.localDateEnd = filter.localDateEnd;
      if (filter?.limit !== undefined) query.limit = filter.limit;
      return this.transport.request<OperatorBookingSummary[]>(
        `/connect/v1/operators/${operatorId}/bookings`,
        { query },
      );
    },

    /** Per-connection booking list (Connect-normalized). */
    list: (connectionId: string, query?: ConnectListBookingsQuery) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/bookings`,
        {
          query: query as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),

    get: (connectionId: string, bookingId: string) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/bookings/${bookingId}`,
        { unwrapData: false },
      ),

    create: (
      connectionId: string,
      input: CreateBookingInput,
      options?: { idempotencyKey?: string },
    ) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/bookings`,
        {
          body: input,
          headers: withIdempotency(options?.idempotencyKey),
          method: "POST",
          unwrapData: false,
        },
      ),

    confirm: (
      connectionId: string,
      bookingId: string,
      input?: ConfirmBookingInput,
    ) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/bookings/${bookingId}/confirm`,
        { body: input ?? {}, method: "POST", unwrapData: false },
      ),

    cancel: (
      connectionId: string,
      bookingId: string,
      input?: CancelBookingInput,
    ) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/bookings/${bookingId}`,
        { body: input ?? {}, method: "DELETE", unwrapData: false },
      ),

    /** Booking activity log (Connect-normalized). */
    listActivities: (
      connectionId: string,
      bookingId: string,
      query?: ListBookingActivitiesQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/bookings/${bookingId}/activities`,
        {
          query: {
            from:
              query?.from instanceof Date
                ? query.from.toISOString()
                : query?.from,
            to: query?.to instanceof Date ? query.to.toISOString() : query?.to,
            type: query?.type,
            limit: query?.limit,
          } as unknown as Record<
            string,
            string | string[] | number | undefined
          >,
          unwrapData: false,
        },
      ),
  };

  // ── Health ───────────────────────────────────────────────────────────

  readonly health = {
    /** Per-connection sync health. */
    get: (connectionId: string) =>
      this.transport.request<ConnectChannelHealth>(
        `/connect/v1/connections/${connectionId}/health`,
        { unwrapData: false },
      ),
  };

  // ── Accommodations (hospitality data plane) ──────────────────────────

  readonly accommodations = {
    /**
     * List accommodations across all connections in the operator's catalog.
     * Filter by `connectionId`, `providerKey`, `category`, `countryCode`,
     * `city`, `minStars`, `locale`. Falls back to client.operatorId.
     */
    list: async (
      filter?: ConnectionScopeFilter & OperatorScope & ListAccommodationsQuery,
    ) => {
      const operatorId = this.resolveOperatorId(filter);
      const query: Record<string, string | string[] | number | undefined> = {};
      if (filter?.connectionId !== undefined)
        query.connectionId = filter.connectionId;
      if (filter?.providerKey !== undefined)
        query.providerKey = filter.providerKey;
      if (filter?.category !== undefined) query.category = filter.category;
      if (filter?.countryCode !== undefined)
        query.countryCode = filter.countryCode;
      if (filter?.city !== undefined) query.city = filter.city;
      if (filter?.minStars !== undefined) query.minStars = filter.minStars;
      if (filter?.maxPriceFromAmountMinor !== undefined)
        query.maxPriceFromAmountMinor = filter.maxPriceFromAmountMinor;
      if (filter?.locale !== undefined) query.locale = filter.locale;
      if (filter?.limit !== undefined) query.limit = filter.limit;
      return this.transport.request<OperatorAccommodationSummary[]>(
        `/connect/v1/operators/${operatorId}/accommodations`,
        { query },
      );
    },

    /** Look up an accommodation in the operator's catalog. */
    get: async (
      accommodationId: string,
      scope?: OperatorScope & { locale?: string },
    ) => {
      const operatorId = this.resolveOperatorId(scope);
      return this.transport.request<OperatorAccommodationDetail>(
        `/connect/v1/operators/${operatorId}/accommodations/${accommodationId}`,
        {
          query: scope?.locale ? { locale: scope.locale } : undefined,
        },
      );
    },

    /** Per-connection list (Connect-normalized). */
    listOnConnection: (
      connectionId: string,
      options?: { locale?: string; limit?: number },
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/accommodations`,
        {
          query: options as unknown as Record<
            string,
            string | number | undefined
          >,
          unwrapData: false,
        },
      ),

    /** Per-connection accommodation lookup. */
    getOnConnection: (
      connectionId: string,
      accommodationId: string,
      options?: { locale?: string },
    ) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/accommodations/${accommodationId}`,
        {
          query: options as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),

    /** List room types for an accommodation on a connection. */
    listRoomTypes: (
      connectionId: string,
      accommodationExternalId: string,
      options?: { locale?: string },
    ) =>
      this.transport.request<RoomType[]>(
        `/connect/v1/connections/${connectionId}/accommodations/${accommodationExternalId}/room-types`,
        {
          query: options as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),

    /** List rate plans for an accommodation, optionally filtered by room type. */
    listRatePlans: (
      connectionId: string,
      accommodationExternalId: string,
      options?: { roomTypeId?: string; locale?: string },
    ) =>
      this.transport.request<RatePlan[]>(
        `/connect/v1/connections/${connectionId}/accommodations/${accommodationExternalId}/rate-plans`,
        {
          query: options as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),
  };

  // ── Stays (search + booking lifecycle) ───────────────────────────────

  readonly stays = {
    /** Per-connection search; delegates to the adapter. Returns offers + diagnostics. */
    search: (connectionId: string, query: StaySearchQuery) =>
      this.transport.request<StaySearchResponse>(
        `/connect/v1/connections/${connectionId}/stays/search`,
        { body: query, method: "POST", unwrapData: false },
      ),

    /**
     * Cross-connection search. Fans out across the operator's accessible
     * connections in parallel, merges offers, returns a unified response with
     * `connectionDiagnostics` per connection.
     */
    searchAcrossProviders: async (
      query: StaySearchQuery,
      filter?: ConnectionScopeFilter & OperatorScope,
    ) => {
      const operatorId = this.resolveOperatorId(filter);
      const body: Record<string, unknown> = { ...query };
      if (
        filter &&
        (filter.connectionId !== undefined || filter.providerKey !== undefined)
      ) {
        body.filter = {
          connectionId: filter.connectionId,
          providerKey: filter.providerKey,
        };
      }
      return this.transport.request<StaySearchResponse>(
        `/connect/v1/operators/${operatorId}/stays/search`,
        { body, method: "POST", unwrapData: false },
      );
    },

    /**
     * Lock an offer. Pass the StayOffer returned from search; Connect creates a
     * server-side hold whose TTL caps any provider-native lock that exists.
     */
    lock: (
      connectionId: string,
      offer: StayOffer,
      options?: { ttlMinutes?: number },
    ) =>
      this.transport.request<StayHold>(
        `/connect/v1/connections/${connectionId}/stays/lock`,
        {
          body: { offerId: offer.id, offer, ttlMinutes: options?.ttlMinutes },
          method: "POST",
          unwrapData: false,
        },
      ),

    releaseLock: (connectionId: string, holdId: string) =>
      this.transport.request<StayHold>(
        `/connect/v1/connections/${connectionId}/stays/holds/${holdId}`,
        { method: "DELETE", unwrapData: false },
      ),

    getHold: (connectionId: string, holdId: string) =>
      this.transport.request<StayHold>(
        `/connect/v1/connections/${connectionId}/stays/holds/${holdId}`,
        { unwrapData: false },
      ),

    /**
     * Confirm a held offer into a booking. `idempotencyKey` becomes
     * `Idempotency-Key` and is enforced server-side against the hold.
     */
    confirm: (
      connectionId: string,
      input: StayConfirmInput,
      options?: { idempotencyKey?: string },
    ) =>
      this.transport.request<StayBooking>(
        `/connect/v1/connections/${connectionId}/stays/bookings`,
        {
          body: input,
          headers: withIdempotency(options?.idempotencyKey),
          method: "POST",
          unwrapData: false,
        },
      ),

    cancel: (
      connectionId: string,
      bookingId: string,
      options?: { reason?: string },
    ) =>
      this.transport.request<StayBooking>(
        `/connect/v1/connections/${connectionId}/stays/bookings/${bookingId}`,
        {
          body: options?.reason ? { reason: options.reason } : {},
          method: "DELETE",
          unwrapData: false,
        },
      ),

    get: (connectionId: string, bookingId: string) =>
      this.transport.request<StayBooking>(
        `/connect/v1/connections/${connectionId}/stays/bookings/${bookingId}`,
        { unwrapData: false },
      ),

    list: (
      connectionId: string,
      query?: {
        status?: string | string[];
        checkInFrom?: string;
        checkInTo?: string;
        limit?: number;
      },
    ) =>
      this.transport.request<StayBooking[]>(
        `/connect/v1/connections/${connectionId}/stays/bookings`,
        {
          query: query as unknown as Record<
            string,
            string | string[] | number | undefined
          >,
          unwrapData: false,
        },
      ),

    /** Cross-connection booking list scoped to the operator. */
    listAll: async (
      filter?: ConnectionScopeFilter &
        OperatorScope & {
          status?: string | string[];
          checkInFrom?: string;
          checkInTo?: string;
          limit?: number;
        },
    ) => {
      const operatorId = this.resolveOperatorId(filter);
      const query: Record<string, string | string[] | number | undefined> = {};
      if (filter?.connectionId !== undefined)
        query.connectionId = filter.connectionId;
      if (filter?.providerKey !== undefined)
        query.providerKey = filter.providerKey;
      if (filter?.status !== undefined) query.status = filter.status;
      if (filter?.checkInFrom !== undefined)
        query.checkInFrom = filter.checkInFrom;
      if (filter?.checkInTo !== undefined) query.checkInTo = filter.checkInTo;
      if (filter?.limit !== undefined) query.limit = filter.limit;
      return this.transport.request<
        Array<
          StayBooking & { providerKey: string | null; supplierName: string }
        >
      >(`/connect/v1/operators/${operatorId}/stays/bookings`, { query });
    },
  };

  // ── Cruises (cruise data plane — read API) ───────────────────────────

  readonly cruises = {
    /**
     * List cruises across all of the operator's accessible connections.
     * Filter by `connectionId`, `providerKey`, `cruiseType`, line/ship,
     * `minNights`/`maxNights`, `locale`. Falls back to client.operatorId.
     */
    list: async (
      filter?: ConnectionScopeFilter & OperatorScope & ListCruisesQuery,
    ) => {
      const operatorId = this.resolveOperatorId(filter);
      const query: Record<string, string | string[] | number | undefined> = {};
      if (filter?.connectionId !== undefined)
        query.connectionId = filter.connectionId;
      if (filter?.providerKey !== undefined)
        query.providerKey = filter.providerKey;
      if (filter?.cruiseType !== undefined)
        query.cruiseType = filter.cruiseType;
      if (filter?.cruiseLineExternalId !== undefined)
        query.cruiseLineExternalId = filter.cruiseLineExternalId;
      if (filter?.shipExternalId !== undefined)
        query.shipExternalId = filter.shipExternalId;
      if (filter?.minNights !== undefined) query.minNights = filter.minNights;
      if (filter?.maxNights !== undefined) query.maxNights = filter.maxNights;
      if (filter?.locale !== undefined) query.locale = filter.locale;
      if (filter?.limit !== undefined) query.limit = filter.limit;
      return this.transport.request<OperatorCruiseSummary[]>(
        `/connect/v1/operators/${operatorId}/cruises`,
        { query },
      );
    },

    /** Look up a cruise by id in the operator's catalog. */
    get: async (
      cruiseId: string,
      scope?: OperatorScope & { locale?: string },
    ) => {
      const operatorId = this.resolveOperatorId(scope);
      return this.transport.request<OperatorCruiseDetail>(
        `/connect/v1/operators/${operatorId}/cruises/${cruiseId}`,
        {
          query: scope?.locale ? { locale: scope.locale } : undefined,
        },
      );
    },

    /** Per-connection list (Connect-normalized). */
    listOnConnection: (
      connectionId: string,
      options?: { locale?: string; limit?: number },
    ) =>
      this.transport.request<ConnectCruiseRow[]>(
        `/connect/v1/connections/${connectionId}/cruises`,
        {
          query: options as unknown as Record<
            string,
            string | number | undefined
          >,
          unwrapData: false,
        },
      ),

    /** Per-connection cruise lookup. */
    getOnConnection: (
      connectionId: string,
      cruiseId: string,
      options?: { locale?: string },
    ) =>
      this.transport.request<ConnectCruiseRow>(
        `/connect/v1/connections/${connectionId}/cruises/${cruiseId}`,
        {
          query: options as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),

    /**
     * Cross-connection sailings list — primary search axis is departure
     * window. Filter by cruise/ship/sales status.
     */
    listSailings: async (
      filter?: ConnectionScopeFilter & OperatorScope & ListSailingsQuery,
    ) => {
      const operatorId = this.resolveOperatorId(filter);
      const query: Record<string, string | string[] | number | undefined> = {};
      if (filter?.connectionId !== undefined)
        query.connectionId = filter.connectionId;
      if (filter?.providerKey !== undefined)
        query.providerKey = filter.providerKey;
      if (filter?.cruiseExternalId !== undefined)
        query.cruiseExternalId = filter.cruiseExternalId;
      if (filter?.shipExternalId !== undefined)
        query.shipExternalId = filter.shipExternalId;
      if (filter?.salesStatus !== undefined)
        query.salesStatus = filter.salesStatus;
      if (filter?.departureFrom !== undefined)
        query.departureFrom = filter.departureFrom;
      if (filter?.departureTo !== undefined)
        query.departureTo = filter.departureTo;
      if (filter?.limit !== undefined) query.limit = filter.limit;
      return this.transport.request<OperatorSailingSummary[]>(
        `/connect/v1/operators/${operatorId}/sailings`,
        { query },
      );
    },

    /** Look up a sailing by id in the operator's catalog. */
    getSailing: async (sailingId: string, scope?: OperatorScope) => {
      const operatorId = this.resolveOperatorId(scope);
      return this.transport.request<OperatorSailingDetail>(
        `/connect/v1/operators/${operatorId}/sailings/${sailingId}`,
      );
    },

    /** Per-connection sailings list. */
    listSailingsOnConnection: (
      connectionId: string,
      options?: {
        cruiseExternalId?: string;
        departureFrom?: string;
        departureTo?: string;
        salesStatus?: string | string[];
        limit?: number;
      },
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/sailings`,
        {
          query: options as unknown as Record<
            string,
            string | string[] | number | undefined
          >,
          unwrapData: false,
        },
      ),

    /** Per-connection sailing lookup. */
    getSailingOnConnection: (connectionId: string, sailingId: string) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/sailings/${sailingId}`,
        { unwrapData: false },
      ),

    /** Itinerary days for a sailing on a connection (port calls + sea days). */
    listItinerary: (connectionId: string, sailingExternalId: string) =>
      this.transport.request<ListItineraryDay[]>(
        `/connect/v1/connections/${connectionId}/sailings/${sailingExternalId}/itinerary`,
        { unwrapData: false },
      ),

    /** Cabin pricing grid for a sailing on a connection. */
    listSailingPricing: (
      connectionId: string,
      sailingExternalId: string,
      query?: ListSailingPricingQuery,
    ) =>
      this.transport.request<CabinPricing[]>(
        `/connect/v1/connections/${connectionId}/sailings/${sailingExternalId}/pricing`,
        {
          query: query as unknown as Record<
            string,
            string | number | undefined
          >,
          unwrapData: false,
        },
      ),

    /** Promotions available for a sailing on a connection. */
    listSailingPromotions: (
      connectionId: string,
      sailingExternalId: string,
      query?: ListSailingPromotionsQuery,
    ) =>
      this.transport.request<CruisePromotion[]>(
        `/connect/v1/connections/${connectionId}/sailings/${sailingExternalId}/promotions`,
        {
          query: query as unknown as Record<
            string,
            string | number | undefined
          >,
          unwrapData: false,
        },
      ),

    /** Cruise lines available on a connection. */
    listCruiseLines: (connectionId: string, options?: { locale?: string }) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/cruise-lines`,
        {
          query: options as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),

    /** Ships on a connection — optionally filter by cruise line. */
    listShips: (
      connectionId: string,
      options?: {
        cruiseLineExternalId?: string;
        locale?: string;
        limit?: number;
      },
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/ships`,
        {
          query: options as unknown as Record<
            string,
            string | number | undefined
          >,
          unwrapData: false,
        },
      ),

    /** Per-connection ship lookup. */
    getShip: (connectionId: string, shipId: string) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/ships/${shipId}`,
        { unwrapData: false },
      ),

    /** Cabin categories for a ship on a connection. */
    listCabinCategories: (
      connectionId: string,
      shipExternalId: string,
      options?: { locale?: string },
    ) =>
      this.transport.request<JsonObject[]>(
        `/connect/v1/connections/${connectionId}/ships/${shipExternalId}/cabin-categories`,
        {
          query: options as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),

    /** Per-connection cruise search; reads the local cache. */
    search: (connectionId: string, query: CruiseSearchQuery) =>
      this.transport.request<CruiseSearchResponse>(
        `/connect/v1/connections/${connectionId}/cruises/search`,
        { body: query, method: "POST", unwrapData: false },
      ),

    /**
     * Cross-connection cruise search. Fans out across the operator's
     * accessible connections, merges offers, returns a unified response with
     * `connectionDiagnostics` per connection.
     */
    searchAcrossProviders: async (
      query: CruiseSearchQuery,
      filter?: ConnectionScopeFilter & OperatorScope,
    ) => {
      const operatorId = this.resolveOperatorId(filter);
      const body: Record<string, unknown> = { ...query };
      if (
        filter &&
        (filter.connectionId !== undefined || filter.providerKey !== undefined)
      ) {
        body.filter = {
          connectionId: filter.connectionId,
          providerKey: filter.providerKey,
        };
      }
      return this.transport.request<CruiseSearchResponse>(
        `/connect/v1/operators/${operatorId}/cruises/search`,
        { body, method: "POST", unwrapData: false },
      );
    },
  };

  // ── Cruise bookings (lock + confirm + lifecycle) ─────────────────────

  readonly cruiseBookings = {
    /**
     * Inquiry-mode booking: creates a sales lead, no provider hold. The
     * reseller follows up out-of-band. Returns the booking with status
     * `inquiry`.
     */
    inquire: (connectionId: string, input: CruiseInquireInput) =>
      this.transport.request<CruiseBooking>(
        `/connect/v1/connections/${connectionId}/cruise-bookings/inquiries`,
        { body: input, method: "POST", unwrapData: false },
      ),

    /**
     * Lock a cruise offer (reserve mode). Connect creates a server-side
     * quote with a 24h default TTL; if the adapter has a native option API
     * (e.g. Viking), Connect calls it under the hood.
     */
    lock: (
      connectionId: string,
      offer: CruiseOffer,
      options?: { ttlHours?: number },
    ) =>
      this.transport.request<CruiseQuote>(
        `/connect/v1/connections/${connectionId}/cruises/lock`,
        {
          body: { offer, ttlHours: options?.ttlHours },
          method: "POST",
          unwrapData: false,
        },
      ),

    /**
     * Lock a concrete cruise selection. Connect resolves the current
     * normalized pricing row server-side, builds the canonical offer snapshot,
     * optionally calls the provider lock API, and returns the quote.
     */
    lockSelection: (connectionId: string, input: CruiseLockSelectionInput) =>
      this.transport.request<CruiseQuote>(
        `/connect/v1/connections/${connectionId}/cruises/lock-selection`,
        { body: input, method: "POST", unwrapData: false },
      ),

    releaseLock: (connectionId: string, quoteId: string) =>
      this.transport.request<CruiseQuote>(
        `/connect/v1/connections/${connectionId}/cruise-quotes/${quoteId}`,
        { method: "DELETE", unwrapData: false },
      ),

    getQuote: (connectionId: string, quoteId: string) =>
      this.transport.request<CruiseQuote>(
        `/connect/v1/connections/${connectionId}/cruise-quotes/${quoteId}`,
        { unwrapData: false },
      ),

    /**
     * Confirm a held offer into a booking (reserve mode). `idempotencyKey`
     * becomes `Idempotency-Key` and is enforced server-side against the
     * quote.
     */
    confirm: (
      connectionId: string,
      input: CruiseConfirmInput,
      options?: { idempotencyKey?: string },
    ) =>
      this.transport.request<CruiseBooking>(
        `/connect/v1/connections/${connectionId}/cruise-bookings`,
        {
          body: input,
          headers: withIdempotency(options?.idempotencyKey),
          method: "POST",
          unwrapData: false,
        },
      ),

    cancel: (
      connectionId: string,
      bookingId: string,
      options?: { reason?: string },
    ) =>
      this.transport.request<CruiseBooking>(
        `/connect/v1/connections/${connectionId}/cruise-bookings/${bookingId}/cancel`,
        {
          body: options?.reason ? { reason: options.reason } : {},
          method: "POST",
          unwrapData: false,
        },
      ),

    get: (connectionId: string, bookingId: string) =>
      this.transport.request<CruiseBooking>(
        `/connect/v1/connections/${connectionId}/cruise-bookings/${bookingId}`,
        { unwrapData: false },
      ),

    list: (
      connectionId: string,
      query?: {
        status?: string | string[];
        mode?: string | string[];
        departureFrom?: string;
        departureTo?: string;
        limit?: number;
      },
    ) =>
      this.transport.request<CruiseBooking[]>(
        `/connect/v1/connections/${connectionId}/cruise-bookings`,
        {
          query: query as unknown as Record<
            string,
            string | string[] | number | undefined
          >,
          unwrapData: false,
        },
      ),

    /** Cross-connection booking list scoped to the operator. */
    listAll: async (
      filter?: ConnectionScopeFilter &
        OperatorScope & {
          status?: string | string[];
          mode?: string | string[];
          departureFrom?: string;
          departureTo?: string;
          limit?: number;
        },
    ) => {
      const operatorId = this.resolveOperatorId(filter);
      const query: Record<string, string | string[] | number | undefined> = {};
      if (filter?.connectionId !== undefined)
        query.connectionId = filter.connectionId;
      if (filter?.providerKey !== undefined)
        query.providerKey = filter.providerKey;
      if (filter?.status !== undefined) query.status = filter.status;
      if (filter?.mode !== undefined) query.mode = filter.mode;
      if (filter?.departureFrom !== undefined)
        query.departureFrom = filter.departureFrom;
      if (filter?.departureTo !== undefined)
        query.departureTo = filter.departureTo;
      if (filter?.limit !== undefined) query.limit = filter.limit;
      return this.transport.request<
        Array<
          CruiseBooking & { providerKey: string | null; supplierName: string }
        >
      >(`/connect/v1/operators/${operatorId}/cruise-bookings`, { query });
    },
  };

  // ── Flights ──────────────────────────────────────────────────────────

  readonly flights = {
    search: (input: FlightMultiSearchInput) =>
      this.transport.request<FlightSearchResult>("/connect/v1/flights/search", {
        body: input,
        method: "POST",
      }),
    /**
     * Server-Sent Events variant of multi-connection search. Returns the raw
     * `Response` so callers can stream events with their preferred parser.
     */
    searchStream: (
      input: FlightMultiSearchInput,
      options?: { signal?: AbortSignal },
    ) =>
      this.transport.fetchRaw("/connect/v1/flights/search-stream", {
        body: input,
        headers: { accept: "text/event-stream" },
        method: "POST",
        signal: options?.signal,
      }),
    searchOnConnection: (connectionId: string, input: FlightSearchInput) =>
      this.transport.request<FlightSearchResult>(
        `/connect/v1/connections/${connectionId}/flights/search`,
        { body: input, method: "POST" },
      ),
    price: (connectionId: string, input: FlightPriceInput) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/flights/price`,
        { body: input, method: "POST" },
      ),
    book: (connectionId: string, input: FlightBookInput) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders`,
        { body: input, method: "POST" },
      ),
    getOrder: (connectionId: string, orderId: string) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}`,
      ),
    cancelOrder: (connectionId: string, orderId: string) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}`,
        { method: "DELETE" },
      ),
    ticketOrder: (connectionId: string, orderId: string) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/ticket`,
        { method: "POST" },
      ),
    getSeatMap: (connectionId: string, orderId: string, segmentId: string) =>
      this.transport.request<FlightSeatMap>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/seats/${segmentId}`,
      ),
    selectSeats: (
      connectionId: string,
      orderId: string,
      input: FlightSeatSelectionInput,
    ) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/seats`,
        { body: input, method: "POST" },
      ),
    getAncillaries: (connectionId: string, orderId: string) =>
      this.transport.request<FlightAncillaryList>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/ancillaries`,
      ),
    addAncillary: (
      connectionId: string,
      orderId: string,
      input: FlightAncillaryInput,
    ) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/ancillaries`,
        { body: input, method: "POST" },
      ),
    checkIn: (
      connectionId: string,
      orderId: string,
      input: FlightCheckInInput,
    ) =>
      this.transport.request<JsonObject>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/checkin`,
        { body: input, method: "POST" },
      ),
    exchange: (
      connectionId: string,
      orderId: string,
      input: FlightExchangeInput,
    ) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/exchange`,
        { body: input, method: "POST" },
      ),
    refund: (connectionId: string, orderId: string, input: FlightRefundInput) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/refund`,
        { body: input, method: "POST" },
      ),
    voidOrder: (connectionId: string, orderId: string) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/void`,
        { method: "POST" },
      ),
    addServiceRequest: (
      connectionId: string,
      orderId: string,
      input: FlightSsrInput,
    ) =>
      this.transport.request<FlightOrder>(
        `/connect/v1/connections/${connectionId}/flights/orders/${orderId}/ssr`,
        { body: input, method: "POST" },
      ),
  };
}

export function createVoyantConnectClient(options: VoyantConnectClientOptions) {
  return new VoyantConnectClient(options);
}
