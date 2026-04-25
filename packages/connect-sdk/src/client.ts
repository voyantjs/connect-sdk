import { VoyantTransport } from "@voyant-sdk/sdk-core";
import type { JsonObject } from "@voyant-sdk/sdk-core";

import type {
  AuditLogPage,
  AuditLogQuery,
  AvailabilityCalendarQueryInput,
  AvailabilityQueryInput,
  CancelBookingInput,
  ConfirmBookingInput,
  ConnectAvailabilityQuery,
  ConnectChannelHealth,
  ConnectListBookingsQuery,
  ConnectOptionExtraConfigSummary,
  ConnectOptionSummary,
  ConnectProductExtraSummary,
  ConnectUnitSummary,
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
  ListBookingsQuery,
  ListGrantsQuery,
  ListHealthEventsQuery,
  ListLinksQuery,
  ListProjectionSyncsQuery,
  ListRequestLogsQuery,
  ListWebhookDeliveriesQuery,
  ListWebhookEventsQuery,
  OAuthClientSummary,
  OAuthTokenResponse,
  OperatorProductDetail,
  OperatorProductSummary,
  OperatorProviderRegistration,
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

function withIdempotency(idempotencyKey: string | undefined): HeadersInit | undefined {
  if (!idempotencyKey) return undefined;
  return { "idempotency-key": idempotencyKey };
}

export class VoyantConnectClient {
  readonly transport: VoyantTransport;

  constructor(options: VoyantConnectClientOptions) {
    this.transport = new VoyantTransport(options);
  }

  // ── OAuth ─────────────────────────────────────────────────────────────

  readonly oauth = {
    issueToken: (input: IssueTokenInput) =>
      this.transport.request<OAuthTokenResponse>("/v1/oauth/token", {
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

  // ── Operators ─────────────────────────────────────────────────────────

  readonly operators = {
    list: () => this.transport.request<OperatorSummary[]>("/v1/operators"),
    get: (operatorId: string) =>
      this.transport.request<OperatorSummary>(`/v1/operators/${operatorId}`),
    create: (input: CreateOperatorInput) =>
      this.transport.request<OperatorSummary>("/v1/operators", {
        body: input,
        method: "POST",
      }),
    update: (operatorId: string, input: UpdateOperatorInput) =>
      this.transport.request<OperatorSummary>(`/v1/operators/${operatorId}`, {
        body: input,
        method: "PATCH",
      }),
    deactivate: (operatorId: string) =>
      this.transport.request<OperatorSummary>(`/v1/operators/${operatorId}`, {
        method: "DELETE",
      }),
    getUsage: (operatorId: string, query?: UsageQuery) =>
      this.transport.request<UsageSummary>(`/v1/operators/${operatorId}/usage`, {
        query: query as unknown as Record<string, string | undefined>,
      }),
    listProducts: (operatorId: string) =>
      this.transport.request<OperatorProductSummary[]>(
        `/v1/operators/${operatorId}/products`,
      ),
    getProduct: (operatorId: string, productId: string) =>
      this.transport.request<OperatorProductDetail>(
        `/v1/operators/${operatorId}/products/${productId}`,
      ),
    listSuppliers: (operatorId: string) =>
      this.transport.request<OperatorSupplierSummary[]>(
        `/v1/operators/${operatorId}/suppliers`,
      ),
    listSearchDocuments: (operatorId: string, query?: SearchDocumentQuery) =>
      this.transport.request<SearchDocument[]>(
        `/v1/operators/${operatorId}/search-documents`,
        { query: query as unknown as Record<string, string | number | undefined> },
      ),
    listSearchProjectionChanges: (
      operatorId: string,
      query?: SearchProjectionChangeQuery,
    ) =>
      this.transport.request<SearchProjectionChangePage>(
        `/v1/operators/${operatorId}/search-projection-changes`,
        {
          query: query as unknown as Record<string, string | number | undefined>,
          unwrapData: false,
        },
      ),
  };

  // ── Connector providers ──────────────────────────────────────────────

  readonly connectorProviders = {
    list: () =>
      this.transport.request<ConnectorProviderSummary[]>("/v1/connector-providers"),
    update: (providerKey: string, input: UpdateConnectorProviderInput) =>
      this.transport.request<ConnectorProviderSummary>(
        `/v1/connector-providers/${providerKey}`,
        { body: input, method: "PATCH" },
      ),
    listApplications: (providerKey: string) =>
      this.transport.request<ConnectorProviderApplicationSummary[]>(
        `/v1/connector-providers/${providerKey}/applications`,
      ),
    listRegistrations: (operatorId: string) =>
      this.transport.request<OperatorProviderRegistration[]>(
        `/v1/operators/${operatorId}/provider-registrations`,
      ),
    getRegistration: (operatorId: string, registrationId: string) =>
      this.transport.request<OperatorProviderRegistration>(
        `/v1/operators/${operatorId}/provider-registrations/${registrationId}`,
      ),
    upsertRegistration: (operatorId: string, input: UpsertProviderRegistrationInput) =>
      this.transport.request<OperatorProviderRegistration>(
        `/v1/operators/${operatorId}/provider-registrations`,
        { body: input, method: "POST" },
      ),
    updateRegistration: (
      operatorId: string,
      registrationId: string,
      input: UpsertProviderRegistrationInput,
    ) =>
      this.transport.request<OperatorProviderRegistration>(
        `/v1/operators/${operatorId}/provider-registrations/${registrationId}`,
        { body: input, method: "PATCH" },
      ),
    updateTuiSettings: (
      operatorId: string,
      registrationId: string,
      input: UpdateTuiProviderSettingsInput,
    ) =>
      this.transport.request<OperatorProviderRegistration>(
        `/v1/operators/${operatorId}/provider-registrations/${registrationId}/tui-settings`,
        { body: input, method: "PATCH" },
      ),
    revalidateRegistration: (operatorId: string, registrationId: string) =>
      this.transport.request<OperatorProviderRegistration>(
        `/v1/operators/${operatorId}/provider-registrations/${registrationId}/revalidate`,
        { method: "POST" },
      ),
  };

  // ── Connections (control plane) ──────────────────────────────────────

  readonly connections = {
    list: (operatorId: string) =>
      this.transport.request<ConnectionSummary[]>(
        `/v1/operators/${operatorId}/connections`,
      ),
    get: (operatorId: string, connectionId: string) =>
      this.transport.request<ConnectionSummary>(
        `/v1/operators/${operatorId}/connections/${connectionId}`,
      ),
    create: (operatorId: string, input: CreateConnectionInput) =>
      this.transport.request<ConnectionSummary>(
        `/v1/operators/${operatorId}/connections`,
        { body: input, method: "POST" },
      ),
    update: (operatorId: string, connectionId: string, input: UpdateConnectionInput) =>
      this.transport.request<ConnectionSummary>(
        `/v1/operators/${operatorId}/connections/${connectionId}`,
        { body: input, method: "PATCH" },
      ),
    delete: (operatorId: string, connectionId: string) =>
      this.transport.request<ConnectionSummary>(
        `/v1/operators/${operatorId}/connections/${connectionId}`,
        { method: "DELETE" },
      ),
    rotateWebhookSecret: (operatorId: string, connectionId: string) =>
      this.transport.request<RotatedWebhookSecret>(
        `/v1/operators/${operatorId}/connections/${connectionId}/webhook-secret/rotate`,
        { method: "POST" },
      ),
    listProjectionSyncs: (
      operatorId: string,
      connectionId: string,
      query?: ListProjectionSyncsQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/v1/operators/${operatorId}/connections/${connectionId}/search-projection-syncs`,
        { query: query as unknown as Record<string, number | undefined> },
      ),
    triggerProjectionSync: (operatorId: string, connectionId: string) =>
      this.transport.request<ProjectionSyncRunReceipt>(
        `/v1/operators/${operatorId}/connections/${connectionId}/search-projection-syncs`,
        { method: "POST" },
      ),
    listWebhookEvents: (
      operatorId: string,
      connectionId: string,
      query?: ListWebhookEventsQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/v1/operators/${operatorId}/connections/${connectionId}/webhook-events`,
        { query: query as unknown as Record<string, string | number | undefined> },
      ),
    listHealthEvents: (
      operatorId: string,
      connectionId: string,
      query?: ListHealthEventsQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/v1/operators/${operatorId}/connections/${connectionId}/health-events`,
        { query: query as unknown as Record<string, string | number | undefined> },
      ),
    listRequestLogs: (
      operatorId: string,
      connectionId: string,
      query?: ListRequestLogsQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/v1/operators/${operatorId}/connections/${connectionId}/request-logs`,
        {
          query: {
            ...query,
            from: query?.from instanceof Date ? query.from.toISOString() : query?.from,
            to: query?.to instanceof Date ? query.to.toISOString() : query?.to,
          } as unknown as Record<string, string | number | undefined>,
        },
      ),
  };

  // ── Links ────────────────────────────────────────────────────────────

  readonly links = {
    list: (operatorId: string, query?: ListLinksQuery) =>
      this.transport.request<LinkSummary[]>(`/v1/operators/${operatorId}/links`, {
        query: query as unknown as Record<string, string | undefined>,
      }),
    get: (operatorId: string, linkId: string) =>
      this.transport.request<LinkSummary>(
        `/v1/operators/${operatorId}/links/${linkId}`,
      ),
    create: (operatorId: string, input: CreateLinkInput) =>
      this.transport.request<LinkSummary>(`/v1/operators/${operatorId}/links`, {
        body: input,
        method: "POST",
      }),
    update: (operatorId: string, linkId: string, input: UpdateLinkInput) =>
      this.transport.request<LinkSummary>(
        `/v1/operators/${operatorId}/links/${linkId}`,
        { body: input, method: "PATCH" },
      ),
    updateCapability: (
      operatorId: string,
      linkId: string,
      capabilityId: string,
      input: UpdateLinkCapabilityInput,
    ) =>
      this.transport.request<LinkCapability>(
        `/v1/operators/${operatorId}/links/${linkId}/capabilities/${capabilityId}`,
        { body: input, method: "PATCH" },
      ),
  };

  // ── OAuth clients ────────────────────────────────────────────────────

  readonly oauthClients = {
    list: (operatorId: string) =>
      this.transport.request<OAuthClientSummary[]>(
        `/v1/operators/${operatorId}/oauth-clients`,
      ),
    create: (operatorId: string, input: CreateOAuthClientInput) =>
      this.transport.request<OAuthClientSummary>(
        `/v1/operators/${operatorId}/oauth-clients`,
        { body: input, method: "POST" },
      ),
    revoke: (operatorId: string, clientId: string) =>
      this.transport.request<OAuthClientSummary>(
        `/v1/operators/${operatorId}/oauth-clients/${clientId}`,
        { method: "DELETE" },
      ),
  };

  // ── Grants ───────────────────────────────────────────────────────────

  readonly grants = {
    listForOperator: (operatorId: string, query?: ListGrantsQuery) =>
      this.transport.request<GrantSummary[]>(`/v1/operators/${operatorId}/grants`, {
        query: query as unknown as Record<string, string | undefined>,
      }),
    create: (operatorId: string, input: CreateOperatorGrantInput) =>
      this.transport.request<GrantSummary>(`/v1/operators/${operatorId}/grants`, {
        body: input,
        method: "POST",
      }),
    update: (operatorId: string, grantId: string, input: UpdateOperatorGrantInput) =>
      this.transport.request<GrantSummary>(
        `/v1/operators/${operatorId}/grants/${grantId}`,
        { body: input, method: "PATCH" },
      ),
    revoke: (operatorId: string, grantId: string) =>
      this.transport.request<GrantSummary>(
        `/v1/operators/${operatorId}/grants/${grantId}`,
        { method: "DELETE" },
      ),
    listReceived: (query?: ListGrantsQuery) =>
      this.transport.request<GrantSummary[]>("/v1/grants/received", {
        query: query as unknown as Record<string, string | undefined>,
      }),
    get: (grantId: string) =>
      this.transport.request<GrantSummary>(`/v1/grants/${grantId}`),
  };

  // ── Audit logs ───────────────────────────────────────────────────────

  readonly auditLogs = {
    list: (query?: AuditLogQuery) =>
      this.transport.request<AuditLogPage>("/v1/audit-logs", {
        query: query as unknown as Record<string, string | number | undefined>,
        unwrapData: false,
      }),
  };

  // ── Invite tokens ────────────────────────────────────────────────────

  readonly inviteTokens = {
    list: (operatorId: string) =>
      this.transport.request<InviteTokenSummary[]>(
        `/v1/operators/${operatorId}/invite-tokens`,
      ),
    create: (operatorId: string, input: CreateInviteTokenInput) =>
      this.transport.request<InviteTokenSummary>(
        `/v1/operators/${operatorId}/invite-tokens`,
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
        `/v1/operators/${operatorId}/invite-tokens/${inviteId}`,
        { method: "DELETE" },
      ),
    lookup: (token: string) =>
      this.transport.request<PublicInviteInfo>(`/v1/invites/${token}`),
    redeem: (token: string) =>
      this.transport.request<GrantSummary>(`/v1/invites/${token}/redeem`, {
        method: "POST",
      }),
  };

  // ── Webhook subscriptions ────────────────────────────────────────────

  readonly webhookSubscriptions = {
    list: (operatorId: string) =>
      this.transport.request<WebhookSubscriptionSummary[]>(
        `/v1/operators/${operatorId}/webhook-subscriptions`,
      ),
    create: (operatorId: string, input: CreateWebhookSubscriptionInput) =>
      this.transport.request<WebhookSubscriptionSummary>(
        `/v1/operators/${operatorId}/webhook-subscriptions`,
        { body: input, method: "POST" },
      ),
    update: (
      operatorId: string,
      subscriptionId: string,
      input: UpdateWebhookSubscriptionInput,
    ) =>
      this.transport.request<WebhookSubscriptionSummary>(
        `/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}`,
        { body: input, method: "PATCH" },
      ),
    delete: (operatorId: string, subscriptionId: string) =>
      this.transport.request<WebhookSubscriptionSummary>(
        `/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}`,
        { method: "DELETE" },
      ),
    listDeliveries: (
      operatorId: string,
      subscriptionId: string,
      query?: ListWebhookDeliveriesQuery,
    ) =>
      this.transport.request<WebhookDeliverySummary[]>(
        `/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}/deliveries`,
        { query: query as unknown as Record<string, string | number | undefined> },
      ),
    sendTestEvent: (operatorId: string, subscriptionId: string) =>
      this.transport.request<WebhookSubscriptionTestReceipt>(
        `/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}/test`,
        { method: "POST" },
      ),
    replayDelivery: (operatorId: string, subscriptionId: string, deliveryId: string) =>
      this.transport.request<WebhookDeliveryReplayReceipt>(
        `/v1/operators/${operatorId}/webhook-subscriptions/${subscriptionId}/deliveries/${deliveryId}/replay`,
        { method: "POST" },
      ),
  };

  // ── Custom connection requests ───────────────────────────────────────

  readonly customConnectionRequests = {
    list: (organizationId: string) =>
      this.transport.request<CustomConnectionRequestSummary[]>(
        `/v1/organizations/${organizationId}/custom-connection-requests`,
      ),
    create: (organizationId: string, input: CreateCustomConnectionRequestInput) =>
      this.transport.request<CustomConnectionRequestSummary>(
        `/v1/organizations/${organizationId}/custom-connection-requests`,
        { body: input, method: "POST" },
      ),
  };

  // ── Gateway data plane (per connection) ──────────────────────────────

  readonly gateway = {
    listProducts: (connectionId: string) =>
      this.transport.request<JsonObject[]>(
        `/v1/connections/${connectionId}/products`,
        { method: "POST", unwrapData: false },
      ),
    getProduct: (connectionId: string, productId: string) =>
      this.transport.request<JsonObject>(
        `/v1/connections/${connectionId}/products/${productId}`,
        { method: "POST", unwrapData: false },
      ),
    getAvailability: (connectionId: string, input: AvailabilityQueryInput) =>
      this.transport.request<JsonObject[]>(
        `/v1/connections/${connectionId}/availability`,
        { body: input, method: "POST", unwrapData: false },
      ),
    getAvailabilityCalendar: (
      connectionId: string,
      input: AvailabilityCalendarQueryInput,
    ) =>
      this.transport.request<JsonObject[]>(
        `/v1/connections/${connectionId}/availability/calendar`,
        { body: input, method: "POST", unwrapData: false },
      ),
    listSuppliers: (connectionId: string) =>
      this.transport.request<JsonObject[]>(
        `/v1/connections/${connectionId}/suppliers`,
        { method: "POST", unwrapData: false },
      ),
    listBookings: (connectionId: string, query?: ListBookingsQuery) =>
      this.transport.request<JsonObject[]>(
        `/v1/connections/${connectionId}/bookings`,
        {
          query: query as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),
    createBooking: (
      connectionId: string,
      input: CreateBookingInput,
      options?: { idempotencyKey?: string },
    ) =>
      this.transport.request<JsonObject>(
        `/v1/connections/${connectionId}/bookings`,
        {
          body: input,
          headers: withIdempotency(options?.idempotencyKey),
          method: "POST",
          unwrapData: false,
        },
      ),
    getBooking: (connectionId: string, bookingId: string) =>
      this.transport.request<JsonObject>(
        `/v1/connections/${connectionId}/bookings/${bookingId}`,
        { unwrapData: false },
      ),
    confirmBooking: (
      connectionId: string,
      bookingId: string,
      input: ConfirmBookingInput,
    ) =>
      this.transport.request<JsonObject>(
        `/v1/connections/${connectionId}/bookings/${bookingId}/confirm`,
        { body: input, method: "POST", unwrapData: false },
      ),
    cancelBooking: (
      connectionId: string,
      bookingId: string,
      input?: CancelBookingInput,
    ) =>
      this.transport.request<JsonObject>(
        `/v1/connections/${connectionId}/bookings/${bookingId}`,
        {
          body: input ?? {},
          method: "DELETE",
          unwrapData: false,
        },
      ),
    listBookingActivities: (
      connectionId: string,
      bookingId: string,
      query?: ListBookingActivitiesQuery,
    ) =>
      this.transport.request<JsonObject[]>(
        `/v1/connections/${connectionId}/bookings/${bookingId}/activities`,
        {
          query: {
            from: query?.from instanceof Date ? query.from.toISOString() : query?.from,
            to: query?.to instanceof Date ? query.to.toISOString() : query?.to,
            type: query?.type,
            limit: query?.limit,
          } as unknown as Record<string, string | string[] | number | undefined>,
          unwrapData: false,
        },
      ),
  };

  // ── Connect-normalized reads ─────────────────────────────────────────

  readonly connect = {
    getHealth: (connectionId: string) =>
      this.transport.request<ConnectChannelHealth>(
        `/v1/connect/connections/${connectionId}/health`,
        { unwrapData: false },
      ),
    listSuppliers: (connectionId: string) =>
      this.transport.request<JsonObject[]>(
        `/v1/connect/connections/${connectionId}/suppliers`,
        { unwrapData: false },
      ),
    listProducts: (connectionId: string, options?: { supplierId?: string }) =>
      this.transport.request<JsonObject[]>(
        `/v1/connect/connections/${connectionId}/products`,
        {
          query: options?.supplierId ? { supplierId: options.supplierId } : undefined,
          unwrapData: false,
        },
      ),
    getProduct: (connectionId: string, productId: string) =>
      this.transport.request<JsonObject>(
        `/v1/connect/connections/${connectionId}/products/${productId}`,
        { unwrapData: false },
      ),
    listProductOptions: (connectionId: string, productId: string) =>
      this.transport.request<ConnectOptionSummary[]>(
        `/v1/connect/connections/${connectionId}/products/${productId}/options`,
        { unwrapData: false },
      ),
    listOptionUnits: (connectionId: string, optionId: string) =>
      this.transport.request<ConnectUnitSummary[]>(
        `/v1/connect/connections/${connectionId}/options/${optionId}/units`,
        { unwrapData: false },
      ),
    listProductExtras: (connectionId: string, productId: string) =>
      this.transport.request<ConnectProductExtraSummary[]>(
        `/v1/connect/connections/${connectionId}/products/${productId}/extras`,
        { unwrapData: false },
      ),
    listOptionExtraConfigs: (connectionId: string, optionId: string) =>
      this.transport.request<ConnectOptionExtraConfigSummary[]>(
        `/v1/connect/connections/${connectionId}/options/${optionId}/extra-configs`,
        { unwrapData: false },
      ),
    listAvailability: (connectionId: string, query: ConnectAvailabilityQuery) =>
      this.transport.request<JsonObject[]>(
        `/v1/connect/connections/${connectionId}/availability`,
        {
          query: query as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),
    listBookings: (connectionId: string, query?: ConnectListBookingsQuery) =>
      this.transport.request<JsonObject[]>(
        `/v1/connect/connections/${connectionId}/bookings`,
        {
          query: query as unknown as Record<string, string | undefined>,
          unwrapData: false,
        },
      ),
    getBooking: (connectionId: string, bookingId: string) =>
      this.transport.request<JsonObject>(
        `/v1/connect/connections/${connectionId}/bookings/${bookingId}`,
        { unwrapData: false },
      ),
    createBooking: (connectionId: string, input: CreateBookingInput) =>
      this.transport.request<JsonObject>(
        `/v1/connect/connections/${connectionId}/bookings`,
        { body: input, method: "POST", unwrapData: false },
      ),
    confirmBooking: (
      connectionId: string,
      bookingId: string,
      input?: ConfirmBookingInput,
    ) =>
      this.transport.request<JsonObject>(
        `/v1/connect/connections/${connectionId}/bookings/${bookingId}/confirm`,
        { body: input ?? {}, method: "POST", unwrapData: false },
      ),
    cancelBooking: (
      connectionId: string,
      bookingId: string,
      input?: CancelBookingInput,
    ) =>
      this.transport.request<JsonObject>(
        `/v1/connect/connections/${connectionId}/bookings/${bookingId}`,
        { body: input ?? {}, method: "DELETE", unwrapData: false },
      ),
  };

  // ── Flights ──────────────────────────────────────────────────────────

  readonly flights = {
    search: (input: FlightMultiSearchInput) =>
      this.transport.request<FlightSearchResult>("/v1/flights/search", {
        body: input,
        method: "POST",
      }),
    /**
     * Server-Sent Events variant of multi-connection search. Returns the raw
     * `Response` so callers can stream events with their preferred parser.
     */
    searchStream: (input: FlightMultiSearchInput, options?: { signal?: AbortSignal }) =>
      this.transport.fetchRaw("/v1/flights/search-stream", {
        body: input,
        headers: { accept: "text/event-stream" },
        method: "POST",
        signal: options?.signal,
      }),
    searchOnConnection: (connectionId: string, input: FlightSearchInput) =>
      this.transport.request<FlightSearchResult>(
        `/v1/connections/${connectionId}/flights/search`,
        { body: input, method: "POST" },
      ),
    price: (connectionId: string, input: FlightPriceInput) =>
      this.transport.request<JsonObject>(
        `/v1/connections/${connectionId}/flights/price`,
        { body: input, method: "POST" },
      ),
    book: (connectionId: string, input: FlightBookInput) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders`,
        { body: input, method: "POST" },
      ),
    getOrder: (connectionId: string, orderId: string) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}`,
      ),
    cancelOrder: (connectionId: string, orderId: string) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}`,
        { method: "DELETE" },
      ),
    ticketOrder: (connectionId: string, orderId: string) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/ticket`,
        { method: "POST" },
      ),
    getSeatMap: (connectionId: string, orderId: string, segmentId: string) =>
      this.transport.request<FlightSeatMap>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/seats/${segmentId}`,
      ),
    selectSeats: (
      connectionId: string,
      orderId: string,
      input: FlightSeatSelectionInput,
    ) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/seats`,
        { body: input, method: "POST" },
      ),
    getAncillaries: (connectionId: string, orderId: string) =>
      this.transport.request<FlightAncillaryList>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/ancillaries`,
      ),
    addAncillary: (connectionId: string, orderId: string, input: FlightAncillaryInput) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/ancillaries`,
        { body: input, method: "POST" },
      ),
    checkIn: (connectionId: string, orderId: string, input: FlightCheckInInput) =>
      this.transport.request<JsonObject>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/checkin`,
        { body: input, method: "POST" },
      ),
    exchange: (connectionId: string, orderId: string, input: FlightExchangeInput) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/exchange`,
        { body: input, method: "POST" },
      ),
    refund: (connectionId: string, orderId: string, input: FlightRefundInput) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/refund`,
        { body: input, method: "POST" },
      ),
    voidOrder: (connectionId: string, orderId: string) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/void`,
        { method: "POST" },
      ),
    addServiceRequest: (
      connectionId: string,
      orderId: string,
      input: FlightSsrInput,
    ) =>
      this.transport.request<FlightOrder>(
        `/v1/connections/${connectionId}/flights/orders/${orderId}/ssr`,
        { body: input, method: "POST" },
      ),
  };
}

export function createVoyantConnectClient(options: VoyantConnectClientOptions) {
  return new VoyantConnectClient(options);
}
