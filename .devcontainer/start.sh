#!/bin/bash

(
    cd /opt/zen-mcp-server
    if yes Y | /opt/zen-mcp-server/run-server.sh; then
        echo "Zen MCP server setup completed successfully."
    else
        echo "WARNING: Zen MCP server setup encountered issues but continuing..."
    fi
)

npx playwright install-deps
npx playwright install