# 13. Phase 2 - System Architecture & Technical Design

Once the UI/UX design phase is complete and screens are approved, the next phase is System Architecture and Technical Design. This phase defines how every part of the system is built, how data flows between modules, how the database is structured, how the server communicates with the frontend, and how the system stays secure, fast, and reliable, especially in Ugandan network conditions where internet connectivity can be inconsistent.

This phase answers the question: how does everything actually work under the hood?

## System Design Phase Order - After UI/UX

- Phase 1: UI/UX Design (Completed above)
- Phase 2: System Architecture & Technical Design (This section)
- Phase 3: Database Design & Data Modelling
- Phase 4: API Design & Backend Development
- Phase 5: Frontend Development
- Phase 6: Integration & Third-Party Services
- Phase 7: Testing & Quality Assurance
- Phase 8: Deployment & Infrastructure
- Phase 9: Training, Launch & Handover
- Phase 10: Maintenance, Monitoring & Iteration

## 13.1 High-Level System Architecture

Meka POS should follow a three-tier architecture: a frontend client layer that users interact with, a backend application layer that handles business logic, and a database layer that stores all data. These three layers must be clearly separated so that each can be developed, tested, scaled, and maintained independently.

| Layer             | What It Is                                                                                         | Technology Recommendation                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Frontend (Client) | The user interface, what staff and managers see and interact with in the browser or on a device    | React.js or Next.js, component-based, fast, supports offline with service workers    |
| Backend (Server)  | The application layer, handles all business logic, authentication, calculations, and API responses | Node.js with Express or NestJS, fast, JavaScript-native, good for real-time features |
| Database          | Where all data is stored permanently, products, sales, customers, staff, finance records           | PostgreSQL (primary), reliable, supports complex queries and transactions            |
| Cache Layer       | Temporary fast-access storage for frequently read data like product lists and dashboard stats      | Redis, in-memory, extremely fast, reduces database load                              |
| File Storage      | Storing uploaded files, product images, receipt PDFs, report exports, staff photos                 | AWS S3 or Cloudflare R2, scalable, cheap, globally accessible                        |
| AI Layer          | External AI API calls for the AI Assistant and Smart Insights processing                           | Anthropic Claude API or OpenAI API with structured business data context             |
| Email Service     | Sending receipts, invoices, alerts, and reports                                                    | SendGrid or Mailgun API                                                              |
| Background Jobs   | Scheduled tasks, daily reports, AI insight generation, low stock checks, credit reminders          | BullMQ with Redis or node-cron for simpler schedules                                 |

## 13.2 Database Design & Data Modelling

The database is the foundation of the entire system. Every module, Sales, Inventory, Finance, Customers, Warehouse, must have a well-defined table structure with clear relationships between tables. Poor database design at this stage causes bugs, slow queries, and data integrity problems that are extremely difficult to fix later.

### Core Tables & Their Key Fields

