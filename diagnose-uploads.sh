#!/bin/bash

echo "================================"
echo "Image Upload Diagnostics"
echo "================================"
echo ""

# Check if files exist locally
echo "1. Checking if image files exist on disk..."
UPLOADS_DIR="/path/to/DRIVERHIRE/uploads"  # Change this to your actual path

if [ -d "$UPLOADS_DIR" ]; then
    echo "✓ Upload directory found: $UPLOADS_DIR"
    
    TOTAL_FILES=$(find "$UPLOADS_DIR" -type f | wc -l)
    echo "  Total files: $TOTAL_FILES"
    
    echo ""
    echo "  Files by category:"
    echo "    - Vehicles: $(find "$UPLOADS_DIR/vehicles" -type f 2>/dev/null | wc -l)"
    echo "    - Profiles: $(find "$UPLOADS_DIR/profiles" -type f 2>/dev/null | wc -l)"
    echo "    - Commissions: $(find "$UPLOADS_DIR/commissions" -type f 2>/dev/null | wc -l)"
else
    echo "✗ Upload directory not found at $UPLOADS_DIR"
    echo "  Update the script with correct path"
fi

echo ""
echo "2. Checking backend connectivity..."

# Test if backend responds
BACKEND_URL="http://45.13.132.210:3000"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_URL")

if [ "$HTTP_CODE" == "200" ]; then
    echo "✓ Backend responding: $BACKEND_URL (HTTP $HTTP_CODE)"
else
    echo "✗ Backend not responding properly (HTTP $HTTP_CODE)"
fi

echo ""
echo "3. Checking if uploads are being served from backend..."

# Try accessing an image from backend directly
TEST_IMAGE="1765435497633-747304095.jpeg"
BACKEND_IMAGE_URL="$BACKEND_URL/uploads/vehicles/$TEST_IMAGE"
BACKEND_IMAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BACKEND_IMAGE_URL")

if [ "$BACKEND_IMAGE_CODE" == "200" ]; then
    echo "✓ Image accessible from backend: HTTP $BACKEND_IMAGE_CODE"
    echo "  URL: $BACKEND_IMAGE_URL"
else
    echo "✗ Image NOT accessible from backend: HTTP $BACKEND_IMAGE_CODE"
fi

echo ""
echo "4. Checking if domain proxy is configured..."

# Test if domain serves uploads
DOMAIN_IMAGE_URL="https://carwithdriver.lk/uploads/vehicles/$TEST_IMAGE"
DOMAIN_IMAGE_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$DOMAIN_IMAGE_URL")

if [ "$DOMAIN_IMAGE_CODE" == "200" ]; then
    echo "✓ Image accessible from domain: HTTP $DOMAIN_IMAGE_CODE"
    echo "  URL: $DOMAIN_IMAGE_URL"
else
    echo "✗ Image NOT accessible from domain: HTTP $DOMAIN_IMAGE_CODE"
    echo "  This indicates a web server configuration issue"
fi

echo ""
echo "5. Recommended fixes:"
echo ""
echo "Option A: Configure Nginx to serve uploads"
echo "  Add this to your nginx config:"
echo ""
echo "  location /uploads {"
echo "      alias /path/to/DRIVERHIRE/uploads;"
echo "      expires 30d;"
echo "  }"
echo ""
echo "Option B: Proxy uploads to Node backend"
echo "  Add this to your nginx config:"
echo ""
echo "  location /uploads {"
echo "      proxy_pass http://127.0.0.1:3000/uploads;"
echo "      proxy_set_header Host \$host;"
echo "      proxy_cache_valid 200 30d;"
echo "  }"
echo ""
echo "Option C: Change frontend to use direct backend URL"
echo "  Update PUBLIC_ASSET_BASE_URL to: http://45.13.132.210:3000/uploads"
echo "  (Not recommended for production)"
echo ""
echo "================================"
