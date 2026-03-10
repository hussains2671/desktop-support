#!/bin/bash
# Build MSI Installer Script for Desktop Support Agent (Linux/WSL)
# Requires: WiX Toolset v3.11+ installed

set -e

CONFIGURATION="${1:-Release}"
OUTPUT_PATH="./bin/$CONFIGURATION"

echo "Building Desktop Support Agent MSI Installer..."

# Check if WiX is installed
if ! command -v candle &> /dev/null; then
    echo "ERROR: WiX Toolset not found!"
    echo "Please install WiX Toolset from: https://wixtoolset.org/releases/"
    exit 1
fi

# Build the service project first
echo "Building service project..."
cd ../DesktopSupportAgent.Service

dotnet build -c $CONFIGURATION
if [ $? -ne 0 ]; then
    echo "ERROR: Service build failed!"
    exit 1
fi

dotnet publish -c $CONFIGURATION -o publish
if [ $? -ne 0 ]; then
    echo "ERROR: Service publish failed!"
    exit 1
fi

cd ../DesktopSupportAgent.Installer

# Create output directory
mkdir -p "$OUTPUT_PATH"

# Compile WiX source
echo "Compiling WiX source..."
WIX_SOURCE="Product.wxs"
WIX_OBJ="$OUTPUT_PATH/Product.wixobj"

candle -out "$WIX_OBJ" "$WIX_SOURCE"
if [ $? -ne 0 ]; then
    echo "ERROR: WiX compilation failed!"
    exit 1
fi

# Link WiX object
echo "Linking MSI..."
MSI_PATH="$OUTPUT_PATH/DesktopSupportAgent.msi"

light -out "$MSI_PATH" "$WIX_OBJ"
if [ $? -ne 0 ]; then
    echo "ERROR: MSI linking failed!"
    exit 1
fi

echo ""
echo "MSI Installer built successfully!"
echo "Output: $MSI_PATH"
echo ""
echo "To install silently:"
echo "  msiexec /i \"$MSI_PATH\" /quiet /norestart"

