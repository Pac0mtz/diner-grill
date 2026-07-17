# Diner Grill Website

A restaurant website for "Diner Grill" — the 24-hour counter diner on Irving Park Road in Chicago's Lakeview neighborhood (Est. 1937).

## Stack

- **React 19** + **TypeScript** + **Vite 7**
- **Tailwind CSS v3** with a custom shadcn theme
- **shadcn/ui** component library (40+ components in `src/components/ui/`)
- **React Router v7** for client-side routing

## Pages

| Route | File | Description |
|-------|------|-------------|
| `/` | `src/pages/Home.tsx` | Landing page with hero, gallery, marquee, and CTA |
| `/story` | `src/pages/StoryPage.tsx` | Restaurant history and story |
| `/menu` | `src/pages/MenuPage.tsx` | Full menu listing |
| `/visit` | `src/pages/VisitPage.tsx` | Location, hours, and contact info |
| `/order` | `src/pages/OrderPage.tsx` | Online ordering with Stripe payments |
| `/admin` | `src/pages/AdminPage.tsx` | Staff dashboard (orders, menu, settings) — requires `ADMIN_TOKEN` |

## Running the app

```bash
npm run dev:all   # Start API server (port 8787) + Vite dev server (port 5000)
npm run build     # Production build
npm run seed      # Seed the SQLite database
```

The dev workflow is configured as **"Start application"** (`npm run dev:all`). Vite proxies `/api` to the Express server on port 8787.

## Database

Uses Replit's built-in PostgreSQL (`DATABASE_URL`). Tables are created automatically at server startup (`server/db.js`) and the menu auto-seeds when empty. Admin login uses the `admin_users` table (bcrypt password hashes) with session tokens in `admin_sessions`. Create/update admin users with:

```bash
node server/create-admin.js <username> <password>
```

## Environment variables (see .env.example)

- `ADMIN_TOKEN` — optional static token for the print agent / automation (admin dashboard uses username/password)
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `VITE_STRIPE_PK` — without these, ordering shows a "call to order" fallback
- `PRINTER_IP`, `PRINTER_DEVICE_ID` — Epson receipt printer (restaurant LAN)

## Project structure

```
src/
  pages/       # Top-level page components
  sections/    # Page section components (Hero, Navbar, Footer, etc.)
  components/  # shadcn/ui component library
  data/        # Static data (menu items, etc.)
  hooks/       # Custom React hooks
  lib/         # Utility functions
```

## User preferences

<!-- Add user preferences here -->