| Table               | Key Fields                                                                                                                                                            | Relates To                        |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| businesses          | id, name, tin, vat_number, currency, address, district, plan_type, created_at                                                                                         | All tables (multi-tenancy anchor) |
| branches            | id, business_id, name, code, address, district, manager_id, status                                                                                                    | businesses, users                 |
| users (staff)       | id, business_id, branch_id, name, email, phone, nin, role, pin_hash, password_hash, status                                                                            | businesses, branches, roles       |
| roles               | id, business_id, name, permissions (JSON)                                                                                                                             | users                             |
| customers           | id, business_id, name, phone, email, address, credit_limit, outstanding_balance, loyalty_points, status                                                               | businesses, sales, payments       |
| suppliers           | id, business_id, name, phone, email, address, outstanding_balance                                                                                                     | businesses, purchases             |
| products            | id, business_id, name, sku, barcode, category_id, cost_price, selling_price, tax_rate, image_url, status                                                              | categories, inventory_locations   |
| categories          | id, business_id, name, parent_id                                                                                                                                      | products                          |
| inventory_locations | id, business_id, branch_id, name, code, type, manager_id, capacity, status                                                                                            | branches, stock_levels            |
| stock_levels        | id, product_id, location_id, quantity, min_quantity, updated_at                                                                                                       | products, inventory_locations     |
| stock_adjustments   | id, location_id, product_id, type, quantity_change, new_quantity, reason, reference_no, approved_by, created_by, created_at                                           | stock_levels, users               |
| stock_transfers     | id, from_location_id, to_location_id, product_id, quantity, status, reference_no, transported_by, received_by, created_at                                             | inventory_locations, products     |
| sales               | id, business_id, branch_id, location_id, customer_id, cashier_id, subtotal, tax_amount, discount, total, payment_method, amount_paid, balance_due, status, created_at | customers, users, branches        |
| sale_items          | id, sale_id, product_id, quantity, unit_price, tax_rate, discount, line_total                                                                                         | sales, products                   |
| payments            | id, customer_id, sale_id, amount, method, reference_no, recorded_by, created_at                                                                                       | customers, sales, users           |
| expenses            | id, business_id, branch_id, category, amount, description, payment_method, reference_no, recorded_by, date                                                            | businesses, branches, users       |
| invoices            | id, business_id, customer_id, sale_id, amount, status, due_date, sent_at, created_at                                                                                  | customers, sales                  |
| purchases           | id, business_id, branch_id, supplier_id, location_id, total, status, received_by, created_at                                                                          | suppliers, inventory_locations    |
| purchase_items      | id, purchase_id, product_id, quantity, unit_cost, line_total                                                                                                          | purchases, products               |
| fiscal_years        | id, business_id, label, start_date, end_date, status, created_at                                                                                                      | businesses                        |
| tills               | id, branch_id, name, cashier_id, opening_float, closing_count, expected_cash, variance, status, opened_at, closed_at                                                  | branches, users                   |
| ai_insights         | id, business_id, type, title, body, data (JSON), generated_at, expires_at                                                                                             | businesses                        |
| notifications       | id, business_id, user_id, type, title, message, read, created_at                                                                                                      | businesses, users                 |

### Multi-Tenancy Design Principle

Every table must include a business_id column.

This means one database can serve multiple businesses (Soltrust, another shop, etc.) and each business only ever sees its own data.

All queries at the backend must always filter by business_id first.

This is the foundation of a scalable SaaS POS product.

## 13.3 API Design - Backend to Frontend Communication

The backend exposes a RESTful API (or GraphQL for more flexible querying) that the frontend calls to read and write data. Every module in the POS maps to a set of API endpoints. The API must be versioned, authenticated, and well-documented.

### API Design Principles

- All endpoints are prefixed with /api/v1/, versioning allows future changes without breaking existing clients.
- Every request must include a JWT (JSON Web Token) in the Authorization header, no unauthenticated access except login and health check.
- Every response follows a consistent structure: { success, data, message, errors }.
- Pagination is required on all list endpoints, never return unbounded lists.
- Rate limiting must be applied, protect against abuse and runaway queries.
- All write operations (POST, PUT, DELETE) must be logged to an audit trail table.

### Key API Endpoint Groups

