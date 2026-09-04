# Society Management System — Engineering Specification
## Codex / Antigravity Implementation Bible

> This document is the engineering source of truth after the Google Stitch design phase.
> Build a real production system, not a visual demo.

## 1. Non-Negotiable Rules

1. Use TypeScript everywhere.
2. Use strict TypeScript.
3. Keep the backend as a modular monolith initially.
4. Controllers handle HTTP concerns; services contain business logic.
5. Validate every external input.
6. Enforce authorization server-side; never trust UI role checks.
7. Every society-scoped request must enforce tenant isolation.
8. Use database transactions for multi-record business operations.
9. Never use floating point for money.
10. Never hard-delete financial records or audit logs.
11. Payment success must be verified server-side through the payment provider/webhook.
12. Important mutations must be auditable.
13. Do not replace real functionality with hardcoded data once the relevant API exists.
14. Do not leave apparently functional buttons without implementation.
15. Do not introduce microservices until actual scale requires extraction.

---

# 2. Product Scope

Build a multi-tenant Society / Apartment Management SaaS supporting:

- Platform Super Admin
- Society Admin
- Committee Member
- Accountant
- Security Guard
- Society Staff
- Vendor
- Owner
- Tenant
- Family Member / Resident

Core modules:

- Authentication
- Users and memberships
- Multi-tenancy
- Society configuration
- Buildings / towers / floors / units
- Residents and family
- Vehicles and parking
- Visitors
- Gates and security
- Deliveries
- Domestic help
- Maintenance billing
- Payments and receipts
- Accounting
- Complaints / helpdesk
- Facilities and bookings
- Staff and attendance
- Tasks
- Vendors
- Notices
- Events
- Polls / surveys
- Community
- Documents
- Assets
- Emergency / SOS
- Notifications
- Reports
- Audit logs
- Search
- Support
- Platform subscriptions
- Feature flags
- AI assistant
- Settings

---

# 3. Technology Stack

## Mobile

- React Native
- Expo
- TypeScript
- Expo Router
- TanStack Query
- Secure token storage

## Admin Web

- Next.js
- TypeScript
- TanStack Query

## Backend

- NestJS
- TypeScript
- REST API
- WebSockets where realtime is genuinely useful

## Data

- PostgreSQL
- Prisma
- Redis

## Storage

- S3-compatible object storage such as S3/R2

## External services

- Razorpay or equivalent payment provider
- Push notifications
- SMS
- Email
- WhatsApp where configured

## Infrastructure

- Docker
- CI/CD
- Managed PostgreSQL
- Managed Redis
- Object storage
- Sentry / structured logging / health checks

---

# 4. High-Level Architecture

```text
React Native / Expo
        |
        | HTTPS / WebSocket
        v
Next.js Admin -----> NestJS API
                         |
             +-----------+-----------+
             |           |           |
             v           v           v
        PostgreSQL     Redis      Object Storage
             |
      External providers
      Payments / Push / SMS / Email
```

Start as a modular monolith:

```text
apps/api/src/
  auth/
  users/
  societies/
  buildings/
  units/
  residents/
  vehicles/
  parking/
  visitors/
  deliveries/
  security/
  maintenance/
  billing/
  payments/
  accounting/
  complaints/
  facilities/
  bookings/
  staff/
  attendance/
  tasks/
  vendors/
  notices/
  events/
  polls/
  community/
  documents/
  assets/
  emergencies/
  notifications/
  reports/
  search/
  audit/
  support/
  subscriptions/
  ai/
  settings/
  common/
```

---

# 5. Repository Structure

```text
society-management/
├── apps/
│   ├── mobile/
│   ├── admin-web/
│   ├── super-admin-web/
│   └── api/
├── packages/
│   ├── types/
│   ├── validation/
│   ├── api-client/
│   ├── ui/
│   └── config/
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed/
├── docs/
├── scripts/
├── .github/workflows/
├── docker-compose.yml
├── package.json
└── pnpm-workspace.yaml
```

Use pnpm workspaces.

---

