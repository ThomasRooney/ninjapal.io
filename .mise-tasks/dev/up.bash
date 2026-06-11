#!/usr/bin/env bash

# Start all development services using overmind

set -e

# Check if overmind is installed
if ! command -v overmind &> /dev/null; then
    echo "❌ overmind is not installed. Please run './zero' to set up your development environment."
    exit 1
fi

# Create a temporary Procfile if it doesn't exist
PROCFILE_DEV="Procfile.dev"

if [ ! -f "$PROCFILE_DEV" ]; then
    echo "📝 Creating Procfile.dev..."
    cat > "$PROCFILE_DEV" << 'EOF'
# Development services managed by overmind
web: mise run dev:frontend
api: mise run dev:supabase
cache: mise run dev:cache
email: mise run dev:email
EOF
fi

# Start overmind with all services
echo "🚀 Starting all development services..."
echo "   Press Ctrl+C to stop all services"
echo

exec overmind start -f "$PROCFILE_DEV"