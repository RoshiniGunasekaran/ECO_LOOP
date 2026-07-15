# Smart Waste Management System (EcoLoop)
## Complete Enterprise Backend Architecture & API Specification

---

## 1. System Overview & Architecture

EcoLoop is an enterprise-grade, multi-role Smart Waste Management System. It links **Customers**, **Delivery Partners**, **Industries**, and **Administrators** to enable door-to-door recyclable waste collection, real-time logistics tracking, automated price calculations, digital wallet payments, eco-rewards (XP & carbon credits), and an interactive community DIY recycling gallery.

### High-Level Architecture Model

```
                   ┌─────────────────────────────────────────┐
                   │           Frontend (React Client)       │
                   └────────────────────┬────────────────────┘
                                        │ (HTTPS / REST & WebSockets)
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │            Nginx Reverse Proxy          │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │    Spring Boot 3.x Security Filter       │
                   │       - JWT Verification                │
                   │       - Rate Limiting (Bucket4j)        │
                   │       - CORS & CSRF Shields             │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │      REST Controllers / API Layer       │
                   └────────────────────┬────────────────────┘
                                        │ (DTO Mapping with MapStruct)
                                        ▼
                   ┌─────────────────────────────────────────┐
                   │    Business Service Layer (Transactional)│
                   └──────┬──────────────┬─────────────┬─────┘
                          │              │             │
                          ▼              ▼             ▼
                   ┌────────────┐ ┌────────────┐ ┌────────────┐
                   │ Database   │ │ Redis L2   │ │ Event      │
                   │ Repositories││ Cache      │ │ Publisher  │
                   └──────┬─────┘ └──────┬─────┘ └─────┬──────┘
                          │              │             │ (Asynchronous AsyncEvents)
                          ▼              ▼             ▼
                   ┌────────────┐ ┌────────────┐ ┌───────────────────────────┐
                   │ PostgreSQL │ │ OTP / Keys │ │ Third-Party Integrations  │
                   │ DB Engine  │ │ Dashboard  │ │ - Razorpay (Payments)     │
                   └────────────┘ └────────────┘ │ - Firebase Cloud Messaging│
                                                 │ - Cloudinary (Storage)    │
                                                 │ - Google Maps Platform    │
                                                 │ - Twilio & SendGrid       │
                                                 └───────────────────────────┘
```

---

## 2. Technology Stack & Enterprise Tooling

| Capability | Chosen Technology | Rationale |
| :--- | :--- | :--- |
| **Language & Platform** | Java 21 LTS | Native support for virtual threads (Project Loom), modern pattern matching, and record types. High execution speed. |
| **Framework** | Spring Boot 3.4+ | De facto industry standard for enterprise microservices & modular monoliths. Powerful Dependency Injection, security, and integration. |
| **Build Tool** | Apache Maven 3.9+ | Clear, standard, and highly reproducible lifecycle phase and dependency declarations. |
| **Relational Database** | PostgreSQL 16+ | Powerful ACID-compliant transactional guarantees, rich support for JSONB, spatial querying via PostGIS, and high performance. |
| **Caching / Memory Store**| Redis 7.2+ | Used to store temporary verification OTPs, active JWT blacklists, and cache frequently retrieved public waste-pricing grids. |
| **ORM & Data Access** | Spring Data JPA / Hibernate 6 | Drastically cuts boilerplate SQL. Standardizes pagination, transaction boundaries (`@Transactional`), and lazy loading relations. |
| **Security & Auth** | Spring Security + JWT | Fully stateless token validation, role-based access control (RBAC), and standard CORS/CSRF configurations. |
| **File Storage** | Cloudinary / AWS S3 SDK | Cloud-based media management for profile avatars, verification weight slips, and DIY craft images. |
| **Email Delivery** | Spring Boot Starter Mail + Thymeleaf | Dynamic email templating for invoices, welcome letters, and OTP receipts. |
| **API Documentation** | Springdoc OpenAPI v2 (Swagger) | Automatic, runtime-generated API schema verification playgrounds matching OpenAPI specs. |
| **Event Bus** | Spring ApplicationEvents | Decoupled event-driven orchestration (e.g. `PickupCompletedEvent` dynamically triggers wallet credit, notifications, and analytics counters). |

---

## 3. Recommended Production Folder Structure

```
src/main/java/com/ecoloop/backend/
│
├── config/                          # Central Configurations
│   ├── SecurityConfig.java          # Spring Security & CORS Setup
│   ├── RedisConfig.java             # Cache Connection Factory & Serializers
│   ├── CloudinaryConfig.java        # Cloud Media Upload Connection
│   ├── SwaggerConfig.java           # OpenAPI/Swagger Documentation setup
│   └── WebMvcConfig.java            # CORS Policies & Interceptors
│
├── common/                          # Global Utilities & Handlers
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java # @ControllerAdvice for uniform error JSON
│   │   ├── ResourceNotFoundException.java
│   │   └── UnauthorizedException.java
│   ├── payload/
│   │   ├── ApiResponse.java         # Universal success response envelope
│   │   └── ApiErrorResponse.java    # Universal error response envelope
│   ├── constants/
│   │   └── AppConstants.java        # Pagination defaults, upload size ceilings
│   └── utils/
│       ├── JwtUtils.java            # Cryptographic token generator & parser
│       └── OtpUtils.java            # High-entropy random OTP generator
│
├── security/                        # Security Middlewares
│   ├── CustomUserDetailsService.java# Loads username/credentials from DB
│   └── JwtAuthenticationFilter.java # Intercepts requests to validate Bearer JWTs
│
└── modules/                         # Feature-Oriented Modular Structure
    ├── auth/                        # Registration, login, token refresh
    │   ├── controller/AuthGenericController.java
    │   ├── service/AuthGenericService.java
    │   └── dto/LoginRequest.java
    │
    ├── customer/                    # Pickups, DIY projects, dashboards
    │   ├── controller/CustomerController.java
    │   ├── service/CustomerService.java
    │   ├── repository/CustomerProfileRepository.java
    │   └── entity/CustomerProfile.java
    │
    ├── partner/                     # Online status, route mapping, weigh-ins
    │   ├── controller/PartnerController.java
    │   ├── service/PartnerService.java
    │   └── entity/PartnerProfile.java
    │
    ├── industry/                    # Scrap inventory management, processing
    │   ├── controller/IndustryController.java
    │   ├── service/IndustryService.java
    │   └── entity/IndustryProfile.java
    │
    ├── wallet/                      # Wallet, ledger transactions, payouts
    │   ├── controller/WalletController.java
    │   ├── service/WalletService.java
    │   └── entity/Wallet.java
    │
    └── admin/                       # Platform control metrics & configurations
        ├── controller/AdminController.java
        └── service/AdminService.java
```