# 6. Multi-Tenancy

The Society is the primary tenant.

Hierarchy:

```text
Platform
  -> Society
      -> Building / Tower
          -> Floor
              -> Unit / Flat
```

Users can belong to multiple societies:

```text
User
  -> Membership -> Society A -> ADMIN
  -> Membership -> Society B -> COMMITTEE
  -> Membership -> Society C -> ACCOUNTANT
```

Every authenticated request must establish:

```text
userId
activeSocietyId
roles
permissions
```

Society-scoped records should contain `societyId` directly whenever practical.

A user must never access another society's data unless explicit membership and permission allow it.

---

# 7. Core Database Model

Use UUID public identifiers, UTC timestamps, appropriate indexes, and database constraints.

## Identity

### User

```text
id
phone
email
passwordHash nullable
name
avatarFileId nullable
status
lastLoginAt
createdAt
updatedAt
```

### SocietyMembership

```text
id
societyId
userId
role
status
joinedAt
invitedBy
```

### Permission

```text
id
code
description
```

### RolePermission

```text
role
permissionId
```

---

# 8. Society Structure

### Society

```text
id
name
legalName
registrationNumber
address
city
state
country
postalCode
timezone
currency
logoFileId
status
settings
createdAt
updatedAt
```

### Building

```text
id
societyId
name
code
```

### Floor

```text
id
buildingId
number
displayName
```

### Unit

```text
id
societyId
buildingId
floorId
number
type
area
occupancyStatus
```

---

# 9. Residents

### ResidentProfile

```text
id
userId
societyId
unitId
residentType
relationshipToUnit
moveInDate
moveOutDate
verificationStatus
```

Types:

- OWNER
- TENANT
- FAMILY
- OTHER

### FamilyMember

```text
id
residentId
name
relationship
phone
dateOfBirth
emergencyContact
status
```

Resident profile must aggregate authorized views of:

- Unit
- Family
- Vehicles
- Parking
- Payments
- Complaints
- Visitors
- Documents
- Activity

---

# 10. Vehicles and Parking

### Vehicle

```text
id
societyId
userId
unitId
registrationNumber
type
make
model
color
status
```

Normalize registration numbers before comparison.

### ParkingSlot

```text
id
societyId
buildingId
slotNumber
type
floor
status
```

### ParkingAssignment

```text
id
parkingSlotId
unitId
vehicleId
assignedFrom
assignedTo
status
```

Never overwrite parking history.

---

# 11. Visitor Management

### Visitor

```text
id
societyId
name
phone
photoFileId
vehicleNumber
```

### VisitorInvitation

```text
id
societyId
visitorId
hostUnitId
hostUserId
validFrom
validUntil
expectedAt
purpose
qrToken
status
```

### VisitorVisit

```text
id
invitationId
gateId
checkedInAt
checkedOutAt
verifiedBy
status
```

Statuses:

```text
EXPECTED
WAITING
APPROVED
REJECTED
ENTERED
EXITED
EXPIRED
```

QR codes are references, not authorization by themselves. The server must verify society, validity, status, intended unit and permissions.

---

# 12. Gates and Security

### Gate

```text
id
societyId
name
location
status
```

### GuardProfile

```text
id
userId
societyId
employeeId
assignedGateId
status
```

### SecurityLog

```text
id
societyId
gateId
type
actorUserId
referenceType
referenceId
metadata
createdAt
```

Guard operations must be optimized for speed:

- Visitor verification
- QR scan
- Phone/name/unit search
- Entry
- Exit
- Delivery
- Vehicle verification
- Emergency

---

# 13. Deliveries

### Delivery

```text
id
societyId
unitId
recipientUserId
type
courierName
trackingNumber
receivedAt
collectedAt
status
```

Statuses:

```text
EXPECTED
RECEIVED
NOTIFIED
COLLECTED
RETURNED
```

---

# 14. Domestic Help

### DomesticHelper

```text
id
societyId
name
phone
photoFileId
identityReference
status
```

### DomesticHelperAssignment

