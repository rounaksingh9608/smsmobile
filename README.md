# SocioHub

SocioHub is a residential society management platform that helps apartment communities manage residents, maintenance, notices, visitors, billing, and amenities — all in one place, with a web dashboard and a mobile app.

## Features

- **Resident Management** — Onboard residents, manage flat/unit details, and maintain household member records.
- **Complaints & Maintenance** — Residents raise maintenance requests/complaints; admins track status and resolution.
- **Notices & Announcements** — Society admins broadcast notices, event updates, and circulars to all residents.
- **Visitor Management** — Log and approve visitor/guest entries, with pre-approval support.
- **Billing & Payments** — Generate and track maintenance bills, dues, and payment history.
- **Amenity Booking** — Reserve shared amenities (clubhouse, gym, parking, etc.) with slot management.
- **Admin Dashboard** — Centralized web dashboard for society committee members to manage operations.
- **Mobile App** — Native mobile experience for residents via Expo (iOS & Android).

## Tech Stack

| Layer            | Technology              |
|-------------------|--------------------------|
| Web Frontend      | Next.js, React           |
| Mobile App        | Expo (React Native)      |
| Backend/API       | Next.js API routes       |
| Database          | PostgreSQL               |
| ORM               | Prisma                   |

## Project Structure

```
sociohub/
├── apps/
│   ├── web/          # Next.js web app (resident portal + admin dashboard)
│   └── mobile/        # Expo React Native app
├── packages/
│   ├── database/      # Prisma schema, migrations, and client
│   └── shared/         # Shared types/utilities across web & mobile
├── prisma/
│   └── schema.prisma
└── README.md
```

> Adjust this structure to match your actual repo layout (e.g. if using a monorepo tool like Turborepo/Nx, or a simpler single-app layout).

## Getting Started

### Prerequisites

- Node.js (v18+)
- npm / pnpm / yarn
- PostgreSQL instance (local or hosted, e.g. Supabase, Railway, Neon)
- Expo CLI (`npm install -g expo-cli`) for mobile development

### 1. Clone the repository

```bash
git clone https://github.com/<your-username>/sociohub.git
cd sociohub
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root (and/or in `apps/web`) with:

```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 4. Set up the database

```bash
npx prisma migrate dev
npx prisma generate
```

### 5. Run the web app

```bash
cd apps/web
npm run dev
```

The app will be available at `http://localhost:3000`.

### 6. Run the mobile app

```bash
cd apps/mobile
npx expo start
```

Scan the QR code with the Expo Go app, or run on a simulator/emulator.

## Scripts

| Command                  | Description                          |
|---------------------------|----------------------------------------|
| `npm run dev`              | Start the Next.js dev server         |
| `npx prisma studio`        | Open Prisma Studio to inspect data   |
| `npx prisma migrate dev`   | Run database migrations              |
| `npx expo start`           | Start the Expo development server    |

## Roadmap

- [ ] Push notifications for notices and approvals
- [ ] Online payment gateway integration
- [ ] Role-based access control (Admin / Committee / Resident / Security)
- [ ] Visitor pre-approval via QR code

## Contributing

Contributions are welcome! Please open an issue or submit a pull request with a clear description of your changes.

## License

This project is licensed under the MIT License.
