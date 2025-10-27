# Delivery Management App

A full-stack delivery management system built with Next.js, Supabase, and HERE Maps.

## Features

- **Role-based Authentication**: Separate admin and driver interfaces
- **Order Management**: CRUD operations with CSV import and geocoding
- **Route Optimization**: HERE Tour Planning API with local fallback algorithms
- **Interactive Maps**: Real-time route visualization with HERE Maps
- **Proof of Delivery**: Photo capture, signatures, and notes
- **Label Printing**: 4×6 thermal labels with QR codes

## Tech Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth)
- **Maps & Routing**: HERE Maps Platform
- **Storage**: Vercel Blob (POD photos/signatures)
- **UI Components**: shadcn/ui

## Environment Variables

Required environment variables:

\`\`\`env
# Supabase (auto-configured in v0)
SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_ANON_KEY=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Vercel Blob (auto-configured in v0)
BLOB_READ_WRITE_TOKEN=

# HERE Maps Platform (server-side only for security)
HERE_API_KEY=your_here_api_key
\`\`\`

### Getting HERE Maps API Keys

1. Sign up at [HERE Developer Portal](https://developer.here.com/)
2. Create a new project
3. Generate API keys with the following permissions:
   - Geocoding & Search API
   - Routing API v8
   - Tour Planning API v3
   - Maps API for JavaScript
4. Add the `HERE_API_KEY` to your environment variables (server-side only)

## HERE Maps Integration

### Where HERE Maps is Used

1. **Geocoding** (`lib/geocoding.ts`)
   - Converts addresses to coordinates during order creation/import
   - Uses HERE Geocoding & Search v1 API
   - Fallback: Orders without coordinates are excluded from route optimization

2. **Route Optimization** (`lib/here/tour-planning.ts`)
   - Optimizes stop sequences using HERE Tour Planning API v3
   - Fallback: Nearest-neighbor + 2-opt algorithms (`lib/routing.ts`)
   - Triggered during route creation in admin interface

3. **Route Polylines** (`lib/here/routing.ts`)
   - Generates driving directions and ETAs using HERE Routing v8 API
   - Returns flexible polyline encoding for efficient map rendering
   - Used in route detail views

4. **Interactive Maps** (`components/here-map.tsx`)
   - Displays routes with markers and polylines
   - Uses HERE Maps API for JavaScript v3.1
   - Features:
     - Color-coded markers (blue=pending, green=delivered, red=failed)
     - Stop sequence numbers
     - Auto-fit bounds to show all stops
     - Navigation deep-links for drivers

### Switching Between HERE and Fallback

The app automatically falls back to local algorithms if HERE APIs are unavailable:

- **Route Optimization**: If HERE Tour Planning fails or times out, uses nearest-neighbor + optional 2-opt
- **Geocoding**: If HERE Geocoding fails, orders are marked as non-geocoded and excluded from routes
- **Maps**: If HERE Maps JS fails to load, shows error message

To force local algorithms only, remove the `HERE_API_KEY` environment variable.

## Database Setup

1. Visit `/setup` in your deployed app
2. Copy and run the SQL scripts in your Supabase SQL Editor:
   - Script 1: Create tables
   - Script 2: Enable Row Level Security
   - Script 3: Create profile trigger
3. Click "Test Connection" to verify setup

## Development

\`\`\`bash
# Install dependencies (handled automatically in v0)
npm install

# Run development server
npm run dev

# Build for production
npm run build
\`\`\`

## Deployment

Deploy to Vercel with one click from v0, or:

\`\`\`bash
vercel deploy
\`\`\`

Make sure to configure all environment variables in your Vercel project settings.

## License

MIT