```text
id
helperId
unitId
residentId
validFrom
validUntil
status
```

Retain entry history.

---

# 15. Maintenance Billing

Separate billing configuration from generated invoices.

### ChargeType

```text
id
societyId
name
code
calculationType
defaultAmount
taxable
active
```

### BillingPeriod

```text
id
societyId
name
startDate
endDate
dueDate
status
```

### Invoice

```text
id
societyId
unitId
residentId
billingPeriodId
invoiceNumber
issueDate
dueDate
subtotal
tax
penalty
total
amountPaid
balance
status
```

### InvoiceLine

```text
id
invoiceId
chargeTypeId
description
quantity
unitPrice
amount
```

Statuses:

```text
DRAFT
ISSUED
PARTIALLY_PAID
PAID
OVERDUE
VOID
```

Invoice generation must be idempotent. A unit cannot receive duplicate invoices for the same billing period unless explicitly configured.

---

# 16. Payments

### Payment

```text
id
societyId
userId
unitId
invoiceId
provider
providerOrderId
providerPaymentId
providerSignature
amount
currency
status
paidAt
failureReason
```

### PaymentAllocation

```text
id
paymentId
invoiceId
amount
```

Workflow:

```text
Resident
 -> backend creates order
 -> payment provider
 -> verified webhook
 -> payment transaction
 -> invoice allocation
 -> receipt
 -> notification
 -> audit
```

Webhook handling must be:

- Signature verified
- Idempotent
- Transaction-safe

A provider payment must never be allocated twice.

Never mark payment successful from frontend callback alone.

---

# 17. Accounting

Core entities:

```text
LedgerAccount
JournalEntry
JournalLine
Expense
Income
VendorInvoice
Refund
BankAccount
Budget
Fund
```

Accounting is a real ledger, not unrelated CRUD tables.

Example:

```text
Expense
  -> JournalEntry
       -> Debit Expense Account
       -> Credit Bank / Payable Account
```

Posted accounting entries must not be silently rewritten.

---

# 18. Complaints / Helpdesk

### Complaint

```text
id
societyId
unitId
createdBy
categoryId
title
description
priority
status
assignedTo
dueAt
resolvedAt
closedAt
```

### ComplaintComment

```text
id
complaintId
authorId
body
```

### ComplaintAttachment

```text
id
complaintId
fileId
```

Statuses:

```text
SUBMITTED
ASSIGNED
IN_PROGRESS
WAITING
RESOLVED
CLOSED
REOPENED
```

Workflow:

```text
Create
 -> validate
 -> assign
 -> notify
 -> work
 -> update
 -> resolve
 -> resident notification
 -> accept/reopen
 -> feedback
```

---

# 19. Facilities and Bookings

### Facility

```text
id
societyId
name
description
capacity
price
bookingRequired
active
operatingHours
rules
```

### FacilitySlot

```text
id
facilityId
startTime
endTime
capacity
active
```

### Booking

```text
id
societyId
facilityId
slotId
unitId
bookedBy
startAt
endAt
amount
paymentStatus
status
```

Prevent overlapping exclusive bookings using transactional/concurrency-safe logic.

---

# 20. Staff and Attendance

### StaffProfile

```text
id
userId
societyId
employeeId
department
designation
joiningDate
status
```

### StaffShift

```text
id
societyId
staffId
startAt
endAt
gateId
```

### Attendance

```text
id
societyId
staffId
date
checkIn
checkOut
status
```

---

# 21. Tasks

### Task

```text
id
societyId
title
description
priority
assignedTo
createdBy
location
dueAt
status
```

Statuses:

```text
NEW
ASSIGNED
IN_PROGRESS
BLOCKED
COMPLETED
VERIFIED
```

---

# 22. Vendors

### Vendor

```text
id
societyId
name
serviceType
contact
email
address
status
```

### VendorContract

```text
id
vendorId
startDate
endDate
amount
renewalDate
status
```

Track contracts, documents, work history and payments.

---

# 23. Notices, Events and Polls

## Notice

Fields:

```text
id
societyId
title
body
type
priority
publishedAt
expiresAt
createdBy
status
```

Support targeting:

- Entire society
- Building
- Floor
- Unit
- Owners
- Tenants
- Committee
- Staff

## Event

Fields:

```text
id
societyId
title
description
location
startAt
endAt
capacity
createdBy
status
```

RSVP must support guest count.

## Poll

Fields:

```text
id
societyId
title
description
type
startsAt
endsAt
anonymous
resultsVisibility
createdBy
```

Poll options and responses are separate entities.

Voting rules must be enforced server-side.

---

# 24. Community

Entities:

```text
CommunityPost
CommunityComment
CommunityReport
```

Support:

- Posts
- Comments
- Likes
- Lost and found
- Recommendations
- Buy/sell
- Reporting
- Moderation

Admins can hide/remove/lock content.

---

# 25. Documents and Files

Use object storage for files.

### FileAsset

```text
id
societyId
storageKey
originalName
mimeType
size
checksum
uploadedBy
createdAt
```

### Document

```text
id
societyId
folderId
fileId
title
description
version
visibility
status
```

Use signed upload/download URLs.

Validate MIME type, size, permission and society scope.

Never expose storage credentials to clients.

---

# 26. Assets

Manage:

- Lifts
- Pumps
- Generators
- CCTV
- Fire equipment
- Electrical equipment
- Garden equipment
- Common-area equipment

### Asset

```text
id
societyId
name
category
serialNumber
location
purchaseDate
warrantyUntil
vendorId
status
```

Track inspections, repairs and maintenance history.

---

# 27. Emergency / SOS

### EmergencyIncident

```text
id
societyId
reportedBy
type
severity
location
description
status
acknowledgedAt
resolvedAt
```

Types:

```text
FIRE
MEDICAL
SECURITY
LIFT
WATER
POWER
GAS
OTHER
```

Flow:

```text
Report
 -> confirm
 -> notify authorized responders
 -> track incident
 -> acknowledge
 -> resolve
```

Emergency actions must be permission-controlled and rate-limited.

---

# 28. Notifications

### Notification

```text
id
userId
societyId
type
title
body
priority
referenceType
referenceId
readAt
createdAt
```

### NotificationPreference

```text
id
userId
type
pushEnabled
smsEnabled
emailEnabled
```

Use internal application events:

```text
VisitorApprovedEvent
 -> notification handler
      -> push
      -> SMS
      -> in-app
```

Bulk notification fan-out should use a queue.

---

# 29. Authentication

Primary flow:

```text
Phone
 -> OTP
 -> verification
 -> authenticated session
```

Implement:

- OTP expiry
- Attempt limits
- Resend cooldown
- Rate limiting
- Device/session tracking
- Logout
- Session revocation
- Refresh token rotation if used

Never expose whether arbitrary phone numbers are registered.

---

# 30. Authorization

Use:

**RBAC + permissions + resource ownership checks.**

Example resident permissions:

```text
CanReadOwnInvoices
CanPayOwnInvoice
CanCreateOwnComplaint
CanInviteVisitorForOwnUnit
CanManageOwnVehicles
CanBookFacilities
```

Guard permissions:

```text
CanVerifyVisitors
CanRecordEntry
CanRecordExit
CanManageDeliveries
```

Admin permissions:

```text
CanManageResidents
CanManageBilling
CanManageComplaints
CanPublishNotices
CanManageParking
CanManageStaff
CanViewFinancialReports
```

Never rely on frontend hiding alone.

---

# 31. API Standards

Base path:

```text
/api/v1
```

Example:

```text
GET    /societies/:societyId/residents
POST   /societies/:societyId/residents
GET    /societies/:societyId/residents/:id
PATCH  /societies/:societyId/residents/:id
```

Use consistent pagination and filtering.

Response:

```json
{
  "data": {},
  "meta": {}
}
```

Error:

```json
{
  "error": {
    "code": "VISITOR_NOT_FOUND",
    "message": "Visitor could not be found.",
    "requestId": "..."
  }
}
```