---

## 4. Complete Database Design & Schema Blueprint

The following entity-relationship database design is mapped using strict PostgreSQL data types, relational constraints, foreign keys, and cascading indexes.

```
                  ┌──────────────┐
                  │    users     │
                  └──────┬───────┘
                         │ 1:1
        ┌────────────────┼────────────────┐
        │ 1:1            │ 1:1            │ 1:1
┌───────▼────────┐ ┌─────▼────────┐ ┌─────▼────────┐
│customer_profile│ │partner_profile││industry_profile
└───────┬────────┘ └─────┬────────┘ └─────┬────────┘
        │ 1:N            │ 1:N            │ 1:N
┌───────▼────────┐ ┌─────▼────────┐ ┌─────▼────────┐
│pickup_requests │ │ assignments  │ │ inventory    │
└───────┬────────┘ └──────────────┘ └──────────────┘
        │ 1:N
┌───────▼────────┐
│  pickup_items  │
└────────────────┘
```

### Table 1: `users`
Stores unified identity, credentials, and verification statuses for all roles.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `full_name` (VARCHAR(150) NOT NULL)
*   `email` (VARCHAR(150) UNIQUE NOT NULL)
*   `phone` (VARCHAR(15) UNIQUE NOT NULL)
*   `password_hash` (VARCHAR(255) NOT NULL)
*   `role` (VARCHAR(30) NOT NULL) -- 'CUSTOMER', 'PARTNER', 'INDUSTRY', 'ADMIN'
*   `status` (VARCHAR(30) DEFAULT 'PENDING_VERIFICATION') -- 'ACTIVE', 'SUSPENDED', 'BLOCKED'
*   `email_verified` (BOOLEAN DEFAULT FALSE)
*   `phone_verified` (BOOLEAN DEFAULT FALSE)
*   `profile_image_url` (VARCHAR(512))
*   `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)
*   `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Table 2: `customer_profiles`
Role-specific record for individual citizens/customers.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `user_id` (BIGINT REFERENCES users(id) ON DELETE CASCADE)
*   `rewards_xp` (INTEGER DEFAULT 0)
*   `current_tier` (VARCHAR(30) DEFAULT 'BRONZE') -- 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM'
*   `saved_address` (TEXT)
*   `city` (VARCHAR(100))
*   `state` (VARCHAR(100))
*   `pincode` (VARCHAR(10))

### Table 3: `partner_profiles`
Role-specific record for logistics delivery agents.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `user_id` (BIGINT REFERENCES users(id) ON DELETE CASCADE)
*   `is_online` (BOOLEAN DEFAULT FALSE)
*   `vehicle_type` (VARCHAR(50)) -- 'E_BIKE', 'THREE_WHEELER', 'MINI_TRUCK'
*   `vehicle_number` (VARCHAR(20))
*   `license_number` (VARCHAR(50) UNIQUE)
*   `approval_status` (VARCHAR(30) DEFAULT 'PENDING') -- 'APPROVED', 'REJECTED'
*   `avg_rating` (NUMERIC(3, 2) DEFAULT 5.00)

### Table 4: `industry_profiles`
Role-specific record for heavy recycling processors and commercial vendors.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `user_id` (BIGINT REFERENCES users(id) ON DELETE CASCADE)
*   `company_name` (VARCHAR(150) NOT NULL)
*   `registration_number` (VARCHAR(100) UNIQUE)
*   `facility_type` (VARCHAR(100)) -- 'PAPER_MILL', 'PLASTIC_EXTRUSION', 'E_WASTE_RECOVERY'
*   `address` (TEXT)
*   `daily_capacity_kg` (NUMERIC(10, 2))
*   `approval_status` (VARCHAR(30) DEFAULT 'PENDING')

