# Sunshine Garage — Management System

A full-stack garage management web portal built with the MERN stack. Manage jobcards, customers, inventory, staff, billing, and reports — all in one place.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| State | Zustand |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Backend | Node.js + Express |
| Database | MongoDB + Mongoose |
| Auth | JWT (access tokens) |
| File Upload | Multer |
| PDF | PDFKit |

---

## Prerequisites

Make sure you have the following installed:

- [Node.js](https://nodejs.org/) v18 or higher
- [MongoDB](https://www.mongodb.com/try/download/community) running locally on port `27017`
- npm v9+

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/fronteddevops/sunshine-garage-solution.git
cd sunshine-garage-solution
```

### 2. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 3. Configure environment variables

```bash
cd server
cp .env.example .env
```

Edit `server/.env`:

```env
PORT=5001
MONGO_URI=mongodb://localhost:27017/sunshine-garage
JWT_SECRET=your_strong_secret_here
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

> **Note for macOS users:** Port 5000 is reserved by AirPlay Receiver. Use port `5001`.

### 4. Seed demo data

Run once to create a demo account and populate all master data:

```bash
cd server
node utils/createDemo.js
node utils/seedStaffAndSpares.js
```

Demo login credentials:

| Field | Value |
|---|---|
| Mobile | `9999999999` |
| Password | `demo123` |

---

## Running the App

Open **two terminals**:

### Terminal 1 — Backend

```bash
cd server
npm run dev
```

API runs at → `http://localhost:5001`

### Terminal 2 — Frontend

```bash
cd client
npm run dev
```

App runs at → `http://localhost:5173`

> Vite automatically proxies all `/api` requests to the backend.

---

## Project Structure

```
sunshine-garage/
├── client/                        # React + Vite frontend
│   ├── src/
│   │   ├── api/                   # Axios API call wrappers
│   │   ├── components/
│   │   │   ├── Layout/            # Sidebar, Topbar, AppLayout
│   │   │   └── ui/                # Button, Input, Modal, Toast, Badge
│   │   ├── pages/
│   │   │   ├── auth/              # Login & Signup pages
│   │   │   ├── dashboard/         # Dashboard with charts
│   │   │   ├── jobcards/          # Jobcard list + create/edit form
│   │   │   ├── masters/           # Masters CRUD
│   │   │   └── staff/             # Staff management
│   │   ├── store/                 # Zustand stores (auth, toast)
│   │   └── utils/                 # Formatters and helpers
│   ├── index.html
│   ├── vite.config.js
│   └── tailwind.config.js
│
└── server/                        # Node.js + Express backend
    ├── config/db.js               # MongoDB connection
    ├── controllers/               # Request handlers
    ├── middleware/
    │   ├── auth.js                # JWT auth middleware
    │   └── upload.js              # Multer file upload
    ├── models/
    │   ├── Garage.js              # Garage (owner) model
    │   ├── Customer.js
    │   ├── Jobcard.js
    │   └── masters/               # JobcardType, VehicleMake, Staff, etc.
    ├── routes/                    # Express route definitions
    ├── utils/
    │   ├── seedData.js            # Default masters seeder
    │   ├── createDemo.js          # Demo account creator
    │   ├── seedStaffAndSpares.js  # Sample staff + spare parts
    │   └── jobcardNumber.js       # Auto jobcard number generator
    └── index.js                   # App entry point
```

---

## Features

| Module | Details |
|---|---|
| **Auth** | Register with 2-step OTP + Login with JWT |
| **Dashboard** | Revenue/purchase/balance cards, revenue line chart (weekly/monthly/6-month), vehicle make pie chart, closed jobcards bar chart |
| **Jobcards** | Create/edit with customer search, fuel slider, Labour/Spare/Lube line items, dent marks diagram, billing & transactions, PDF invoice |
| **Masters** | CRUD for jobcard types, statuses, vehicle makes/models, labour items, spare parts, lubes, customer voice, service packages |
| **Staff** | Manage mechanics & supervisors — auto-populate jobcard dropdowns |
| **Customers** | Search by name/mobile/vehicle number, inline creation with brand/model dropdowns |
| **PDF Invoice** | Auto-generated invoice per jobcard via PDFKit |
| **Multi-tenancy** | All data is scoped to `garageId` — each garage only sees its own data |

---

## API Reference

### Auth
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Register garage (sends OTP) |
| `POST` | `/api/auth/verify-otp` | Verify OTP + complete signup |
| `POST` | `/api/auth/login` | Login with mobile + password |
| `GET` | `/api/auth/me` | Get current logged-in garage |
| `POST` | `/api/auth/logout` | Logout |

### Dashboard
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Revenue, purchase, balance totals |
| `GET` | `/api/dashboard/revenue-chart?period=weekly` | Line chart data |
| `GET` | `/api/dashboard/vehicle-make` | Pie chart data |
| `GET` | `/api/dashboard/closed-jobcards` | Bar chart data |

### Masters
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/masters/:entity` | List all records |
| `POST` | `/api/masters/:entity` | Create a record |
| `PUT` | `/api/masters/:entity/:id` | Update a record |
| `DELETE` | `/api/masters/:entity/:id` | Soft delete |

Valid `:entity` values: `jobcard-types` · `jobcard-statuses` · `vehicle-makes` · `vehicle-models` · `labour` · `spares` · `lubes` · `customer-voice` · `staff` · `packages`

### Jobcards
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/jobcards` | List (supports filter, search, pagination) |
| `POST` | `/api/jobcards` | Create |
| `GET` | `/api/jobcards/:id` | Get detail |
| `PUT` | `/api/jobcards/:id` | Update |
| `DELETE` | `/api/jobcards/:id` | Soft delete |
| `GET` | `/api/jobcards/:id/pdf` | Download PDF invoice |
| `POST` | `/api/jobcards/:id/photos` | Upload photos |

### Customers
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/customers/search?q=` | Search by name/mobile/vehicle |
| `POST` | `/api/customers` | Create customer |
| `PUT` | `/api/customers/:id` | Update customer |

---

## Building for Production

```bash
# Build frontend
cd client
npm run build
# Output: client/dist/

# Serve static files from Express (optional)
# Point Express to serve client/dist/ as static

# Start backend in production
cd server
NODE_ENV=production node index.js
```

---

## License

MIT