| Module            | Endpoint Prefix       | Example Endpoints                                                                        |
| ----------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| Auth              | /api/v1/auth          | POST /login, POST /logout, POST /refresh-token, POST /reset-password                     |
| Users / Staff     | /api/v1/users         | GET /users, POST /users, PUT /users/:id, DELETE /users/:id, GET /users/:id/permissions   |
| Products          | /api/v1/products      | GET /products, POST /products, PUT /products/:id, GET /products/:id/stock                |
| Inventory         | /api/v1/inventory     | GET /inventory/locations, POST /inventory/locations, GET /inventory/locations/:id/stock  |
| Stock Adjustments | /api/v1/stock         | POST /stock/adjust, POST /stock/transfer, GET /stock/transfers, GET /stock/adjustments   |
| Sales             | /api/v1/sales         | GET /sales, POST /sales, GET /sales/:id, PUT /sales/:id/payment                          |
| Customers         | /api/v1/customers     | GET /customers, POST /customers, GET /customers/:id/balance, GET /customers/:id/payments |
| Payments          | /api/v1/payments      | POST /payments, GET /payments?customer_id=X                                              |
| Purchases         | /api/v1/purchases     | GET /purchases, POST /purchases, PUT /purchases/:id/receive                              |
| Expenses          | /api/v1/expenses      | GET /expenses, POST /expenses, PUT /expenses/:id                                         |
| Finance           | /api/v1/finance       | GET /finance/cashflow, GET /finance/fiscal-years, POST /finance/fiscal-years             |
| Reports           | /api/v1/reports       | GET /reports/sales, GET /reports/inventory, GET /reports/finance, POST /reports/custom   |
| AI                | /api/v1/ai            | POST /ai/ask, GET /ai/insights, GET /ai/insights/:type, POST /ai/reports/generate        |
| Notifications     | /api/v1/notifications | GET /notifications, PUT /notifications/:id/read, POST /notifications/settings            |

## 13.4 Authentication & Security

Security is non-negotiable in a POS system. Every transaction, customer record, and financial figure is sensitive business data. The following security measures must be implemented from day one, not added later.

| Security Concern                 | Implementation                                                                                                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Authentication                   | JWT tokens with short expiry (15 minutes access token, 7 day refresh token). Tokens stored in HttpOnly cookies, never in localStorage.                                               |
| POS Terminal PIN Login           | 4-digit PIN is hashed using bcrypt before storing. POS terminal sessions are separate from dashboard sessions and have restricted permissions.                                       |
| Role-Based Access Control (RBAC) | Every API endpoint checks the authenticated user's role and permissions before processing the request. A cashier calling /api/v1/finance/cashflow receives a 403 Forbidden response. |
| Password Policy                  | Minimum 8 characters, must include a number and a symbol. Passwords are hashed with bcrypt (minimum 12 rounds). Never stored in plain text.                                          |
| Data Encryption                  | All data in transit uses HTTPS/TLS (SSL certificate required). Sensitive fields in the database (PINs, passwords, API keys) are encrypted at rest.                                   |
| Audit Logging                    | Every create, update, and delete action is written to an audit_log table with: user_id, action, table affected, record_id, old_value, new_value, timestamp, IP address.              |
| Rate Limiting                    | Login endpoint: maximum 5 attempts per minute per IP. API endpoints: maximum 100 requests per minute per business. Exceeded limits return 429 Too Many Requests.                     |
| Input Validation                 | All user input is validated and sanitised at the API layer before touching the database. SQL injection and XSS attacks are prevented at this stage.                                  |
| Multi-Tenancy Isolation          | Every database query is scoped to the authenticated user's business_id. No query can access another business's data regardless of the endpoint called.                               |
| AI Data Privacy                  | Only aggregated statistical data is sent to external AI APIs. Customer names, phone numbers, NIDs, and financial records are never included in AI prompts.                           |

## 13.5 Offline Mode & Data Synchronisation

In Uganda, internet connectivity is not always stable, especially in areas outside Kampala CBD. Meka POS must continue working when the internet goes down and sync automatically when the connection is restored. The system already has an Offline & Desktop item in the SYSTEM menu, and the technical implementation must support this properly.

| Scenario                       | Required Behaviour                                                                                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Internet goes down mid-session | POS Terminal continues accepting sales. Data is written to a local IndexedDB store in the browser or SQLite on the desktop app.                                                   |
| New sale while offline         | Sale is saved locally with a sync_status of 'pending'. A sync queue is maintained in order.                                                                                       |
| Internet restored              | Background sync service processes the pending queue and pushes all offline records to the server in chronological order.                                                          |
| Conflict resolution            | If the same product was sold at two tills (one offline, one online) and stock runs out, the server resolves the conflict using timestamp-based priority and notifies the manager. |
| Product list while offline     | Products, prices, and categories are cached locally on login. Cache is refreshed on every successful connection.                                                                  |
| Reports while offline          | Reports show cached data with a notice: 'Showing data last synced at 09:14 AM. Reconnect to refresh.'                                                                             |
| AI Assistant while offline     | AI Assistant is disabled with a notice. Smart Insights shows the last cached analysis.                                                                                            |

