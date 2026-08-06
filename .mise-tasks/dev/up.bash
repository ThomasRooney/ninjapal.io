#!/usr/bin/env bash

# Start all development services with pitchfork (config: pitchfork.toml)

set -e

if ! command -v pitchfork &> /dev/null; then
    echo "❌ pitchfork is not installed. Run 'mise install' first."
    exit 1
fi

echo "🚀 Starting all development services (pitchfork)..."
pitchfork start --all

echo
pitchfork list
echo
echo "   Logs:   pitchfork logs <web|db|cache|email|worker> --tail"
echo "   TUI:    pitchfork tui"
echo "   Stop:   mise run stop"