### Table 5: `pickup_requests`
Main logistics tracker for scheduled recyclables collection.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `customer_id` (BIGINT REFERENCES users(id))
*   `status` (VARCHAR(50) DEFAULT 'PENDING') -- 'PENDING', 'ASSIGNED', 'COLLECTED', 'DELIVERED', 'COMPLETED', 'CANCELLED'
*   `scheduled_date` (DATE NOT NULL)
*   `scheduled_time_slot` (VARCHAR(50) NOT NULL)
*   `address` (TEXT NOT NULL)
*   `pincode` (VARCHAR(10) NOT NULL)
*   `latitude` (NUMERIC(10, 8))
*   `longitude` (NUMERIC(11, 8))
*   `special_instructions` (TEXT)
*   `assigned_partner_id` (BIGINT REFERENCES users(id) NULL)
*   `delivery_industry_id` (BIGINT REFERENCES users(id) NULL)
*   `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Table 6: `pickup_items`
Specific material sub-records belonging to a pickup request.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `pickup_request_id` (BIGINT REFERENCES pickup_requests(id) ON DELETE CASCADE)
*   `category` (VARCHAR(50) NOT NULL) -- 'PAPER', 'PLASTIC', 'E_WASTE', 'METAL', 'GLASS'
*   `sub_category` (VARCHAR(100)) -- 'CARDBOARD', 'PET_BOTTLES', 'COPPER_WIRE', etc.
*   `estimated_weight` (NUMERIC(6, 2) NOT NULL)
*   `verified_weight` (NUMERIC(6, 2) NULL)
*   `rate_per_kg` (NUMERIC(8, 2) NULL)
*   `total_amount` (NUMERIC(10, 2) NULL)

### Table 7: `pickup_images`
Saves Cloudinary URL paths for waste validation.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `pickup_request_id` (BIGINT REFERENCES pickup_requests(id) ON DELETE CASCADE)
*   `image_url` (VARCHAR(512) NOT NULL)
*   `image_type` (VARCHAR(30)) -- 'CUSTOMER_SUBMISSION', 'PARTNER_WEIGH_IN'

### Table 8: `wallets`
Tracks credit balances in INR.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `user_id` (BIGINT REFERENCES users(id) ON DELETE CASCADE)
*   `balance` (NUMERIC(12, 2) DEFAULT 0.00)
*   `withdrawn_total` (NUMERIC(12, 2) DEFAULT 0.00)
*   `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Table 9: `wallet_transactions`
Auditable logs of wallet operations.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `wallet_id` (BIGINT REFERENCES wallets(id))
*   `amount` (NUMERIC(12, 2) NOT NULL)
*   `type` (VARCHAR(20) NOT NULL) -- 'RECYCLING_PAYOUT', 'WITHDRAWAL', 'REFERRAL_BONUS'
*   `status` (VARCHAR(20) DEFAULT 'COMPLETED') -- 'PENDING', 'COMPLETED', 'FAILED'
*   `reference_id` (VARCHAR(100)) -- Razorpay Transfer ID or Pickup Request ID
*   `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Table 10: `diy_projects`
Interactive citizen crafts platform.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `creator_id` (BIGINT REFERENCES users(id))
*   `title` (VARCHAR(150) NOT NULL)
*   `description` (TEXT NOT NULL)
*   `materials_used` (VARCHAR(255))
*   `steps_json` (JSONB NOT NULL)
*   `image_url` (VARCHAR(512))
*   `likes_count` (INTEGER DEFAULT 0)
*   `xp_rewarded` (INTEGER DEFAULT 100)
*   `status` (VARCHAR(30) DEFAULT 'PENDING') -- 'PENDING', 'APPROVED', 'REJECTED'
*   `created_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

### Table 11: `waste_pricing_matrix`
System rates managed by Administrator.
*   `id` (BIGSERIAL PRIMARY KEY)
*   `category` (VARCHAR(50) NOT NULL)
*   `sub_category` (VARCHAR(100) UNIQUE NOT NULL)
*   `price_per_kg_customer` (NUMERIC(8, 2) NOT NULL)
*   `price_per_kg_industry` (NUMERIC(8, 2) NOT NULL)
*   `updated_at` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

---

## 5. Standard HTTP Request & Response Protocols

All API communications are formatted as standard JSON structures to maximize compatibility with the React frontend client and provide predictable runtime patterns.

### Standard Success Envelope
```json
{
  "success": true,
  "message": "Resource retrieved successfully.",
  "timestamp": "2026-07-15T08:15:30.123Z",
  "data": {
    "key": "value"
  }
}
```

### Standard Error Envelope
```json
{
  "success": false,
  "message": "Operation failed due to validation rules.",
  "timestamp": "2026-07-15T08:16:11.450Z",
  "errorCode": "VALIDATION_FAILED",
  "errors": [
    {
      "field": "phone",
      "rejectedValue": "987654",
      "reason": "Phone must contain exactly 10 numeric digits."
    }
  ]
}
```

---

## 6. Unified Security & Authentication Engine

### JWT Protocol Implementation
1.  **Transport Protocol**: HTTPS.
2.  **Authorization Header**: `Authorization: Bearer <JWT_TOKEN>`
3.  **Token Lifespans**:
    *   `AccessToken`: 15 minutes (stateless verification check).
    *   `RefreshToken`: 7 days (persisted in database to generate new Access Tokens safely).
4.  **JWT Claims Struct**:
    *   `sub`: User registration ID.
    *   `email`: User login email.
    *   `role`: `ROLE_CUSTOMER`, `ROLE_PARTNER`, `ROLE_INDUSTRY`, or `ROLE_ADMIN`.
    *   `iat`: Created timestamp.
    *   `exp`: Expiry timestamp.

---

## 7. Global API Inventory (117 Endpoints)

Below is the exhaustive, structured inventory of all **117 backend APIs** requested for the complete enterprise MVP platform.

