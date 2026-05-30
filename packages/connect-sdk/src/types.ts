import type { JsonObject, VoyantTransportOptions } from "@voyant-sdk/sdk-core";

export interface VoyantConnectClientOptions extends VoyantTransportOptions {
  /**
   * Default operator for org-scoped data-plane calls (`products.list`,
   * `suppliers.list`, `bookings.listAll`, `bookings.get` by org-scope, etc.).
   * Methods accept a per-call override; calls without either resolved
   * operator throw a `VoyantApiError` at request time.
   */
  operatorId?: string;
}

// ─── Common ────────────────────────────────────────────────────────────────

/**
 * Per-call operator override for org-scoped data-plane methods. When omitted,
 * the client falls back to `VoyantConnectClientOptions.operatorId`.
 */
export interface OperatorScope {
  operatorId?: string;
}

/**
 * Filter accepted by every cross-connection (org-wide) read.
 * Both fields accept a single value or an array; the SDK serializes arrays
 * as repeated query-string parameters (e.g. `?connectionId=a&connectionId=b`).
 */
export interface ConnectionScopeFilter {
  connectionId?: string | string[];
  providerKey?: string | string[];
}

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
  connection?: {
    id?: string;
    credentials?: JsonObject;
    [key: string]: unknown;
  };
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

export interface OperatorBookingSummary {
  id: string;
  connectionId: string;
  providerKey: string | null;
  supplierName: string;
  externalBookingId: string;
  productExternalId: string;
  optionExternalId: string;
  status: string;
  sourceType: string;
  supplierConfirmationStatus: string | null;
  confirmedAt: IsoDateTime | null;
  cancelledAt: IsoDateTime | null;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
  [key: string]: unknown;
}

export interface ListOperatorBookingsQuery {
  localDateStart?: string;
  localDateEnd?: string;
  status?: string | string[];
  limit?: number;
}

export interface ListAccommodationsQuery {
  category?: AccommodationCategory | AccommodationCategory[];
  countryCode?: string | string[];
  city?: string | string[];
  minStars?: number;
  /** Filter by price_from <= this amount in minor units. Currency-agnostic. */
  maxPriceFromAmountMinor?: number;
  locale?: string;
  limit?: number;
}

export interface OperatorAccommodationSummary {
  id: string;
  connectionId: string;
  externalId: string;
  category: AccommodationCategory;
  name: string;
  slug: string | null;
  countryCode: string;
  region: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  stars: number | null;
  locale: string;
  amenities: string[];
  priceFromAmountMinor: number | null;
  priceFromCurrency: string | null;
  priceFromRefreshedAt: IsoDateTime | null;
  providerKey: string | null;
  supplierName: string;
  lastSyncedAt: IsoDateTime;
  updatedAt: IsoDateTime;
  payload: JsonObject;
  [key: string]: unknown;
}

