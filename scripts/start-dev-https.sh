#!/bin/bash
# Bash Script to Start Development Environment with HTTPS
# This script starts docker-compose with HTTPS enabled

set -e

SKIP_CERT_CHECK=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --skip-cert-check)
            SKIP_CERT_CHECK=true
            shift
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "========================================"
echo "Starting Development Environment (HTTPS)"
echo "========================================"
echo ""

# Check if certificates exist
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/../certs/dev"
CERT_PATH="$CERTS_DIR/localhost.pem"
KEY_PATH="$CERTS_DIR/localhost-key.pem"

if [ "$SKIP_CERT_CHECK" = false ]; then
    if [ ! -f "$CERT_PATH" ] || [ ! -f "$KEY_PATH" ]; then
        echo "⚠ SSL certificates not found!"
        echo ""
        echo "Generating certificates..."
        "$SCRIPT_DIR/generate-dev-cert.sh"
        
        if [ $? -ne 0 ]; then
            echo "ERROR: Failed to generate certificates"
            exit 1
        fi
        echo ""
    else
        echo "✓ SSL certificates found"
    fi
else
    echo "⚠ Skipping certificate check"
fi

# Check if docker-compose is available
echo ""
echo "Checking Docker..."
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: docker-compose is not installed or not in PATH"
    exit 1
fi

echo "✓ Docker and docker-compose found"

# Set environment variables for HTTPS mode
export ENVIRONMENT=dev
export USE_HTTPS=true

echo ""
echo "Starting services with HTTPS..."
echo ""

# Change to project root
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Start docker-compose with HTTPS configuration
docker-compose -f docker-compose.yml -f docker-compose.https.yml up -d

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================"
    echo "Services started successfully!"
    echo "========================================"
    echo ""
    echo "Access your application:"
    echo "  Frontend: https://localhost"
    echo "  API:      https://localhost/api"
    echo ""
    echo "Note: You may see a browser warning about the certificate."
    echo "This is normal for development certificates. Click 'Advanced' and 'Proceed'."
    echo ""
    echo "To view logs:"
    echo "  docker-compose logs -f"
    echo ""
    echo "To stop services:"
    echo "  docker-compose down"
else
    echo ""
    echo "ERROR: Failed to start services"
    echo "Check the logs: docker-compose logs"
    exit 1
fi