### Module 1: Unified Authentication & Access Control (12 APIs)
| HTTP Method | API Path | Role Access | Functionality |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register/customer` | PUBLIC | Registers new citizen accounts (creates user profile + wallet) |
| `POST` | `/api/auth/register/partner` | PUBLIC | Submits driver/delivery logistics vehicle details for admin vetting |
| `POST` | `/api/auth/register/industry` | PUBLIC | Submits industrial recycling license + processing volume capabilities |
| `POST` | `/api/auth/login` | PUBLIC | Validates email/password credentials; issues stateless JWT tokens |
| `POST` | `/api/auth/logout` | authenticated | Invalidation endpoint (registers current JWT in Redis blacklist) |
| `POST` | `/api/auth/refresh-token` | PUBLIC | Generates a new 15-minute Access Token using a valid Refresh Token |
| `POST` | `/api/auth/forgot-password` | PUBLIC | Triggers high-entropy password-reset token via email / SMS OTP |
| `POST` | `/api/auth/reset-password` | PUBLIC | Consumes token to securely rewrite password hash in `users` |
| `POST` | `/api/auth/change-password` | authenticated | Updates active password after verifying current raw password |
| `POST` | `/api/auth/verify-email` | PUBLIC | Validates registration email by checking verification tokens |
| `POST` | `/api/auth/send-otp` | PUBLIC | Dispatches temporary 6-digit verification codes to user mobile |
| `POST` | `/api/auth/verify-otp` | PUBLIC | Matches OTP using secure Redis memory limits to verify phone number |

### Module 2: Customer Portal Dashboard & Pickups (25 APIs)
| HTTP Method | API Path | Role Access | Functionality |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/customer/dashboard` | CUSTOMER | Returns totals: active balances, dynamic carbon points, pending jobs |
| `POST` | `/api/pickups` | CUSTOMER | Books new recycling schedules with coordinates, date, slots, & items |
| `GET` | `/api/pickups` | CUSTOMER | Retrieves pageable records of all scheduled collections |
| `GET` | `/api/pickups/{pickupId}` | CUSTOMER / PARTNER | Fetches granular details of a specific pickup (weights, photos) |
| `PUT` | `/api/pickups/{pickupId}` | CUSTOMER | Edits scheduled slots, instructions, or item lists (if still PENDING) |
| `DELETE` | `/api/pickups/{pickupId}` | CUSTOMER | Cancels active schedules; releases driver locks safely |
| `GET` | `/api/pickups/history` | CUSTOMER | Fetches filtered records of fully completed past pickups |
| `GET` | `/api/pickups/upcoming` | CUSTOMER | Retrieves current day/week active scheduled pickups |
| `GET` | `/api/pickups/{pickupId}/tracking` | CUSTOMER | Pulls active partner geo-coordinates for on-map tracking |
| `GET` | `/api/pickups/{pickupId}/status` | CUSTOMER | Lightweight polling endpoint for live state machine updates |
| `POST` | `/api/uploads/images` | authenticated | Standard multi-part uploader returning persistent Cloudinary links |
| `DELETE` | `/api/uploads/images/{imageId}` | authenticated | Removes asset from cloud bucket to prevent clutter |
| `GET` | `/api/wallet` | CUSTOMER / PARTNER | Fetches current balance, bank accounts, and withdrawals |
| `GET` | `/api/wallet/history` | CUSTOMER / PARTNER | Auditable transactional ledger of additions and debits |
| `POST` | `/api/wallet/withdraw` | CUSTOMER / PARTNER | Triggers transfer payout requests using Razorpay/Stripe |
| `POST` | `/api/wallet/add-bank` | CUSTOMER / PARTNER | Binds routing code, bank name, and account details |
| `PUT` | `/api/wallet/update-bank` | CUSTOMER / PARTNER | Updates registered payout accounts |
| `GET` | `/api/rewards` | CUSTOMER | Shows reward profile (XP balance, tier badges, streaks) |
| `GET` | `/api/rewards/history` | CUSTOMER | Logs points awarded per pickup or DIY community action |
| `POST` | `/api/rewards/redeem` | CUSTOMER | Exchanges XP tokens for brand coupons or green partner credits |
| `POST` | `/api/diy-projects` | CUSTOMER | Submits community recycling guides with images & instructions |
| `GET` | `/api/diy-projects` | CUSTOMER | Fetches personal guide submissions |
| `GET` | `/api/diy-projects/community` | PUBLIC / CUSTOMER| Displays approved gallery cards (pageable, searchable) |
| `GET` | `/api/diy-projects/{id}` | PUBLIC / CUSTOMER| Fetches step-by-step text guide with feedback/likes counts |
| `PUT` | `/api/diy-projects/{id}` | CUSTOMER | Modifies personal submission details |
| `DELETE` | `/api/diy-projects/{id}` | CUSTOMER | Deletes personal gallery craft card |