export interface OperatorAccommodationDetail {
  accommodation: JsonObject;
  providerKey: string | null;
  supplierName: string;
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
  documentExternalId?: string;
  productExternalId?: string | null;
  optionExternalId?: string | null;
  supplierExternalId?: string | null;
  accommodationExternalId?: string | null;
  category?: string;
  title?: string;
  summary?: string | null;
  searchableText?: string;
  destinations?: string[] | null;
  countryCodes?: string[] | null;
  tags?: string[] | null;
  imageUrl?: string | null;
  priceFrom?: JsonObject | null;
  availabilityStatus?: string | null;
  marketContext?: JsonObject | null;
  source?: JsonObject;
  freshness?: JsonObject | null;
  sourceUpdatedAt?: IsoDateTime;
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

// ─── Connect data plane (per connection) ─────────────────────────────────

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
  unitItems: Array<{
    unitId: string;
    quantity?: number;
    [key: string]: unknown;
  }>;
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

// ─── Accommodations (hospitality data plane) ──────────────────────────────

export interface ConnectMoney {
  amountMinor: number;
  currency: string;
  currencyPrecision: number;
}

export type AccommodationCategory =
  | "hotel"
  | "apartment"
  | "villa"
  | "hostel"
  | "guesthouse"
  | "resort"
  | "bnb"
  | "other";

export type BoardCode = "RO" | "BB" | "HB" | "FB" | "AI";

export type RatePlanGuaranteeMode = "none" | "card_hold" | "deposit" | "prepay";

export type RatePlanPricingMode = "static" | "dynamic";

export type OccupancyPricingMode =
  | "per_room"
  | "per_person"
  | "per_room_with_per_extra_person";

export type StayBookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "completed";

export type StayHoldStatus = "active" | "expired" | "consumed" | "released";

export type GuestType = "adult" | "child" | "infant";

export type BedType =
  | "single"
  | "double"
  | "queen"
  | "king"
  | "twin"
  | "sofa"
  | "bunk";

export type CancellationPenalty =
  | { type: "percentage"; value: number }
  | { type: "first_night" }
  | { type: "fixed"; amount: ConnectMoney }
  | { type: "full" };

export interface CancellationDeadline {
  fromHoursBeforeCheckIn: number;
  toHoursBeforeCheckIn: number;
  penalty: CancellationPenalty;
}

export interface CancellationPolicy {
  freeCancellationUntil?: IsoDateTime | null;
  deadlines: CancellationDeadline[];
}

export interface AccommodationLocation {
  countryCode: string;
  region?: string | null;
  city?: string | null;
  address?: {
    line1: string;
    line2?: string | null;
    postalCode?: string | null;
  } | null;
  latitude?: number | null;
  longitude?: number | null;
  destinationCodes?: string[];
}

export interface AccommodationImage {
  url: string;
  caption?: string;
  tags?: string[];
  sortOrder?: number;
}

export interface AccommodationPolicies {
  checkInFrom?: string;
  checkInTo?: string;
  checkOutFrom?: string;
  checkOutTo?: string;
  childrenWelcome?: boolean;
  petsWelcome?: boolean;
  smokingAllowed?: boolean;
  extraBeds?: {
    max?: number;
    ageRange?: { min: number; max: number };
  };
}

export interface Accommodation {
  id: string;
  connectionId: string;
  externalId: string;
  category: AccommodationCategory;
  name: string;
  slug?: string;
  description?: string;
  shortDescription?: string;
  rating?: { stars?: number; source?: string };
  location: AccommodationLocation;
  contact?: { phone?: string; email?: string; website?: string };
  amenities: string[];
  policies: AccommodationPolicies;
  images: AccommodationImage[];
  taxesIncludedInPrice?: boolean;
  locale: string;
  meta: JsonObject;
}

export interface RoomTypeOccupancy {
  maxAdults: number;
  maxChildren: number;
  maxInfants: number;
  maxTotal: number;
  standardOccupancy: number;
}

export interface RoomTypeBed {
  type: BedType;
  count: number;
}

export interface RoomType {
  id: string;
  connectionId: string;
  accommodationId: string;
  externalId: string;
  name: string;
  description?: string;
  occupancy: RoomTypeOccupancy;
  beds: RoomTypeBed[];
  area?: { value: number; unit: "sqm" | "sqft" };
  view?: string;
  amenities: string[];
  images: AccommodationImage[];
  locale: string;
  meta: JsonObject;
}

export interface RatePlanRestrictions {
  minStay?: number;
  maxStay?: number;
  advancePurchaseDays?: number;
  closedToArrivalWeekdays?: number[];
  closedToDepartureWeekdays?: number[];
}

export interface RatePlan {
  id: string;
  connectionId: string;
  accommodationId: string;
  roomTypeId: string;
  externalId: string;
  code: string;
  name: string;
  description?: string;
  board: BoardCode;
  refundable: boolean;
  cancellationPolicy: CancellationPolicy;
  guaranteeMode: RatePlanGuaranteeMode;
  currency: string;
  occupancyPricingMode: OccupancyPricingMode;
  pricingMode: RatePlanPricingMode;
  restrictions?: RatePlanRestrictions;
  locale: string;
  meta: JsonObject;
}

export interface StaySearchRoom {
  adults: number;
  children?: number;
  childrenAges?: number[];
  infants?: number;
}

export interface StaySearchQuery {
  destination?: { countryCode?: string; region?: string; city?: string };
  near?: { latitude: number; longitude: number; radiusKm: number };
  accommodationIds?: string[];
  checkIn: string;
  checkOut: string;
  rooms: StaySearchRoom[];
  category?: AccommodationCategory[];
  minStars?: number;
  amenities?: string[];
  boards?: BoardCode[];
  refundableOnly?: boolean;
  maxPrice?: ConnectMoney;
  locale?: string;
  limit?: number;
  cursor?: string;
}

export interface StayOfferRoom {
  roomTypeId: string;
  ratePlanId: string;
  occupancy: StaySearchRoom;
  nights: number;
  nightlyBreakdown: Array<{ date: string; amount: ConnectMoney }>;
  subtotal: ConnectMoney;
  taxes: ConnectMoney;
  fees: ConnectMoney;
  total: ConnectMoney;
  cancellationPolicy: CancellationPolicy;
}

export interface StayOfferTotals {
  subtotal: ConnectMoney;
  taxes: ConnectMoney;
  fees: ConnectMoney;
  total: ConnectMoney;
}

export interface StayOffer {
  id: string;
  connectionId: string;
  accommodationId: string;
  rooms: StayOfferRoom[];
  totals: StayOfferTotals;
  expiresAt: IsoDateTime;
}

export interface StayHold {
  id: string;
  offerSnapshot: StayOffer;
  status: StayHoldStatus;
  expiresAt: IsoDateTime;
}

export interface Guest {
  type: GuestType;
  firstName: string;
  lastName: string;
  age?: number;
  dateOfBirth?: string;
  title?: string;
  email?: string;
  phone?: string;
  passport?: { number: string; country: string; expiresAt: string };
}

export interface StayBookingContact {
  email: string;
  phone?: string;
}

export interface StayBookingRoom {
  roomTypeId: string;
  ratePlanId: string;
  checkIn: string;
  checkOut: string;
  occupancy: StaySearchRoom;
  guests: Guest[];
  totals: StayOfferRoom;
}

export interface PaymentReference {
  provider: string;
  reference: string;
  capturedAt?: IsoDateTime;
  meta?: JsonObject;
}

export interface StayBooking {
  id: string;
  connectionId: string;
  accommodationId: string;
  status: StayBookingStatus;
  reference: string;
  externalReference?: string;
  voucher?: { url?: string; codes?: string[] };
  rooms: StayBookingRoom[];
  leadGuest: Guest;
  contact: StayBookingContact;
  totals: StayOfferTotals;
  cancellationPolicy: CancellationPolicy;
  cancellation?: {
    cancelledAt: IsoDateTime;
    reason?: string;
    refundAmount?: ConnectMoney;
  };
  payment?: PaymentReference;
  notes?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface StayConfirmInput {
  holdId: string;
  leadGuest: Guest;
  contact: StayBookingContact;
  guestsByRoom: Guest[][];
  paymentReference?: PaymentReference;
  notes?: string;
}

export interface ConnectionDiagnostic {
  connectionId: string;
  status: "ok" | "timeout" | "error" | "unauthorized";
  message?: string;
  durationMs?: number;
}

export interface StaySearchResponse {
  offers: StayOffer[];
  connectionDiagnostics?: ConnectionDiagnostic[];
  nextCursor?: string | null;
}

// ─── Cruises (cruise data plane) ──────────────────────────────────────────

export type CruiseType =
  | "ocean"
  | "river"
  | "expedition"
  | "coastal"
  | "yacht"
  | "sailing";

export type CabinRoomType =
  | "inside"
  | "oceanview"
  | "balcony"
  | "suite"
  | "penthouse"
  | "single"
  | "studio";

export type CruiseSailingStatus =
  | "open"
  | "on_request"
  | "wait_list"
  | "sold_out"
  | "closed";

export type CruisePriceAvailability =
  | "available"
  | "limited"
  | "on_request"
  | "wait_list"
  | "sold_out";

export type CruiseInclusionKind =
  | "meals"
  | "drinks"
  | "gratuities"
  | "transfers"
  | "excursions"
  | "wifi"
  | "flights"
  | "other";

export type CruiseEnrichmentKind =
  | "naturalist"
  | "historian"
  | "photographer"
  | "lecturer"
  | "domain_expert"
  | "other";

export type CruiseFareComponentKind =
  | "gratuity"
  | "ncf"
  | "port_charge"
  | "tax"
  | "airfare"
  | "transfer"
  | "insurance"
  | "single_supplement"
  | "other";

export type CruisePromotionDiscountType = "percentage" | "fixed_amount";

export type CruisePromotionDiscount =
  | {
      type: "percentage";
      percent: number;
    }
  | {
      type: "fixed_amount";
      amount: ConnectMoney;
    };

export interface CruisePromotionEligibility {
  onlyAvailableToPastGuests?: boolean;
  soloTravelerOffer?: boolean;
  featuredOffer?: boolean;
  hideFromPrice?: boolean;
  hideOfferOnWebsite?: boolean;
}

export interface CruisePromotion {
  id: string;
  connectionId: string;
  sailingId: string;
  externalId: string;
  externalVersionId?: string;
  fareCode?: string;
  name: string;
  title?: string;
  subtitle?: string;
  description?: string;
  shortDescription?: string;
  richDescription?: string;
  termsAndConditions?: string;
  discount?: CruisePromotionDiscount;
  savingsNote?: string;
  savingsUnit?: string;
  validFrom?: IsoDateTime;
  validUntil?: IsoDateTime;
  stackable?: boolean;
  eligibility?: CruisePromotionEligibility;
  conditions?: JsonObject;
  meta?: JsonObject;
}

export type CruiseBookingMode = "inquiry" | "reserve";

export type CruiseBookingStatus =
  | "inquiry"
  | "pending"
  | "confirmed"
  | "cancelled"
  | "no_show"
  | "completed";

export type CruiseQuoteStatus = "active" | "expired" | "consumed" | "released";

export type CruisePassengerType = "adult" | "child" | "infant";

export interface PortRef {
  code?: string;
  name: string;
  countryCode?: string;
}

export interface CruiseImage {
  url: string;
  caption?: string;
  isCover?: boolean;
  sortOrder?: number;
}

export interface CruiseMedia {
  url: string;
  mediaType: "image" | "video";
  isCover?: boolean;
  caption?: string;
}

export interface CruiseInclusion {
  kind: CruiseInclusionKind;
  label: string;
}

export interface CruiseEnrichment {
  kind: CruiseEnrichmentKind;
  name: string;
  description?: string;
}

export type CruiseCancellationPenalty =
  | { type: "percentage"; value: number }
  | { type: "fixed"; amount: ConnectMoney }
  | { type: "full" };

export interface CruiseCancellationDeadline {
  fromDaysBeforeDeparture: number;
  toDaysBeforeDeparture: number;
  penalty: CruiseCancellationPenalty;
}

export interface CruiseCancellationPolicy {
  deadlines: CruiseCancellationDeadline[];
  notes?: string;
}

export interface CruiseLine {
  id: string;
  connectionId: string;
  externalId: string;
  name: string;
  slug?: string;
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  fleetSize?: number;
  locale: string;
  meta: JsonObject;
}

export interface Ship {
  id: string;
  connectionId: string;
  externalId: string;
  cruiseLineId: string;
  name: string;
  shipType: CruiseType;
  capacityGuests?: number;
  cabinCount?: number;
  deckCount?: number;
  yearBuilt?: number;
  yearRefurbished?: number;
  amenities: string[];
  images: CruiseImage[];
  locale: string;
  meta: JsonObject;
}

export interface Cruise {
  id: string;
  connectionId: string;
  externalId: string;
  cruiseLineId: string;
  shipId: string;
  name: string;
  slug?: string;
  cruiseType: CruiseType;
  nights: number;
  highlights?: string[];
  description?: string;
  destinations?: string[];
  embarkationPort?: PortRef;
  disembarkationPort?: PortRef;
  inclusions: CruiseInclusion[];
  enrichmentPrograms?: CruiseEnrichment[];
  media: CruiseMedia[];
  locale: string;
  meta: JsonObject;
}

export interface CabinCategoryOccupancy {
  adults: number;
  children?: number;
  total: number;
}

export interface CabinCategory {
  id: string;
  connectionId: string;
  externalId: string;
  shipId: string;
  code: string;
  name: string;
  roomType: CabinRoomType;
  maxOccupancy: CabinCategoryOccupancy;
  area?: { value: number; unit: "sqm" | "sqft" };
  features: string[];
  images: CruiseImage[];
  locale: string;
  meta: JsonObject;
}

export interface ItineraryDay {
  dayNumber: number;
  date: string;
  title?: string;
  port?: PortRef;
  isSeaDay: boolean;
  isOvernight: boolean;
  arriveAt?: IsoDateTime;
  departAt?: IsoDateTime;
  description?: string;
  meals?: Array<"breakfast" | "lunch" | "dinner">;
}

export interface Sailing {
  id: string;
  connectionId: string;
  externalId: string;
  cruiseId: string;
  shipId: string;
  departureDate: string;
  returnDate: string;
  nights: number;
  embarkationPort: PortRef;
  disembarkationPort: PortRef;
  itinerary: ItineraryDay[];
  salesStatus: CruiseSailingStatus;
  bookableUntil?: IsoDateTime;
  meta: JsonObject;
}

export interface CruisePassengerOccupancy {
  adults: number;
  children?: number;
  childrenAges?: number[];
  infants?: number;
}

export interface CruiseFareComponent {
  kind: CruiseFareComponentKind;
  amount: ConnectMoney;
  label?: string;
}

export interface CabinPricing {
  connectionId: string;
  sailingId: string;
  cabinCategoryId: string;
  occupancy: CruisePassengerOccupancy;
  fareCode?: string;
  pricePerPerson: ConnectMoney;
  totalPrice: ConnectMoney;
  originalPricePerPerson?: ConnectMoney;
  originalTotalPrice?: ConnectMoney;
  components: CruiseFareComponent[];
  promotionExternalIds?: string[];
  availability: CruisePriceAvailability;
  availableUnits?: number | null;
  bookableUntil?: IsoDateTime;
  cancellationPolicy: CruiseCancellationPolicy;
  refreshedAt: IsoDateTime;
}

export interface CruiseSearchQuery {
  destination?: { region?: string; portCodes?: string[] };
  departureDate?: { from?: string; to?: string };
  durationNights?: { min?: number; max?: number };
  cruiseType?: CruiseType[];
  cruiseLineIds?: string[];
  shipIds?: string[];
  occupancy: CruisePassengerOccupancy;
  cabinCategories?: CabinRoomType[];
  maxPricePerPerson?: ConnectMoney;
  locale?: string;
  limit?: number;
  cursor?: string;
}

export interface CruiseOfferPricing {
  pricePerPerson: ConnectMoney;
  totalPrice: ConnectMoney;
  originalPricePerPerson?: ConnectMoney;
  originalTotalPrice?: ConnectMoney;
  components: CruiseFareComponent[];
  promotionExternalIds?: string[];
}

export interface CruiseOffer {
  id: string;
  connectionId: string;
  sailingId: string;
  cruiseId: string;
  shipId: string;
  cabinCategoryId: string;
  fareCode?: string;
  occupancy: CruisePassengerOccupancy;
  pricing: CruiseOfferPricing;
  availableUnits?: number | null;
  promotions?: CruisePromotion[];
  cancellationPolicy: CruiseCancellationPolicy;
  expiresAt: IsoDateTime;
  bookableUntil?: IsoDateTime;
}

export interface CruiseLockSelectionInput {
  sailingExternalId: string;
  cabinCategoryExternalId: string;
  fareCode?: string;
  occupancy: CruisePassengerOccupancy;
  ttlHours?: number;
}

export interface CruiseQuote {
  id: string;
  offerSnapshot: CruiseOffer;
  status: CruiseQuoteStatus;
  expiresAt: IsoDateTime;
}

export interface CruisePassport {
  number: string;
  country: string;
  expiresAt: string;
}

export interface CruisePassenger {
  type: CruisePassengerType;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  nationality?: string;
  passport?: CruisePassport;
  email?: string;
  phone?: string;
  preferences?: {
    dining?: string;
    bedding?: string;
    dietary?: string[];
  };
}

export interface CruiseContact {
  email: string;
  phone?: string;
  address?: {
    line1: string;
    line2?: string;
    city?: string;
    region?: string;
    postalCode?: string;
    countryCode?: string;
  };
}

export interface CruisePaymentReference {
  provider: string;
  reference: string;
  capturedAt?: IsoDateTime;
  meta?: JsonObject;
}

export interface CruiseBookingDocument {
  kind: "voucher" | "ticket" | "invoice" | "manifest";
  url: string;
  label?: string;
}

export interface CruiseBooking {
  id: string;
  connectionId: string;
  sailingId: string;
  cabinCategoryId: string;
  mode: CruiseBookingMode;
  status: CruiseBookingStatus;
  reference: string;
  externalReference?: string;
  occupancy: CruisePassengerOccupancy;
  passengers: CruisePassenger[];
  leadPassenger: CruisePassenger;
  contact: CruiseContact;
  totals?: CruiseOfferPricing;
  cancellationPolicy?: CruiseCancellationPolicy;
  cancellation?: {
    cancelledAt: IsoDateTime;
    reason?: string;
    refundAmount?: ConnectMoney;
  };
  payment?: CruisePaymentReference;
  documents?: CruiseBookingDocument[];
  notes?: string;
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
}

export interface CruiseInquireInput {
  sailingId: string;
  cabinCategoryId: string;
  occupancy: CruisePassengerOccupancy;
  leadPassenger: CruisePassenger;
  contact: CruiseContact;
  passengers?: CruisePassenger[];
  notes?: string;
}

export interface CruiseConfirmInput {
  quoteId: string;
  leadPassenger: CruisePassenger;
  contact: CruiseContact;
  passengers: CruisePassenger[];
  paymentReference?: CruisePaymentReference;
  notes?: string;
}

export interface CruiseConnectionDiagnostic {
  connectionId: string;
  status: "ok" | "timeout" | "error" | "unauthorized";
  message?: string;
  durationMs?: number;
}

export interface CruiseSearchResponse {
  offers: CruiseOffer[];
  connectionDiagnostics?: CruiseConnectionDiagnostic[];
  nextCursor?: string | null;
}

// Cruises read API — per-operator list/get response shapes

export interface ListCruisesQuery {
  cruiseType?: CruiseType | CruiseType[];
  cruiseLineExternalId?: string | string[];
  shipExternalId?: string | string[];
  minNights?: number;
  maxNights?: number;
  locale?: string;
  limit?: number;
}

export interface OperatorCruiseSummary {
  id: string;
  connectionId: string;
  externalId: string;
  cruiseLineExternalId: string;
  shipExternalId: string;
  name: string;
  slug: string | null;
  status: string | null;
  cruiseType: string;
  nights: number;
  destinations: string[] | null;
  embarkationPortCode: string | null;
  disembarkationPortCode: string | null;
  locale: string;
  market: string | null;
  currency: string | null;
  priceFromAmountMinor: number | null;
  priceFromCurrency: string | null;
  sourceKind: string | null;
  sourceProvider: string | null;
  sourceConnectionId: string | null;
  sourceRef: string | null;
  sourceFreshness: string | null;
  lastSourcedAt: IsoDateTime | null;
  projection: JsonObject | null;
  projectionSchemaVersion: string | null;
  projectionEtag: string | null;
  projectionSeenAt: IsoDateTime | null;
  payload: JsonObject;
  lastSyncedAt: IsoDateTime;
  updatedAt: IsoDateTime;
  providerKey: string | null;
  supplierName: string;
  [key: string]: unknown;
}

export type ConnectCruiseRow = OperatorCruiseSummary;

export interface OperatorCruiseDetail {
  cruise: ConnectCruiseRow;
  providerKey: string | null;
  supplierName: string;
}

export interface ListSailingsQuery {
  cruiseExternalId?: string | string[];
  shipExternalId?: string | string[];
  salesStatus?: string | string[];
  departureFrom?: string;
  departureTo?: string;
  limit?: number;
}

export interface ListSailingPricingQuery {
  cabinCategoryExternalId?: string;
  fareCode?: string;
  occupancySignature?: string;
  limit?: number;
}

export interface ListSailingPromotionsQuery {
  fareCode?: string;
  limit?: number;
}

export interface OperatorSailingSummary {
  sailing: JsonObject;
  providerKey: string | null;
  supplierName: string;
}

export interface OperatorSailingDetail {
  sailing: JsonObject;
  providerKey: string | null;
  supplierName: string;
}

export interface ListItineraryDay {
  connectionId: string;
  sailingExternalId: string;
  dayNumber: number;
  date: string;
  title: string | null;
  portCode: string | null;
  portName: string | null;
  countryCode: string | null;
  isSeaDay: boolean;
  isOvernight: boolean;
  arriveAt: IsoDateTime | null;
  departAt: IsoDateTime | null;
  payload: JsonObject;
  [key: string]: unknown;
}
