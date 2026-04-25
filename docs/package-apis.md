# Package APIs

This document is a compact map of the current SDK surface.

## `@voyantjs/connect-sdk`

Root client:

- `createVoyantConnectClient(options)`
- `new VoyantConnectClient(options)`

Root groups:

- `client.oauth.issueToken(input)`
- `client.operators.{ list, get, create, update, deactivate, getUsage,
  listProducts, getProduct, listSuppliers, listSearchDocuments,
  listSearchProjectionChanges }`
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
- `client.gateway.{ listProducts, getProduct, getAvailability,
  getAvailabilityCalendar, listSuppliers, listBookings, createBooking,
  getBooking, confirmBooking, cancelBooking, listBookingActivities }`
- `client.connect.{ getHealth, listSuppliers, listProducts, getProduct,
  listProductOptions, listOptionUnits, listProductExtras,
  listOptionExtraConfigs, listAvailability, listBookings, getBooking,
  createBooking, confirmBooking, cancelBooking }`
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
- `AvailabilityQueryInput`, `AvailabilityCalendarQueryInput`,
  `CreateBookingInput`, `ConfirmBookingInput`, `CancelBookingInput`,
  `ListBookingsQuery`, `ListBookingActivitiesQuery`
- `ConnectChannelHealth`, `ConnectOptionSummary`, `ConnectUnitSummary`,
  `ConnectProductExtraSummary`, `ConnectOptionExtraConfigSummary`
- `FlightMultiSearchInput`, `FlightSearchInput`, `FlightSearchResult`,
  `FlightBookInput`, `FlightOrder`, `FlightSeatMap`, `FlightAncillaryInput`,
  `FlightCheckInInput`, `FlightExchangeInput`, `FlightRefundInput`,
  `FlightSsrInput`
- `UsageQuery`, `UsageSummary`
