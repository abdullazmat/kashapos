# KashaPOS — Cloud-Based SaaS POS Platform

A multi-tenant Point of Sale system built with Next.js, MongoDB, and Tailwind CSS. Supports Retail POS, Pharmacy POS, and Clinic POS business types.

## Features

- **Multi-Tenant Architecture** — Each business gets isolated data with tenant-scoped queries
- **POS Terminal** — Full-featured point of sale with barcode scanning, cart, and multiple payment methods (Cash, Card, MTN Mobile Money, Airtel Money)
- **Inventory Management** — Product CRUD, categories, stock tracking per branch
- **Sales Management** — Sales history, filtering, detail views
- **Purchase Orders** — Vendor management, purchase order creation and tracking
- **Customer & Vendor Management** — CRM with purchase history
- **Stock Management** — Stock levels, adjustments, low-stock alerts
- **Invoicing** — Invoice generation and status tracking
- **Reports & Analytics** — Sales trends, top products, inventory reports
- **Role-Based Access** — Admin, Manager, Cashier roles with route protection
- **Multi-Branch Support** — Manage multiple business locations

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Database:** MongoDB with Mongoose ODM
- **Auth:** JWT via `jose` (edge-compatible)
- **Styling:** Tailwind CSS 4 with shadcn-style components
- **Icons:** Lucide React
- **Language:** TypeScript

## Getting Started

### Prerequisites

- Node.js 18+
- MongoDB Atlas account (or local MongoDB)

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy `.env.example` to `.env.local` and fill in your values:
   ```bash
   cp .env.example .env.local
   ```
4. Set your MongoDB connection string and JWT secret in `.env.local`
5. Start the development server:
   ```bash
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

| Variable               | Description                               |
| ---------------------- | ----------------------------------------- |
| `MONGODB_URI`          | MongoDB connection string                 |
| `JWT_SECRET`           | Secret key for JWT signing (min 32 chars) |
| `NEXT_PUBLIC_BASE_URL` | Base URL of the app                       |

### Seed Data

Visit `/api/seed` (POST) to populate demo data for testing.

## Project Structure

```
src/
├── app/
│   ├── api/           # API routes (auth, products, sales, etc.)
│   ├── dashboard/     # Dashboard pages (POS, inventory, reports, etc.)
│   ├── sign-in/       # Authentication pages
│   └── sign-up/
├── components/ui/     # Reusable UI components (shadcn-style)
├── lib/               # Utilities (auth, db, helpers)
└── models/            # Mongoose models (14 models)
```

## Deployment

Designed for deployment on **Render** (or any Node.js hosting):

1. Set environment variables in your hosting dashboard
2. Build command: `npm run build`
3. Start command: `npm start`

## Technical Design Docs

- Phase 2 System Architecture & Technical Design: `SYSTEM_ARCHITECTURE_PHASE2.md`
