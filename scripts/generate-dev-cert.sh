#!/bin/bash
# Bash Script to Generate Development SSL Certificates using mkcert
# This script creates local SSL certificates for development

set -e

DOMAIN="${1:-localhost}"
ADDITIONAL_DOMAINS="${2:-myapp.local 127.0.0.1}"

echo "========================================"
echo "Development SSL Certificate Generator"
echo "========================================"
echo ""

# Check if mkcert is installed
echo "Checking for mkcert installation..."
if ! command -v mkcert &> /dev/null; then
    echo "ERROR: mkcert is not installed!"
    echo ""
    echo "Please install mkcert first:"
    echo "  Linux: sudo apt install libnss3-tools && wget -O mkcert https://github.com/FiloSottile/mkcert/releases/latest/download/mkcert-v1.4.4-linux-amd64"
    echo "  macOS: brew install mkcert"
    echo ""
    echo "After installation, run: mkcert -install"
    exit 1
fi

echo "✓ mkcert found"
echo ""

# Check if local CA is installed
echo "Checking if local CA is installed..."
if mkcert -CAROOT &> /dev/null; then
    CA_ROOT=$(mkcert -CAROOT)
    echo "✓ Local CA is installed"
    echo "  CA Root: $CA_ROOT"
else
    echo "⚠ Local CA might not be installed"
    echo ""
    echo "Installing local CA..."
    mkcert -install
    echo "✓ Local CA installed successfully"
fi

echo ""

# Create certs directory structure
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERTS_DIR="$SCRIPT_DIR/../certs/dev"
mkdir -p "$CERTS_DIR"
echo "✓ Created directory: $CERTS_DIR"

# Generate certificate
echo "Generating SSL certificate for: $DOMAIN"
cd "$CERTS_DIR"

# Remove old certificates if they exist
rm -f "$DOMAIN.pem" "$DOMAIN-key.pem"

# Generate certificate
mkcert -cert-file "$DOMAIN.pem" -key-file "$DOMAIN-key.pem" $DOMAIN $ADDITIONAL_DOMAINS

if [ $? -eq 0 ]; then
    echo "✓ Certificate generated successfully!"
    echo ""
    echo "Certificate files:"
    echo "  Certificate: $CERTS_DIR/$DOMAIN.pem"
    echo "  Private Key: $CERTS_DIR/$DOMAIN-key.pem"
    echo ""
    echo "Domains covered:"
    echo "  - $DOMAIN"
    for domain in $ADDITIONAL_DOMAINS; do
        echo "  - $domain"
    done
else
    echo "ERROR: Failed to generate certificate"
    exit 1
fi

# Generate certificate for custom domain (myapp.local)
if [[ "$ADDITIONAL_DOMAINS" == *"myapp.local"* ]]; then
    echo ""
    echo "Generating SSL certificate for: myapp.local"
    rm -f "myapp.local.pem" "myapp.local-key.pem"
    mkcert -cert-file "myapp.local.pem" -key-file "myapp.local-key.pem" "myapp.local" "*.local"
    
    if [ $? -eq 0 ]; then
        echo "✓ Custom domain certificate generated!"
    fi
fi

echo ""
echo "========================================"
echo "Certificate generation complete!"
echo "========================================"
echo ""
echo "Next steps:"
echo "1. Update your hosts file (optional for myapp.local):"
echo "   Add: 127.0.0.1 myapp.local"
echo "2. Start the application with HTTPS:"
echo "   ./scripts/start-dev-https.sh"
echo "3. Access the app at: https://localhost"
echo ""