Do not expose stack traces.

Generate OpenAPI/Swagger documentation.

---

# 32. Validation

Validate all:

- UUIDs
- Phone numbers
- Email
- Dates
- Amounts
- Enums
- Pagination
- File metadata
- Vehicle numbers
- Search input
- User-controlled text

Normalize values where comparison depends on normalization.

---

# 33. Redis

Use Redis for:

- Rate limits
- Short-lived OTP state where appropriate
- Cache
- Queues
- Distributed locks where justified
- Temporary state

Redis is not the source of truth for permanent business data.

---

# 34. Realtime

Use WebSockets for:

- Visitor waiting
- Resident/guard approval updates
- Emergency status
- Relevant complaint updates
- Operational dashboards
- Realtime notifications

Authenticate sockets and verify society membership before channel subscription.

Conceptual channels:

```text
society:{societyId}
unit:{unitId}
user:{userId}
```

Never broadcast private data to a society-wide channel.

---

# 35. Search

Search across:

- Residents
- Units
- Vehicles
- Visitors
- Complaints
- Payments
- Documents
- Staff
- Vendors
- Notices

Start with PostgreSQL full-text/trigram search.

Do not add Elasticsearch/OpenSearch unless scale requires it.

---

# 36. Mobile Implementation

Use:

- Expo Router
- TanStack Query for server state
- Local state for transient UI
- Secure storage for credentials
- Skeleton loading
- Empty states
- Error states
- Pull-to-refresh
- Safe optimistic updates

Do not mirror the entire server state into a global store.

Security guard app must remain usable under poor connectivity, with safe retry/queue behavior where appropriate.

Offline behavior must never bypass authorization.

---

# 37. Admin Web

Use:

- Desktop-first responsive layouts
- Tables
- Search
- Filters
- Pagination
- Bulk actions
- Drawers/modals
- Exports
- Keyboard-friendly interactions
- Permission-aware controls

Dashboard data must come from real APIs.

---

# 38. File Upload Architecture

```text
Client
 -> backend requests upload authorization
 -> signed upload URL
 -> object storage
 -> backend records FileAsset
```

Do not accept unvalidated arbitrary files.

---

# 39. Security Requirements

Production must include:

- HTTPS
- Secure token/cookie handling
- Token rotation
- Rate limiting
- Brute-force protection
- Input validation
- Authorization
- Secure headers
- File validation
- Parameterized database access
- XSS-safe rendering
- Secrets outside source control
- Audit logs
- Dependency scanning
- Sensitive-log redaction

Never log OTPs, secrets, payment credentials or unnecessary personal data.

---

# 40. Data Privacy

A resident can see:

- Own unit
- Own payments
- Own complaints
- Own visitors
- Public notices
- Authorized community content

A resident must not automatically see:

- Other residents' payment data
- Private documents
- Other residents' phone numbers
- Internal administrative notes
- Security-sensitive information

Use permission-aware DTOs/serializers.

---

# 41. Business Invariants

These must never be violated.

### Society isolation

No unauthorized cross-society access.

### Invoice integrity

A paid invoice cannot become unpaid through ordinary mutation.

### Payment integrity

A provider payment cannot be allocated twice.

### Booking integrity

Two confirmed exclusive bookings cannot occupy the same slot.

### Visitor integrity

Expired/rejected invitations cannot be used for entry.

### Poll integrity

A user cannot vote more times than poll rules allow.

### Audit integrity

Audit logs are append-only.

### Accounting integrity

Posted financial entries cannot be silently rewritten.

---

# 42. Audit Logging

Audit important mutations:

- Roles and permissions
- Resident changes
- Billing changes
- Payment operations
- Financial mutations
- Visitor approvals where required
- Emergency actions
- Sensitive document access
- Settings changes
- Administrative deactivation/deletion

Audit entity:

```text
id
societyId
actorUserId
action
entityType
entityId
before
after
ipAddress
userAgent
createdAt
```

---

# 43. Observability

Implement:

- Structured logs
- Request IDs
- Error tracking
- Health checks
- Metrics
- Database monitoring

