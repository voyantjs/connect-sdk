# Package APIs

This document is a compact map of the current SDK surface.

## `@voyantjs/connect-sdk`

Root client:

- `createVoyantConnectClient(options)`
- `new VoyantConnectClient(options)`

Root groups:

- `client.oauth.issueToken(input)`
- `client.operators.{ list, get, create, update, deactivate, getUsage,
listSearchDocuments, listSearchProjectionChanges }`
- `client.connectorProviders.{ list, update, listApplications,
listRegistrations, getRegistration, upsertRegistration, updateRegistration,
updateTuiSettings, revalidateRegistration }`
- `client.connections.{ list, get, create, update, delete, rotateWebhookSecret,
listProjectionSyncs, triggerProjectionSync, listWebhookEvents,
listHealthEvents, listRequestLogs }`
- `client.links.{ list, get, create, update, updateCapability }`
- `client.oauthClients.{ list, create, revoke }`
- `client.grants.{ listForOperator, create, update, revoke, listReceived, get }`
- `client.auditLogs.list(query)`
- `client.inviteTokens.{ list, create, revoke, lookup, redeem }`
- `client.webhookSubscriptions.{ list, create, update, delete, listDeliveries,
sendTestEvent, replayDelivery }`
- `client.customConnectionRequests.{ list, create }`
- `client.products.{ list, get, listOnConnection, getOnConnection,
listOptions, listExtras }`
- `client.options.{ listUnits, listExtraConfigs }`
- `client.suppliers.{ list, listOnConnection }`
- `client.availability.{ list, calendar }`
- `client.bookings.{ listAll, list, get, create, confirm, cancel,
listActivities }`
- `client.health.get`
- `client.cruises.{ listSailingPricing, listSailingPromotions }`
- `client.flights.{ search, searchStream, searchOnConnection, price, book,
getOrder, cancelOrder, ticketOrder, getSeatMap, selectSeats, getAncillaries,
addAncillary, checkIn, exchange, refund, voidOrder, addServiceRequest }`

Selected public types:

- `OperatorSummary`, `CreateOperatorInput`, `UpdateOperatorInput`
- `ConnectionSummary`, `CreateConnectionInput`, `UpdateConnectionInput`,
  `RotatedWebhookSecret`
- `ConnectorProviderSummary`, `OperatorProviderRegistration`,
  `UpsertProviderRegistrationInput`, `UpdateTuiProviderSettingsInput`
- `LinkSummary`, `LinkCapability`, `CreateLinkInput`, `UpdateLinkInput`,
  `UpdateLinkCapabilityInput`
- `OAuthClientSummary`, `CreateOAuthClientInput`, `IssueTokenInput`,
  `OAuthTokenResponse`
- `GrantSummary`, `CreateOperatorGrantInput`, `UpdateOperatorGrantInput`
- `AuditLogEntry`, `AuditLogQuery`, `AuditLogPage`
- `InviteTokenSummary`, `CreateInviteTokenInput`, `PublicInviteInfo`
- `WebhookSubscriptionSummary`, `CreateWebhookSubscriptionInput`,
  `UpdateWebhookSubscriptionInput`, `WebhookDeliverySummary`,
  `WebhookSubscriptionTestReceipt`, `WebhookDeliveryReplayReceipt`
- `CustomConnectionRequestSummary`, `CreateCustomConnectionRequestInput`,
  `CustomConnectionRequestCategory`
- `AvailabilityCalendarQueryInput`, `ConnectAvailabilityQuery`,
  `CreateBookingInput`, `ConfirmBookingInput`, `CancelBookingInput`,
  `ConnectListBookingsQuery`, `ListBookingActivitiesQuery`,
  `ListOperatorBookingsQuery`
- `ConnectionScopeFilter`, `OperatorScope`
- `OperatorProductSummary`, `OperatorProductDetail`,
  `OperatorSupplierSummary`, `OperatorBookingSummary`
- `ConnectCruiseRow`, `OperatorCruiseSummary`, `CruisePromotion`,
  `CruisePromotionDiscount`, `CruisePromotionEligibility`
- `ConnectChannelHealth`, `ConnectOptionSummary`, `ConnectUnitSummary`,
  `ConnectProductExtraSummary`, `ConnectOptionExtraConfigSummary`
- `FlightMultiSearchInput`, `FlightSearchInput`, `FlightSearchResult`,
  `FlightBookInput`, `FlightOrder`, `FlightSeatMap`, `FlightAncillaryInput`,
  `FlightCheckInInput`, `FlightExchangeInput`, `FlightRefundInput`,
  `FlightSsrInput`
- `UsageQuery`, `UsageSummary`

## `@voyantjs/connect-provider-sdk`

Provider-author primitives:

- `defineConnectProvider(descriptor)`
- `assertProviderKey(key)`
- `parseJsonCredentials(raw)`
- `ConnectProviderSdkError`

Selected public types:

- `ConnectProviderDescriptor`
- `ConnectConnectionContext`
- `ConnectProviderCategory`
- `ConnectProviderDirection`
- `ConnectProviderAuthModel`
- `ConnectProviderAccessModel`
- `ConnectProviderCredentialValidationResult`

## `@voyantjs/connect-adapter`

Voyant-side catalog adapter factory:

- `createVoyantConnectSourceAdapter(options)`
- `mapSearchDocumentToProjection(document, defaults)`
- `resolveVoyantConnectAdapterContext(input)`

`createVoyantConnectSourceAdapter` returns an OSS-compatible `SourceAdapter`
typed against `@voyantjs/catalog/adapter/contract`. Discovery reads Connect
search documents and emits `CatalogProjection` values with `source_kind`,
`source_provider`, `source_connection_id`, `source_ref`, and
`source_freshness` populated. Live resolution uses Connect's live routes for
availability, stays, and cruises when requested by `parameters.connectRoute`.

Selected public types:

- `SourceAdapter`
- `SourceAdapterContext`
- `AdapterCapabilities`
- `CatalogProjection`
- `LiveResolveRequest`
- `LiveResolveResult`
- `GetContentRequest`
- `GetContentResult`
- `ReserveRequest`
- `ReserveResult`
- `CancelRequest`
- `CancelResult`
- `VoyantConnectSourceAdapterOptions`

## `@voyantjs/connect-cruises`

Voyant-side cruises adapter factory:

- `createConnectCruiseAdapter(options)`
- `ConnectCruisesNotImplementedError`
- `passengerCountFromConnectOccupancy(occupancy)`
- `connectFareComponentAmount(component)`

`createConnectCruiseAdapter` accepts a `quoteTtlHours` option for reserve-mode
booking commits. When Voyant calls `createBooking` without an existing
`cabinCategoryRef.quoteId`, the adapter asks Connect to lock the selected
sailing/cabin/fare/occupancy, then confirms the resulting quote.

Selected public types:

- `ConnectCruiseAdapter`
- `ConnectCruiseAdapterOptions`
- `ConnectCruiseSourceRef`
- `ConnectExternalCruise`
- `ConnectExternalSailing`
- `ConnectExternalShip`
- `ConnectExternalPriceRow`
- `ConnectExternalBookingInput`
- `ConnectExternalBookingResult`