### Module 3: Logistics & Delivery Partner Module (18 APIs)
| HTTP Method | API Path | Role Access | Functionality |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/partner/dashboard` | PARTNER | Returns summaries: completed collections, cash earned, reviews |
| `PUT` | `/api/partner/status` | PARTNER | Toggles driver state to active on-duty matching queues |
| `GET` | `/api/partner/pickups/available`| PARTNER | Shows active matching nearby jobs within configured pincodes |
| `POST` | `/api/partner/pickups/{pickupId}/accept`| PARTNER| Commits to a pickup request; transitions status to ASSIGNED |
| `POST` | `/api/partner/pickups/{pickupId}/reject`| PARTNER| Rejects job; triggers automatic routing re-allocation |
| `GET` | `/api/partner/pickups` | PARTNER | Fetches driver active schedules and tasks |
| `PUT` | `/api/partner/pickups/{pickupId}/start`| PARTNER| Signals transit to customer address; triggers tracking update |
| `PUT` | `/api/partner/pickups/{pickupId}/arrived`| PARTNER| Triggers alert showing partner has arrived at pickup location |
| `PUT` | `/api/partner/pickups/{pickupId}/collect`| PARTNER| Initiates weight-scale validation entry interface |
| `POST` | `/api/partner/weight` | PARTNER | Records verified item weights (inputs kilograms per item) |
| `POST` | `/api/bills/generate` | PARTNER | Performs backend price verification, calculates total pay |
| `GET` | `/api/bills/{pickupId}` | authenticated | Retrieves billing summaries (payouts, GST, platform fees) |
| `GET` | `/api/bills/download/{pickupId}`| authenticated | Returns styled PDF receipt of completed transactions |
| `GET` | `/api/partner/industry` | PARTNER | Fetches nearest target industry routing for waste drop-off |
| `POST` | `/api/partner/delivered` | PARTNER | Records delivery confirmation scan at the industry warehouse |
| `PUT` | `/api/partner/pickups/{pickupId}/complete`| PARTNER| Transitions job state to COMPLETED after weight match |
| `GET` | `/api/partner/earnings` | PARTNER | Fetches detailed logistics incentive reports |
| `GET` | `/api/partner/history` | PARTNER | Fetches past deliveries and collected weights ledger |

### Module 4: Industrial Recycling Hub (12 APIs)
| HTTP Method | API Path | Role Access | Functionality |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/industry/dashboard` | INDUSTRY | Returns incoming tonnage metrics and material processing queues |
| `GET` | `/api/industry/incoming` | INDUSTRY | Displays pending partner waste arrivals |
| `POST` | `/api/industry/incoming/{id}/accept`| INDUSTRY | Confirms delivery weights match manifest; triggers automated payouts |
| `POST` | `/api/industry/incoming/{id}/reject`| INDUSTRY | Flags manifest discrepancies for admin audit |
| `GET` | `/api/industry/inventory` | INDUSTRY | Shows current raw material stockpiles (Paper, Plastic, Metal, etc.) |
| `POST` | `/api/industry/inventory` | INDUSTRY | Logs manual inventory updates |
| `PUT` | `/api/industry/inventory/{id}`| INDUSTRY | Edits raw material item tracking details |
| `DELETE` | `/api/industry/inventory/{id}`| INDUSTRY | Discards erroneous database stock records |
| `PUT` | `/api/industry/process/{id}` | INDUSTRY | Updates material processing state (e.g. 'SORTED' -> 'RECYCLED') |
| `GET` | `/api/industry/orders` | INDUSTRY | Tracks out-bound sales of processed green pellets or sheets |
| `GET` | `/api/industry/reports` | INDUSTRY | Exports monthly carbon reduction certificate metrics |

### Module 5: Central Administrator Command (24 APIs)
| HTTP Method | API Path | Role Access | Functionality |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/dashboard` | ADMIN | Interactive platform health panel (revenue, collections, registrations) |
| `GET` | `/api/admin/customers` | ADMIN | Retrieves list of registered citizen accounts |
| `GET` | `/api/admin/customers/{id}` | ADMIN | Detailed user view (historical tickets, logs, rewards) |
| `PUT` | `/api/admin/customers/{id}` | ADMIN | Suspends, activates, or blocks citizen accounts |
| `DELETE` | `/api/admin/customers/{id}` | ADMIN | Soft-deletes user profile info safely |
| `GET` | `/api/admin/partners` | ADMIN | Fetches partner logistics registry |
| `PUT` | `/api/admin/partners/{id}/approve`| ADMIN| Authorizes driver licenses, enabling live job acceptances |
| `PUT` | `/api/admin/partners/{id}/reject`| ADMIN | Denies partner registry credentials; dispatches notice |
| `PUT` | `/api/admin/partners/{id}/suspend`| ADMIN| Temporary off-duty lockout for code-of-conduct violations |
| `GET` | `/api/admin/industries` | ADMIN | Retrieves list of regional commercial recycling facilities |
| `PUT` | `/api/admin/industries/{id}/approve`| ADMIN| Approves industrial factory verification |
| `PUT` | `/api/admin/industries/{id}/reject`| ADMIN | Denies raw commercial supply access |
| `GET` | `/api/admin/pickups` | ADMIN | Enterprise-wide logistics ledger of all historical pickups |
| `PUT` | `/api/admin/pickups/{id}/assign`| ADMIN | Manual override to force-assign driver to stuck booking |
| `PUT` | `/api/admin/pickups/{id}/status`| ADMIN | Hard-updates collection progress states |
| `GET` | `/api/admin/pricing` | ADMIN | Returns current rate tables per material type |
| `POST` | `/api/admin/pricing` | ADMIN | Adds new pricing structures for specialized items |
| `PUT` | `/api/admin/pricing/{id}` | ADMIN | Updates rate matrices to reflect real-time global commodity values |
| `DELETE` | `/api/admin/pricing/{id}`| ADMIN | Removes material category listings from client selection grids |
| `GET` | `/api/admin/categories` | ADMIN | Returns structured classification schema list |
| `POST` | `/api/admin/categories` | ADMIN | Introduces specialized types (e.g. 'Bio-Hazardous', 'Compost') |
| `PUT` | `/api/admin/categories/{id}` | ADMIN | Renames material classification structures |
| `DELETE` | `/api/admin/categories/{id}`| ADMIN | Purges non-viable categories safely |
| `GET` | `/api/admin/reports` | ADMIN | Exports historical analytical summaries (PDF/CSV format) |

### Module 6: Payments & Financial Integrations (8 APIs)
| HTTP Method | API Path | Role Access | Functionality |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/payments/create-order` | CUSTOMER | Interacts with payment gateways to initiate withdrawal validations |
| `POST` | `/api/payments/verify` | CUSTOMER | Validates transaction signature logs from third-party pay widgets |
| `POST` | `/api/payments/payout` | ADMIN | Authorizes batch disbursements from platform account to partner banks |
| `GET` | `/api/payments/history` | authenticated | Returns personal billing invoice history records |

