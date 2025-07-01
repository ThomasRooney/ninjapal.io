# ninjapal.io

Real-time BBQ & smoker monitoring for the perfect cook, every time.

## What is Ninja Pal?

Ninja Pal is a web application that connects to your BBQ smoker for remote monitoring and control. Track temperatures, get alerts, and review your cook history - all from your phone or computer.

## Key Features

- **Real-Time Monitoring** - Live temperature tracking for grill and multiple probes
- **Temperature Charts** - Visual graphs showing temperature trends over time  
- **Smart Alerts** - Notifications when target temps are reached or device goes offline
- **Cook Controls** - Start/stop cooks, adjust temperatures, and switch cooking modes
- **Cook History** - Log every session with CSV export capability
- **Multi-Device Support** - Manage multiple smokers from one dashboard

## Tech Stack

- **Frontend**: React + TanStack Router
- **Backend**: Supabase (PostgreSQL)
- **Real-time**: Zero Sync
- **ORM**: Drizzle
- **UI**: Tailwind CSS + shadcn/ui
- **Runtime**: Bun

## Quick Start

### Local Development

```bash
# Clone and install
git clone https://github.com/your-username/ninjapal.io.git
cd ninjapal.io
bun install

# Setup environment
cp .env.local.example .env

# Start local services
bun supabase:start
bun db:push
bun zero-cache    # In a new terminal

# Start development
bun dev
```

Visit http://localhost:3000

### Using Cloud Supabase

```bash
# Setup environment
cp .env.cloud.example .env
# Add your Supabase project URL and anon key to .env

# Initialize database
bun db:push

# Start services
bun zero-cache    # In a new terminal
bun dev
```

## Development Commands

```bash
# Database
bun db:push          # Push schema changes
bun db:seed          # Reset and seed database  
bun db:studio        # Open Drizzle Studio

# Development
bun dev              # Start dev server
bun build            # Build for production
bun check            # Run linter/formatter

# Supabase (local)
bun supabase:start   # Start local Supabase
bun supabase:stop    # Stop local Supabase
bun supabase:reset   # Reset database
```
