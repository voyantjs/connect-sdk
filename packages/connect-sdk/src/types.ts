import type { JsonObject, VoyantTransportOptions } from "@voyant-sdk/sdk-core";

export type VoyantConnectClientOptions = VoyantTransportOptions;

// ─── Common ────────────────────────────────────────────────────────────────

export type IsoDateTime = string;

export interface ListEnvelope<T> {
  data: T[];
}

export interface PageEnvelope<T> {
  data: T[];
  pagination: {
    nextCursor: string | null;
  };
}

export interface ConnectError {
  code: string;
  message: string;
  status: number;
  details?: unknown;
}

// ─── OAuth ─────────────────────────────────────────────────────────────────

export interface IssueTokenInput {
  clientId: string;
  clientSecret: string;
  grantType?: "client_credentials";
  scope?: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  scope: string;
}

// ─── Operators ─────────────────────────────────────────────────────────────

export type OperatorStatus = "active" | "deactivated";

export interface OperatorSummary {
  id: string;
  organizationId: string | null;
  voyantPlatformId: string | null;
  voyantOrganizationId: string | null;
  slug: string;
  name: string;
  contactEmail: string | null;
  contactName: string | null;
  status: OperatorStatus;
  metadata: JsonObject | null;
  accessType?: "owned" | "granted";
  grantId?: string;
  grantScopes?: string[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateOperatorInput {
  slug: string;
  name: string;
  contactEmail?: string;
  contactName?: string;
  voyantPlatformId?: string;
  voyantOrganizationId?: string;
  metadata?: JsonObject;
}

export interface UpdateOperatorInput {
  name?: string;
  contactEmail?: string;
  contactName?: string;
  metadata?: JsonObject;
}

// ─── Connections ───────────────────────────────────────────────────────────

export type ConnectionStatus = "pending" | "active" | "paused" | "errored";

export interface ConnectionSummary {
  id: string;
  operatorId: string;
  supplierName: string;
  providerKey: string | null;
  providerRegistrationId: string | null;
  status: ConnectionStatus;
  market: string | null;
  webhookSigningSecretLast4: string | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  metadata: JsonObject | null;
}

export interface CreateConnectionInput {
  supplierName: string;
  providerKey?: string;
  market?: string;
  credentials?: JsonObject;
  metadata?: JsonObject;
  [key: string]: unknown;
}

export interface UpdateConnectionInput {
  supplierName?: string;
  status?: ConnectionStatus;
  market?: string;
  credentials?: JsonObject;
  metadata?: JsonObject;
  [key: string]: unknown;
}

export interface RotatedWebhookSecret {
  connectionId: string;
  webhookSigningSecret: string;
}

export interface ListWebhookEventsQuery {
  event?: string;
  status?: "pending" | "delivered" | "failed" | "retrying";
  limit?: number;
}

export interface ListHealthEventsQuery {
  status?: "healthy" | "degraded" | "down";
  limit?: number;
}

export interface ListRequestLogsQuery {
  method?: string;
  responseStatus?: number;
  from?: IsoDateTime | Date;
  to?: IsoDateTime | Date;
  limit?: number;
}

export interface ListProjectionSyncsQuery {
  limit?: number;
}

export interface ProjectionSyncRunReceipt {
  runId: string;
  isCached: boolean;
}

// ─── Connector providers ──────────────────────────────────────────────────

export interface ConnectorProviderSummary {
  key: string;
  name: string;
  description: string | null;
  applicationFormSchema: JsonObject | null;
  capabilities: string[];
  [key: string]: unknown;
}

export interface ConnectorProviderApplicationSummary {
  id: string;
  organizationId: string;
  providerKey: string;
  status: string;
  payload: JsonObject | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  [key: string]: unknown;
}

export interface UpdateConnectorProviderInput {
  applicationFormSchema?: JsonObject;
  [key: string]: unknown;
}

export interface OperatorProviderRegistration {
  id: string;
  operatorId: string;
  provider: { key: string; name: string };
  status: string;
  scope: JsonObject | null;
  allowedMarkets: string[] | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  [key: string]: unknown;
}

export interface UpsertProviderRegistrationInput {
  providerKey: string;
  scope?: JsonObject;
  allowedMarkets?: string[];
  credentials?: JsonObject;
  [key: string]: unknown;
}

export interface UpdateTuiProviderSettingsInput {
  allowedMarkets?: string[];
  defaultOffersSearchBody?: JsonObject;
}

// ─── Links ────────────────────────────────────────────────────────────────

export type LinkDirection = "inbound" | "outbound" | "bidirectional";
export type LinkMode = "manual" | "automatic";
export type LinkStatus = "active" | "paused" | "revoked";

export interface LinkSummary {
  id: string;
  ownerOperatorId: string;
  partnerOrganizationId: string | null;
  direction: LinkDirection;
  mode: LinkMode;
  status: LinkStatus;
  capabilities: LinkCapability[];
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  [key: string]: unknown;
}

export interface LinkCapability {
  id: string;
  linkId: string;
  capability: string;
  enabled: boolean;
  config: JsonObject | null;
}

export interface CreateLinkInput {
  partnerOrganizationId?: string;
  direction: LinkDirection;
  mode?: LinkMode;
  connection?: { id?: string; credentials?: JsonObject; [key: string]: unknown };
  [key: string]: unknown;
}

export interface UpdateLinkInput {
  status?: LinkStatus;
  [key: string]: unknown;
}

export interface UpdateLinkCapabilityInput {
  enabled?: boolean;
  config?: JsonObject;
}

export interface ListLinksQuery {
  status?: LinkStatus;
  mode?: LinkMode;
  direction?: LinkDirection;
}

// ─── OAuth clients ────────────────────────────────────────────────────────

export interface OAuthClientSummary {
  id: string;
  operatorId: string;
  clientId: string;
  clientSecret?: string;
  scopes: string[];
  name: string | null;
  grantId: string | null;
  active: boolean;
  expiresAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export interface CreateOAuthClientInput {
  name?: string;
  scopes: string[];
  grantId?: string;
  expiresAt?: IsoDateTime;
}

// ─── Grants ───────────────────────────────────────────────────────────────

export type GrantStatus = "active" | "paused" | "revoked";

export interface GrantSummary {
  id: string;
  operatorId: string;
  grantorOrganizationId: string;
  granteeOrganizationId: string | null;
  status: GrantStatus;
  scopes: string[];
  expiresAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CreateOperatorGrantInput {
  granteeOrganizationId?: string;
  scopes: string[];
  expiresAt?: IsoDateTime;
  [key: string]: unknown;
}

export interface UpdateOperatorGrantInput {
  status?: GrantStatus;
  scopes?: string[];
  expiresAt?: IsoDateTime;
}

export interface ListGrantsQuery {
  status?: GrantStatus;
}

// ─── Audit logs ───────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string;
  organizationId: string;
  operatorId: string | null;
  callerType: "api_key" | "oauth_m2m" | "internal" | "user";
  callerId: string | null;
  method: string;
  path: string;
  statusCode: number;
  metadata: JsonObject | null;
  createdAt: IsoDateTime;
}

export interface AuditLogQuery {
  from?: IsoDateTime;
  to?: IsoDateTime;
  callerType?: AuditLogEntry["callerType"];
  operatorId?: string;
  limit?: number;
  cursor?: string;
}

export interface AuditLogPage {
  data: AuditLogEntry[];
  pagination: { nextCursor: string | null };
}

// ─── Usage ────────────────────────────────────────────────────────────────

export interface UsageQuery {
  from?: IsoDateTime;
  to?: IsoDateTime;
  connectionId?: string;
  grantId?: string;
}

export interface UsageSummary {
  operatorId: string;
  totalRequests: number;
  totalErrors: number;
  byEndpoint: Array<{ endpoint: string; method: string; count: number }>;
  [key: string]: unknown;
}

// ─── Operator data (catalog) ──────────────────────────────────────────────

export interface OperatorProductSummary {
  id: string;
  operatorId: string;
  connectionId: string;
  externalProductId: string;
  title: string;
  supplierName: string | null;
  market: string | null;
  active: boolean;
  [key: string]: unknown;
}

export interface OperatorProductDetail extends OperatorProductSummary {
  options?: Array<JsonObject>;
  units?: Array<JsonObject>;
  extras?: Array<JsonObject>;
}

export interface OperatorSupplierSummary {
  id: string;
  operatorId: string;
  connectionId: string;
  externalSupplierId: string;
  name: string;
  [key: string]: unknown;
}

export interface SearchDocumentQuery {
  connectionId?: string;
  updatedSince?: IsoDateTime;
  limit?: number;
  market?: string;
}

export interface SearchDocument {
  id: string;
  operatorId: string;
  connectionId: string;
  market: string | null;
  payload: JsonObject;
  updatedAt: IsoDateTime;
  [key: string]: unknown;
}

export interface SearchProjectionChangeQuery {
  after?: string;
  connectionId?: string;
  limit?: number;
  market?: string;
}

export interface SearchProjectionChange {
  id: string;
  operatorId: string;
  connectionId: string;
  market: string | null;
  changeType: string;
  payload: JsonObject;
  createdAt: IsoDateTime;
}

export interface SearchProjectionChangePage {
  data: SearchProjectionChange[];
  nextCursor: string | null;
}

// ─── Invite tokens ────────────────────────────────────────────────────────

export interface InviteTokenSummary {
  id: string;
  operatorId: string;
  token: string;
  label: string | null;
  scopes: string[];
  grantId: string | null;
  expiresAt: IsoDateTime | null;
  redeemedAt: IsoDateTime | null;
  createdAt: IsoDateTime;
}

export interface CreateInviteTokenInput {
  label?: string;
  scopes: string[];
  grantId?: string;
  expiresAt?: IsoDateTime | Date;
}

export interface PublicInviteInfo {
  operatorName: string;
  scopes: string[];
  label: string | null;
  expiresAt: IsoDateTime | null;
}

// ─── Webhook subscriptions ────────────────────────────────────────────────

export interface WebhookSubscriptionSummary {
  id: string;
  operatorId: string;
  connectionId: string | null;
  url: string;
  events: string[];
  status: "active" | "paused";
  hasSecret: boolean;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  [key: string]: unknown;
}

export interface CreateWebhookSubscriptionInput {
  url: string;
  events: string[];
  connectionId?: string;
  secret?: string;
  [key: string]: unknown;
}

export interface UpdateWebhookSubscriptionInput {
  url?: string;
  events?: string[];
  status?: "active" | "paused";
  secret?: string;
  [key: string]: unknown;
}

export interface WebhookDeliverySummary {
  id: string;
  subscriptionId: string;
  eventType: string;
  status: "delivered" | "failed";
  responseStatus: number | null;
  attempts: number;
  createdAt: IsoDateTime;
  deliveredAt: IsoDateTime | null;
  [key: string]: unknown;
}

export interface ListWebhookDeliveriesQuery {
  limit?: number;
  status?: "delivered" | "failed";
}

export interface WebhookSubscriptionTestReceipt {
  eventId: string;
  eventType: string;
  subscriptionId: string;
  connectionId: string;
  queuedAt: IsoDateTime;
}

export interface WebhookDeliveryReplayReceipt {
  deliveryId: string;
  replayEventId: string;
  subscriptionId: string;
  eventType: string;
  queuedAt: IsoDateTime;
}

// ─── Custom connection requests ───────────────────────────────────────────

export type CustomConnectionRequestCategory =
  | "hotels"
  | "airlines"
  | "operators"
  | "dmcs"
  | "tours"
  | "other";

export interface CustomConnectionRequestSummary {
  id: string;
  organizationId: string;
  requesterUserId: string | null;
  supplierName: string;
  website: string | null;
  category: CustomConnectionRequestCategory;
  estimatedVolume: string | null;
  description: string;
  hasCredentials: boolean;
  status: string;
  createdAt: IsoDateTime;
}

export interface CreateCustomConnectionRequestInput {
  supplierName: string;
  category: CustomConnectionRequestCategory;
  description: string;
  website?: string;
  estimatedVolume?: string;
  hasCredentials?: boolean;
}

// ─── Gateway data plane (per connection) ─────────────────────────────────

export interface AvailabilityQueryInput {
  productId: string;
  optionId?: string;
  localDateStart?: string;
  localDateEnd?: string;
  units?: Array<{ id: string; quantity: number }>;
  [key: string]: unknown;
}

export interface AvailabilityCalendarQueryInput {
  productId: string;
  optionId?: string;
  localDateStart?: string;
  localDateEnd?: string;
  [key: string]: unknown;
}

export interface CreateBookingInput {
  productId: string;
  optionId?: string;
  unitItems: Array<{ unitId: string; quantity?: number; [key: string]: unknown }>;
  contact?: JsonObject;
  resellerReference?: string;
  notes?: string;
  [key: string]: unknown;
}

export interface ConfirmBookingInput {
  contact?: JsonObject;
  paymentMethod?: string;
  [key: string]: unknown;
}

export interface CancelBookingInput {
  reason?: string | null;
}

export interface ListBookingsQuery {
  resellerReference?: string;
  supplierReference?: string;
  localDateStart?: string;
  localDateEnd?: string;
}

export interface ListBookingActivitiesQuery {
  from?: IsoDateTime | Date;
  to?: IsoDateTime | Date;
  type?: string | string[];
  limit?: number;
}

// ─── Connect-normalized reads ─────────────────────────────────────────────

export interface ConnectChannelHealth {
  connectionId: string;
  status: "healthy" | "degraded" | "down" | "unknown";
  lastSyncAt: IsoDateTime | null;
  staleSeconds: number | null;
  [key: string]: unknown;
}

export interface ConnectOptionSummary {
  id: string;
  productId: string;
  title: string;
  summary?: string;
  isDefault: boolean;
  cancellationPolicySummary?: string;
  durationMinutesFrom?: number;
  durationMinutesTo?: number;
  bookable: boolean;
  meta: JsonObject;
}

export interface ConnectUnitSummary {
  id: string;
  optionId: string;
  title: string;
  unitType: string;
  summary?: string;
  minQuantity?: number;
  maxQuantity?: number;
  pricingFrom?: JsonObject;
  meta: JsonObject;
}

export interface ConnectProductExtraSummary {
  id: string;
  productId: string;
  code?: string;
  name: string;
  description?: string;
  selectionType: string;
  pricingMode: string;
  pricedPerPerson: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  defaultQuantity?: number;
  active: boolean;
  sortOrder: number;
  externalReferences?: JsonObject;
}

export interface ConnectOptionExtraConfigSummary {
  id: string;
  optionId: string;
  productExtraId: string;
  selectionType?: string;
  pricingMode?: string;
  pricedPerPerson?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  defaultQuantity?: number;
  isDefault: boolean;
  active: boolean;
  sortOrder: number;
  notes?: string;
  externalReferences?: JsonObject;
}

export interface ConnectAvailabilityQuery {
  productId: string;
  optionId?: string;
  localDateStart?: string;
  localDateEnd?: string;
}

export interface ConnectListBookingsQuery {
  localDateStart?: string;
  localDateEnd?: string;
}

// ─── Flights ──────────────────────────────────────────────────────────────

export interface FlightMultiSearchInput {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: Array<{ type: "adult" | "child" | "infant"; count?: number }>;
  cabin?: "economy" | "premium_economy" | "business" | "first";
  connectionIds?: string[];
  [key: string]: unknown;
}

export interface FlightSearchInput extends FlightMultiSearchInput {
  [key: string]: unknown;
}

export interface FlightPriceInput {
  offerId: string;
  [key: string]: unknown;
}

export interface FlightBookInput {
  offerId: string;
  passengers: Array<JsonObject>;
  contact?: JsonObject;
  [key: string]: unknown;
}

export interface FlightSeatSelectionInput {
  segmentId: string;
  selections: Array<{ passengerId: string; seatId: string }>;
  [key: string]: unknown;
}

export interface FlightAncillaryInput {
  ancillaryId: string;
  passengerIds?: string[];
  segmentId?: string;
  [key: string]: unknown;
}

export interface FlightCheckInInput {
  passengerIds: string[];
  [key: string]: unknown;
}

export interface FlightExchangeInput {
  newOfferId: string;
  [key: string]: unknown;
}

export interface FlightRefundInput {
  reason?: string;
  [key: string]: unknown;
}

export interface FlightSsrInput {
  code: string;
  passengerIds?: string[];
  segmentId?: string;
  [key: string]: unknown;
}

// Generic — these come from the connector adapter and vary by provider.
export type FlightSearchResult = JsonObject;
export type FlightOrder = JsonObject;
export type FlightSeatMap = JsonObject;
export type FlightAncillaryList = JsonObject;