### Module 7: Core System Engines (Maps, Searches, Alerts, Uploads) (16 APIs)
| HTTP Method | API Path | Role Access | Functionality |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/maps/location` | authenticated | Pulls address geometries from Google Maps Autocomplete API |
| `GET` | `/api/maps/route` | PARTNER | Generates directions, distance matrices, & optimum driving paths |
| `GET` | `/api/maps/distance` | PARTNER | Calculates mileage for driver payouts and incentive bonuses |
| `GET` | `/api/notifications` | authenticated | Lists in-app message alerts for the active user session |
| `POST` | `/api/notifications/send` | ADMIN | Broadcasts global announcements to the platform |
| `PUT` | `/api/notifications/read` | authenticated | Marks active notification list as read |
| `GET` | `/api/search/customers` | ADMIN | Filters customers by phone, email, name, or city |
| `GET` | `/api/search/partners` | ADMIN | Filters partners by license, rating, vehicle type, or status |
| `GET` | `/api/search/pickups` | ADMIN / PARTNER | Filters pickups by date ranges, categories, and locations |
| `GET` | `/api/search/industries` | ADMIN | Filters processing factories by type or capacity |
| `POST` | `/api/files/upload` | authenticated | Secure multi-part binary file validation wrapper |
| `GET` | `/api/files/{id}` | authenticated | Retrieves secure, signed media download paths |
| `DELETE` | `/api/files/{id}` | authenticated | Removes file metadata and cloud storage references |
| `GET` | `/api/analytics/dashboard` | ADMIN | Pulls dynamic analytical aggregations |
| `GET` | `/api/analytics/monthly` | ADMIN | Aggregates collection tonnage and payout trends |
| `GET` | `/api/analytics/waste` | ADMIN | Dynamic material percentage data (maps to Recharts Pie views) |

---

## 8. Detailed API Endpoint Blueprints

Below are granular, production-ready specifications for four critical system workflows.

---

### Endpoint 1: Customer Registration

*   **Endpoint**: `POST /api/auth/register/customer`
*   **Access Control**: PUBLIC
*   **Request Headers**: `Content-Type: application/json`
*   **Request Body**:
```json
{
  "fullName": "John Doe",
  "email": "john.doe@gmail.com",
  "phone": "9876543210",
  "password": "SecurePassword123!",
  "address": "123 Green Avenue",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "pincode": "600040"
}
```
*   **Validations**:
    *   `fullName` cannot be empty, maximum 150 characters.
    *   `email` must match a valid RFC 5322 email regex pattern.
    *   `phone` must contain exactly 10 digits.
    *   `password` must meet strict strength constraints (minimum 8 characters, 1 uppercase, 1 lowercase, 1 number, 1 special character).
*   **Backend Business Logic**:
    1.  Validate request constraints. Throw custom `ValidationException` (HTTP 400) if any checks fail.
    2.  Query database to verify uniqueness of `email` and `phone`. If duplicates exist, throw `DuplicateResourceException` (HTTP 409).
    3.  Hash raw password using modern BCrypt (strength parameter: 12).
    4.  Create database transaction:
        *   Insert a record into the `users` table with standard roles and status: `PENDING_VERIFICATION`.
        *   Insert custom profile mapping in `customer_profiles` with Tier initialized as `BRONZE`.
        *   Provision and bind a standard `wallet` initialized with `balance = 0.00`.
    5.  Asynchronously trigger user verification email using SendGrid/Spring Mail template.
    6.  Return verification payload containing `customerId` and success message.
*   **Database Tables Modified**: `users`, `customer_profiles`, `wallets`
*   **Success Response** (HTTP 201 Created):
```json
{
  "success": true,
  "message": "User registered successfully. Please verify your email via the link sent.",
  "timestamp": "2026-07-15T08:30:00.000Z",
  "data": {
    "customerId": 45102,
    "email": "john.doe@gmail.com",
    "verificationStatus": "PENDING"
  }
}
```

---

### Endpoint 2: Create Pickup Request

*   **Endpoint**: `POST /api/pickups`
*   **Access Control**: CUSTOMER (Requires authentication check)
*   **Request Headers**:
    *   `Authorization: Bearer <JWT_TOKEN>`
    *   `Content-Type: application/json`
*   **Request Body**:
```json
{
  "scheduledDate": "2026-07-20",
  "scheduledTimeSlot": "10:00 AM - 01:00 PM",
  "address": "123 Green Avenue, Anna Nagar",
  "pincode": "600040",
  "latitude": 13.0827,
  "longitude": 80.2707,
  "items": [
    {
      "category": "PLASTIC",
      "subCategory": "PET_BOTTLES",
      "estimatedWeight": 12.50
    },
    {
      "category": "PAPER",
      "subCategory": "CARDBOARD_BOXES",
      "estimatedWeight": 15.00
    }
  ],
  "imageUrls": [
    "https://res.cloudinary.com/ecoloop/image/upload/v1234/submission1.jpg"
  ]
}
```
*   **Validations**:
    *   `scheduledDate` must be a valid future date (at least same-day booking constraints).
    *   `scheduledTimeSlot` must match allowed enterprise slot ranges.
    *   `items` array must contain at least 1 valid recycling item.
    *   `estimatedWeight` must be a positive number greater than 0.
*   **Backend Business Logic**:
    1.  Validate active JWT token and extract `userId` from claims. Verify the user has the `CUSTOMER` role.
    2.  Verify customer account status is active in the database.
    3.  Begin transactional block:
        *   Insert main scheduling meta into `pickup_requests` mapping status as `PENDING`.
        *   Loop through the items array, calculate estimated payout value using pricing values, and insert records into `pickup_items`.
        *   Save submitted image links in the `pickup_images` table.
    4.  Publish asynchronous `PickupCreatedEvent` to trigger location matching services.
    5.  Return the newly created `pickupId` and estimated payout calculations.
*   **Database Tables Modified**: `pickup_requests`, `pickup_items`, `pickup_images`
*   **Success Response** (HTTP 201 Created):
```json
{
  "success": true,
  "message": "Recyclables pickup schedule created successfully.",
  "timestamp": "2026-07-15T08:35:10.000Z",
  "data": {
    "pickupId": 10094,
    "status": "PENDING",
    "estimatedPayout": 385.50,
    "assignedPartner": null
  }
}
```

---

### Endpoint 3: Accept Pickup Request

*   **Endpoint**: `POST /api/partner/pickups/{pickupId}/accept`
*   **Access Control**: PARTNER (Requires authentication check)
*   **Request Headers**:
    *   `Authorization: Bearer <JWT_TOKEN>`
*   **Path Parameters**: `pickupId` (Identifier of target pickup)
*   **Backend Business Logic**:
    1.  Validate active partner JWT token and extract `partnerUserId`.
    2.  Verify the partner has a verified profile and is set to `is_online = true`.
    3.  Initiate transactional database check with pessimistic locking (`SELECT FOR UPDATE` on `pickup_requests`) to prevent race conditions from concurrent drivers:
        *   Verify current status is `PENDING`. If already assigned or cancelled, throw `IllegalStateException` (HTTP 410 Gone).
    4.  Update pickup record:
        *   Set `assigned_partner_id = partnerUserId`.
        *   Set `status = 'ASSIGNED'`.
    5.  Trigger Firebase Cloud Notification (FCM) to the booking Customer: "A delivery partner is heading to collect your waste!"
    6.  Return status payload.
*   **Database Tables Modified**: `pickup_requests`
*   **Success Response** (HTTP 200 OK):
```json
{
  "success": true,
  "message": "Pickup request successfully locked and assigned.",
  "timestamp": "2026-07-15T08:40:02.110Z",
  "data": {
    "pickupId": 10094,
    "status": "ASSIGNED",
    "assignedPartnerId": 802,
    "etaMinutes": 15
  }
}
```

---

### Endpoint 4: Verify Weight & Generate Payout Invoice

*   **Endpoint**: `POST /api/bills/generate`
*   **Access Control**: PARTNER
*   **Request Headers**:
    *   `Authorization: Bearer <JWT_TOKEN>`
    *   `Content-Type: application/json`
*   **Request Body**:
```json
{
  "pickupRequestId": 10094,
  "items": [
    {
      "itemId": 20412,
      "verifiedWeight": 14.20
    },
    {
      "itemId": 20413,
      "verifiedWeight": 16.50
    }
  ],
  "scaleVerificationSlipUrl": "https://res.cloudinary.com/ecoloop/image/upload/v1234/scale_slip.jpg"
}
```
*   **Validations**:
    *   `pickupRequestId` must exist and be currently assigned to the calling partner.
    *   `verifiedWeight` values must be realistic positive values.
*   **Backend Business Logic**:
    1.  Validate active partner token and verify ownership of the target job assignment.
    2.  Start transaction block:
        *   Retrieve target pickup request and verify status is `ASSIGNED`.
        *   For each item, fetch real-time commodity prices per kilogram from the pricing matrix.
        *   Update verified weight, rate, and total payout values in `pickup_items`.
        *   Calculate total aggregate payout to be paid to the customer.
        *   Insert scale slip image in `pickup_images`.
        *   Update pickup request status to `COLLECTED`.
        *   Credit the customer's wallet balance using database optimistic lock controls to prevent dirty reads.
        *   Insert custom credit record into `wallet_transactions`.
        *   Calculate recycling XP (e.g. 10 XP per kg collected) and award to customer's profile, upgrading tier if target ceilings are met.
    3.  Asynchronously render transactional PDF invoice utilizing Thymeleaf + OpenPDF/iText; save copy to Cloudinary and dispatch email to customer.
    4.  Return transaction summary.
*   **Database Tables Modified**: `pickup_items`, `pickup_requests`, `pickup_images`, `wallets`, `wallet_transactions`, `customer_profiles`
*   **Success Response** (HTTP 200 OK):
```json
{
  "success": true,
  "message": "Weights validated successfully. Payout credited to customer wallet.",
  "timestamp": "2026-07-15T09:12:44.200Z",
  "data": {
    "pickupId": 10094,
    "totalPayoutInr": 428.40,
    "xpEarned": 307,
    "customerWalletBalance": 1250.00,
    "invoicePdfUrl": "https://res.cloudinary.com/ecoloop/raw/upload/v1234/inv_10094.pdf"
  }
}
```

---

## 9. Spring Boot Production Enterprise Code Blueprint

Here is clean, production-ready, fully commented Java code snippets covering core infrastructure.

### 1. Unified User Entity
```java
package com.ecoloop.backend.modules.user.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @NotBlank
    @Size(max = 150)
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Email
    @NotBlank
    @Size(max = 150)
    @Column(unique = true, nullable = false)
    private String email;

    @NotBlank
    @Size(max = 15)
    @Column(unique = true, nullable = false)
    private String phone;

    @NotBlank
    @Size(max = 255)
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AccountStatus status = AccountStatus.PENDING_VERIFICATION;

    @Column(name = "email_verified")
    private Boolean emailVerified = false;

    @Column(name = "phone_verified")
    private Boolean phoneVerified = false;

    @Column(name = "profile_image_url", length = 512)
    private String profileImageUrl;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    public enum Role {
        CUSTOMER, PARTNER, INDUSTRY, ADMIN
    }

    public enum AccountStatus {
        PENDING_VERIFICATION, ACTIVE, SUSPENDED, BLOCKED
    }
}
```

---

### 2. Spring Security JWT Web Filter
```java
package com.ecoloop.backend.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtUtils jwtUtils;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {
        
        final String authHeader = request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        jwt = authHeader.substring(7);
        userEmail = jwtUtils.extractEmail(jwt);

        if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {
            UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);
            
            if (jwtUtils.isTokenValid(jwt, userDetails)) {
                UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        userDetails,
                        null,
                        userDetails.getAuthorities()
                );
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        filterChain.doFilter(request, response);
    }
}
```

---

### 3. Controller API Handler & validation
```java
package com.ecoloop.backend.modules.customer.controller;

