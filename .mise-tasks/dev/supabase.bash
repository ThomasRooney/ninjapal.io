#!/usr/bin/env bash

# Supabase development wrapper script
# Ensures proper cleanup of Docker containers on exit

set -e

# Function to run on exit
cleanup() {
    echo
    echo "🛑 Shutting down Supabase..."
    # Use timeout to prevent hanging if supabase stop doesn't respond
    timeout 30s bun supabase:stop || {
        echo "⚠️  Supabase stop timed out. You may need to manually stop containers."
        echo "   Run: docker ps | grep supabase"
        echo "   Then: docker stop <container_ids>"
    }
    echo "✅ Supabase stopped"
    exit 0
}

# Trap termination signals for cleanup
trap cleanup SIGTERM SIGINT EXIT

# Start Supabase
echo "🚀 Starting Supabase..."
bun supabase:start

# Check if Supabase started successfully
if [ $? -ne 0 ]; then
    echo "❌ Failed to start Supabase"
    exit 1
fi

echo "✅ Supabase is running"
echo "   Studio: http://localhost:54323"
echo "   API URL: http://localhost:54321"
echo "   DB URL: postgresql://postgres:postgres@localhost:54322/postgres"
echo
echo "Press Ctrl+C to stop..."

# Keep the script running and wait for signals
# This is necessary for overmind to manage the process properly
while true; do
    sleep 1
done