## 13.6 Performance & Scalability

The system must be fast even as the business grows, more products, more branches, more customers, more transactions. Performance must be designed in from the start, not optimised as an afterthought.

- Database indexing: every column used in a WHERE clause, JOIN, or ORDER BY must be indexed. Start with: business_id, branch_id, customer_id, product_id, created_at on all high-traffic tables.
- Query optimisation: avoid N+1 queries, use JOINs and batch fetches. A page showing 50 orders must not make 50 separate database calls.
- Pagination: all list views must use cursor-based or offset pagination, never load all records at once.
- Caching: dashboard stats, product lists, and frequently read reports are cached in Redis with a TTL (time to live) of 5 to 60 minutes depending on how often the data changes.
- Background processing: heavy tasks like AI insight generation, report exports, and bulk email sends are processed in a background job queue, never in the main API request cycle.
- CDN: product images and exported PDFs are served from a CDN (Content Delivery Network) to reduce server load and improve load times.
- Horizontal scaling: the backend must be stateless so that multiple server instances can run simultaneously behind a load balancer as traffic grows.

## 13.7 Infrastructure & Deployment

The system needs a reliable hosting environment that is affordable, scalable, and has low latency for East African users.

| Component              | Recommended Service                                        | Notes                                                                      |
| ---------------------- | ---------------------------------------------------------- | -------------------------------------------------------------------------- |
| Backend Hosting        | Railway, Render, or AWS EC2                                | Railway and Render are simpler to manage for early stage. AWS for scale.   |
| Database               | Supabase (managed PostgreSQL) or AWS RDS                   | Supabase gives a managed Postgres with a built-in dashboard and free tier. |
| Redis Cache            | Upstash Redis                                              | Serverless Redis, pay per request, very low cost at early stage.           |
| File Storage           | Cloudflare R2 or AWS S3                                    | R2 has no egress fees, cheaper for African traffic patterns.               |
| Email                  | SendGrid or Mailgun                                        | Both have free tiers sufficient for early stage.                           |
| Domain & SSL           | Cloudflare                                                 | Free SSL, DDoS protection, and DNS management.                             |
| Monitoring             | Sentry (error tracking) + Grafana or Datadog (performance) | Know when something breaks before a customer reports it.                   |
| CI/CD Pipeline         | GitHub Actions                                             | Automated testing and deployment on every code push.                       |
| Environment Management | Separate Dev, Staging, and Production environments         | Never test on live data. Staging mirrors Production exactly.               |

## 13.8 Testing Strategy

Every feature must be tested before it is released. In a POS system, bugs in payment processing, stock calculations, or balance updates have direct financial consequences for the business. Testing is not optional.

| Test Type                     | What It Covers                                                                                                                           | When It Runs                               |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| Unit Tests                    | Individual functions and calculations, e.g. balance formula, tax calculations, stock deduction logic                                     | On every code commit (automated via CI/CD) |
| Integration Tests             | API endpoints, does POST /sales correctly deduct stock, create a payment record, and update the customer balance all in one transaction? | On every pull request (automated)          |
| End-to-End (E2E) Tests        | Full user flows through the UI, e.g. open till, make a sale, apply credit, close till, check cash reconciliation                         | Before every release to staging            |
| Load Testing                  | How does the system perform with 50 simultaneous POS terminals? At what point does it slow down?                                         | Before major releases                      |
| Offline Sync Testing          | Simulate internet dropout during a sale. Verify data integrity after reconnection.                                                       | Before every release                       |
| UAT (User Acceptance Testing) | Real users (cashiers, managers, accountants) test the system against real business scenarios in a staging environment                    | Before every production release            |
| Security Testing              | Penetration testing, attempt SQL injection, broken access control, and token manipulation                                                | Quarterly or before major releases         |