import com.ecoloop.backend.common.payload.ApiResponse;
import com.ecoloop.backend.modules.customer.dto.PickupRequestDto;
import com.ecoloop.backend.modules.customer.dto.PickupResponseDto;
import com.ecoloop.backend.modules.customer.service.CustomerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;

@RestController
@RequestMapping("/api/pickups")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @PostMapping
    @PreAuthorize("hasRole('CUSTOMER')")
    public ResponseEntity<ApiResponse<PickupResponseDto>> createPickup(
            @Valid @RequestBody PickupRequestDto request,
            Principal principal
    ) {
        String customerEmail = principal.getName();
        PickupResponseDto data = customerService.processPickupSchedule(request, customerEmail);
        
        ApiResponse<PickupResponseDto> response = ApiResponse.<PickupResponseDto>builder()
                .success(true)
                .message("Pickup request booked and scheduled successfully.")
                .data(data)
                .build();
                
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }
}
```

---

### 4. Global Exception Advice Interceptor
```java
package com.ecoloop.backend.common.exception;

import com.ecoloop.backend.common.payload.ApiErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException ex) {
        ApiErrorResponse err = ApiErrorResponse.builder()
                .success(false)
                .message(ex.getMessage())
                .timestamp(LocalDateTime.now())
                .errorCode("RESOURCE_NOT_FOUND")
                .build();
        return new ResponseEntity<>(err, HttpStatus.NOT_FOUND);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidationErrors(MethodArgumentNotValidException ex) {
        List<ApiErrorResponse.ValidationErrorDetail> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(err -> ApiErrorResponse.ValidationErrorDetail.builder()
                        .field(err.getField())
                        .rejectedValue(err.getRejectedValue())
                        .reason(err.getDefaultMessage())
                        .build())
                .collect(Collectors.toList());

        ApiErrorResponse err = ApiErrorResponse.builder()
                .success(false)
                .message("Input validation constraints failed.")
                .timestamp(LocalDateTime.now())
                .errorCode("VALIDATION_FAILED")
                .errors(details)
                .build();
        return new ResponseEntity<>(err, HttpStatus.BAD_REQUEST);
    }
}
```

---

## 10. Step-by-Step Local Deployment & Run Instructions

To deploy, configure, and boot this enterprise Spring Boot backend framework on your local machine, follow the steps below.

### Prerequisites
1.  **JDK 21**: Make sure Java Development Kit 21 LTS is installed. Verify by running `java -version`.
2.  **Maven**: For dependency resolution. Verify via `mvn -version`.
3.  **Docker Desktop & Docker Compose**: Used to spin up secure database/cache engines instantaneously.
4.  **Integrated Development Environment (IDE)**: IntelliJ IDEA (Highly recommended for Spring Boot development) or Visual Studio Code.

### Step 1: Initialize Database and Cache via Docker Compose
Create a file named `docker-compose.yml` in your backend root folder:
```yaml
version: '3.8'

