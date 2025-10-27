# Database Setup Guide

This folder contains all SQL scripts needed to set up the delivery management application database in Supabase.

## Quick Start

### Option 1: Run All Scripts at Once
Execute the master setup script in the Supabase SQL Editor:
\`\`\`sql
-- Copy and paste the contents of 00_master_setup.sql
\`\`\`

### Option 2: Run Scripts Individually
Execute each script in order (001 through 011) in the Supabase SQL Editor.

## Database Schema Overview

### Core Tables

1. **profiles** - User profiles with role-based access (admin/driver)
2. **orders** - Delivery orders with customer information and geocoding
3. **routes** - Delivery routes assigned to drivers
4. **pods** - Proof of delivery records (photos, signatures, notes)
5. **stop_events** - Event tracking for delivery attempts
6. **route_stops** - Optimized stop sequences for routes
7. **driver_positions** - Real-time driver location tracking
8. **pod_emails** - Email notification tracking for deliveries

### Key Features

- **Row Level Security (RLS)** - All tables have RLS policies for secure multi-tenant access
- **Role-based Access** - Admin and driver roles with appropriate permissions
- **Geocoding Support** - Address geocoding with HERE Maps API
- **Route Optimization** - VRP (Vehicle Routing Problem) fields for advanced routing
- **Real-time Tracking** - Driver position updates with upsert function
- **Email Notifications** - POD email tracking with idempotency
- **Audit Trails** - Timestamps and event logging

## Script Execution Order

| Script | Description |
|--------|-------------|
| 001_create_tables.sql | Create core tables (profiles, orders, routes, pods, stop_events) |
| 002_enable_rls.sql | Enable Row Level Security and create policies |
| 003_create_profile_trigger.sql | Auto-create profile on user signup |
| 004_add_geocoding_columns.sql | Add geocoding metadata to orders |
| 005_add_vrp_fields.sql | Add Vehicle Routing Problem fields |
| 006_add_global_routing_fields.sql | Add global routing fields and route_stops table |
| 007_create_driver_positions.sql | Create driver position tracking |
| 009_route_metrics.sql | Add route performance metrics |
| 010_pod_emails_idempotency.sql | Create POD email tracking table |
| 011_require_customer_email.sql | Make customer email required |

## Environment Variables Required

\`\`\`env
# Supabase (automatically set by integration)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# HERE Maps API (for geocoding)
HERE_API_KEY=your_here_api_key
NEXT_PUBLIC_HERE_API_KEY=your_here_api_key

# SendGrid (for email notifications)
SENDGRID_API_KEY=your_sendgrid_api_key
DELIVERY_FROM_EMAIL=noreply@yourdomain.com

# Feature Flags
NEXT_PUBLIC_ENABLE_POD_EMAIL=true
NEXT_PUBLIC_ENABLE_ROUTE_METRICS=true
NEXT_PUBLIC_ENABLE_DISPATCH_MAP=true
\`\`\`

## Testing the Setup

After running the scripts, verify the setup:

1. Check that all tables exist:
\`\`\`sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
\`\`\`

2. Verify RLS is enabled:
\`\`\`sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
\`\`\`

3. Check policies:
\`\`\`sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public';
\`\`\`

## Troubleshooting

### Issue: "relation already exists"
- This is normal if you're re-running scripts. All scripts use `IF NOT EXISTS` or `IF EXISTS` clauses.

### Issue: RLS policy conflicts
- Script 002 drops all existing policies before creating new ones.

### Issue: Foreign key violations
- Ensure scripts are run in order (001 → 011).

## Maintenance

### Adding New Migrations
1. Create a new file: `012_your_migration_name.sql`
2. Use idempotent SQL (IF NOT EXISTS, IF EXISTS)
3. Update this README with the new script
4. Update `00_master_setup.sql` to include the new script

### Backing Up Data
\`\`\`sql
-- Export orders
COPY (SELECT * FROM orders) TO '/tmp/orders_backup.csv' CSV HEADER;

-- Export routes
COPY (SELECT * FROM routes) TO '/tmp/routes_backup.csv' CSV HEADER;
