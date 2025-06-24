#!/bin/bash

(
    cd /opt/zen-mcp-server
    if yes Y | /opt/zen-mcp-server/run-server.sh; then
        echo "Zen MCP server setup completed successfully."
    else
        echo "WARNING: Zen MCP server setup encountered issues but continuing..."
    fi
)

yes | npx playwright install-deps
yes | npx playwright install
curl -fsSL https://bun.sh/install | bash