services:
  postgres-db:
    image: postgres:16-alpine
    container_name: ecoloop-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: ecoloop_admin
      POSTGRES_PASSWORD: admin_secure_pass_99
      POSTGRES_DB: ecoloop_database
    volumes:
      - postgres_data:/var/lib/postgresql/data
    restart: always

  redis-cache:
    image: redis:7.2-alpine
    container_name: ecoloop-redis
    ports:
      - "6379:6379"
    restart: always

volumes:
  postgres_data:
```
**Run command to boot containers**:
```bash
docker-compose up -d
```

### Step 2: Configure Application Secrets
Create the primary enterprise settings file inside `src/main/resources/application.yml`:
```yaml
server:
  port: 8080

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/ecoloop_database
    username: ecoloop_admin
    password: admin_secure_pass_99
    driver-class-name: org.postgresql.Driver
  
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate:
      ddl-auto: update # Automatically syncs Java Entity classes to Postgres tables on launch
    show-sql: true
    properties:
      hibernate:
        format_sql: true

  data:
    redis:
      host: localhost
      port: 6379

app:
  jwt:
    secret: 9a4f632e22d3ac410294e63e26458a2d12534f3a5e8c1054366e6b72d9e4c1a8  # HMAC-256 cryptographically secure hex key
    accessTokenExpirationMs: 900000 # 15 minutes
    refreshTokenExpirationMs: 604800000 # 7 days
```

### Step 3: Run and Boot the Application Locally
Navigate to your project root and execute the command below in your terminal:
```bash
# Cleans legacy compiles and boots Spring Boot
mvn clean spring-boot:run
```

Once you see the Spring banner and the log line `Tomcat started on port 8080 (http)`, the server is fully running!

### Step 4: Access Dynamic API Swagger Documentation
Open your web browser and navigate to:
```
http://localhost:8080/swagger-ui/index.html
```
Here, you can test registration, login, book simulated pickup requests, weigh waste collections, and verify financial balances dynamically inside a visual interface!