Endpoints:

```text
/health
/health/live
/health/ready
```

Do not expose infrastructure secrets.

---

# 44. Testing

## Unit tests

Must cover:

- Billing calculations
- Late fees
- Permissions
- Booking conflict logic
- Visitor validation
- Payment allocation
- Poll rules
- SLA calculations

## Integration tests

Cover:

- Auth
- Authorization
- Database operations
- Payment webhooks
- Visitor workflows
- Booking workflows

## E2E

At minimum:

1. Resident login
2. Resident pays invoice
3. Resident invites visitor
4. Guard verifies visitor
5. Resident approves visitor
6. Complaint creation
7. Admin assigns complaint
8. Facility booking
9. Admin publishes notice
10. Admin generates billing

---

# 45. Seed Data

Development seed should include:

- Platform admin
- 2–3 societies
- Multiple buildings
- Multiple floors
- 100+ units
- Owners
- Tenants
- Family members
- Vehicles
- Parking
- Guards
- Staff
- Vendors
- Facilities
- Invoices
- Payments
- Complaints
- Visitors
- Notices
- Events
- Polls
- Documents

Never use real personal information.

---

# 46. Reports

Support:

- Resident directory
- Occupancy
- Maintenance collection
- Outstanding dues
- Income
- Expenses
- Cash flow
- Complaint performance
- Visitor activity
- Facility usage
- Parking
- Staff attendance
- Vendor spending

Support CSV/Excel/PDF exports where appropriate.

Large reports should run asynchronously.

---

# 47. AI Assistant

AI must use controlled application tools, never unrestricted SQL.

```text
User
 -> AI
 -> tool selection
 -> permission check
 -> application service
 -> database
 -> sanitized result
 -> AI response
```

Example tools:

```text
getMyOutstandingInvoices
getMyBookings
getMyComplaints
getVisitorStatus
getSocietyCollectionSummary
getExpenseSummary
getComplaintMetrics
```

Admin tools must enforce admin permissions.

---

# 48. Super Admin

Platform-level features:

- Societies
- Plans
- Subscriptions
- Platform invoices
- Users
- Support tickets
- Analytics
- Feature flags
- Platform audit logs

Super Admin is not equivalent to Society Admin.

---

# 49. Feature Flags

Examples:

```text
COMMUNITY
AI_ASSISTANT
WHATSAPP
ADVANCED_ACCOUNTING
FACILITY_BOOKING
STAFF_ATTENDANCE
```

Feature flags must be enforced server-side for business behavior.

---

# 50. Internationalization

Prepare for:

- English
- Hindi
- Gujarati

Do not hardcode user-facing strings into business logic.

Dates, numbers and currency must respect locale.

---

# 51. Performance

Initial targets:

- Fast first render
- Pagination for large lists
- Lazy-load expensive screens
- Avoid duplicate requests
- Optimize images
- Avoid N+1 queries
- Add indexes based on measured query patterns
- Use queues for heavy jobs
- Cache only where useful

Measure before optimizing.

---

# 52. Deployment

Backend:

```text
Load Balancer
    -> NestJS containers
    -> PostgreSQL
    -> Redis
    -> Worker processes
    -> Object storage
```

Web:

```text
Next.js -> CDN / hosting
```

Mobile:

```text
Expo EAS -> Android / iOS
```

CI/CD pipeline:

```text
Install
 -> lint
 -> typecheck
 -> tests
 -> build
 -> migration verification
 -> deploy
```

Never run destructive database operations automatically in production.

---

# 53. Migration Rules

1. Every schema change requires a migration.
2. Test migrations before production.
3. Back up before risky migrations.
4. Avoid destructive migrations without compatibility planning.
5. Never silently modify production schema.

---

# 54. UX-to-Code Traceability

Every Stitch screen must map to:

```text
Screen
 -> user action
 -> component
 -> API endpoint
 -> authorization policy
 -> service
 -> database
 -> side effects
 -> notification/audit
```

Example:

```text
Resident -> Pay Maintenance
  -> Payment Screen
  -> POST /payments/orders
  -> CanPayOwnInvoice
  -> PaymentService.createOrder()
  -> Invoice + Payment
  -> provider
  -> verified webhook
  -> PaymentService.confirm()
  -> invoice allocation
  -> receipt
  -> notification
  -> audit
```

---

# 55. Implementation Order

## Phase 0 — Foundation

- Monorepo
- TypeScript
- Lint/formatting
- CI
- Environment config
- Docker
- PostgreSQL
- Prisma
- Redis
- API foundation
- Logging
- Error handling

## Phase 1 — Identity and Society

- Auth
- Users
- Memberships
- Roles
- Permissions
- Society
- Buildings
- Floors
- Units
- Residents

## Phase 2 — Resident Core

- Family
- Vehicles
- Parking
- Notifications
- Profile
- Documents

## Phase 3 — Security

- Gates
- Guards
- Visitors
- QR
- Deliveries
- Domestic help
- Security logs

## Phase 4 — Financial Core

- Charge types
- Billing periods
- Invoices
- Payments
- Receipts
- Outstanding dues

## Phase 5 — Operations

- Complaints
- Staff
- Tasks
- Vendors
- Assets

## Phase 6 — Facilities and Community

- Facilities
- Bookings
- Notices
- Events
- Polls
- Community

## Phase 7 — Accounting and Reports

- Ledger
- Expenses
- Income
- Budgets
- Funds
- Reports
- Exports

## Phase 8 — Emergency and Realtime

- SOS
- Emergency incidents
- WebSockets
- Realtime notifications

## Phase 9 — Platform

- Super Admin
- Subscriptions
- Feature flags
- Support

## Phase 10 — AI

- AI assistant
- Controlled tools
- Analytics queries
- Permission-aware responses

---

# 56. Definition of Done

A feature is complete only when:

- UI exists
- API exists
- Database model exists where required
- Migration exists
- Validation exists
- Authorization exists
- Loading state exists
- Empty state exists
- Error state exists
- Success state exists
- Audit exists where required
- Notifications exist where required
- Tests exist
- Real API integration exists
- Edge cases are handled
- Typecheck passes
- Lint passes
- Tests pass
- Tenant isolation is verified
- Documentation is updated

A screen alone is not a completed feature.

---

# 57. Agent Workflow

For every feature:

1. Read this specification.
2. Read the relevant Google Stitch design.
3. Inspect existing code before editing.
4. Identify affected modules.
5. Implement schema/migration.
6. Implement backend service.
7. Implement authorization.
8. Implement API.
9. Add tests.
10. Implement frontend.
11. Connect real API.
12. Implement loading/error/empty/success states.
13. Add notifications/audit if required.
14. Run typecheck.
15. Run lint.
16. Run tests.
17. Check tenant isolation.
18. Update documentation.

Do not rewrite unrelated working code.

Do not introduce dependencies without justification.

Do not remove a feature simply because it is inconvenient.

If a requirement is ambiguous, inspect the surrounding architecture and design first; if it remains genuinely impossible to determine, document the assumption in the implementation notes.

---

# 58. Final Product Standard

The final product must feel like a serious commercial SaaS product.

It must support:

```text
                 SOCIETY PLATFORM
                        |
        +---------------+---------------+
        |               |               |
     RESIDENT         SECURITY         ADMIN
        |               |               |
   Payments          Visitors       Operations
   Complaints        Gates          Residents
   Visitors          Deliveries     Billing
   Booking           Parking        Accounting
   Notices           Emergency      Staff
   Community                        Vendors
   Documents                        Reports
        |               |               |
        +---------------+---------------+
                        |
                  PLATFORM LAYER
                        |
             Multi-Society SaaS
                        |
             +----------+----------+
             |          |          |
          Analytics     AI    Subscriptions
```

The architecture must be capable of growing from one society to thousands without requiring a complete rewrite.

**Build real functionality, enforce security and tenant isolation, preserve data integrity, and keep every module maintainable.**
