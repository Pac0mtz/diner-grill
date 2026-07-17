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

## Running the app

```bash
npm run dev       # Start dev server on port 5000
npm run build     # Production build
npm run preview   # Preview production build
```

The dev workflow is configured as **"Start application"** (`npm run dev`).

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
