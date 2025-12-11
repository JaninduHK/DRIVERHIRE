#!/bin/bash
# Verify DRIVERHIRE uploads are working correctly

echo "==== DRIVERHIRE Upload Verification ===="
echo ""

# Check if we're on the VPS
if [ -z "$1" ]; then
    APP_PATH="/path/to/DRIVERHIRE"
    echo "Usage: ./verify-uploads.sh /path/to/DRIVERHIRE"
    echo "Running with default path..."
else
    APP_PATH="$1"
fi

# Check uploads directory
echo "1. Checking uploads directory..."
if [ -d "$APP_PATH/uploads" ]; then
    echo "   ✓ Directory exists: $APP_PATH/uploads"
    ls -la "$APP_PATH/uploads/"
else
    echo "   ✗ Directory not found: $APP_PATH/uploads"
    exit 1
fi

echo ""
echo "2. Checking subdirectories..."
for dir in profiles vehicles commissions; do
    if [ -d "$APP_PATH/uploads/$dir" ]; then
        count=$(find "$APP_PATH/uploads/$dir" -type f | wc -l)
        echo "   ✓ $dir/ ($count files)"
    else
        echo "   ✗ $dir/ missing"
    fi
done

echo ""
echo "3. Checking file permissions..."
perms=$(stat -f "%OLp" "$APP_PATH/uploads" 2>/dev/null || stat -c "%a" "$APP_PATH/uploads" 2>/dev/null)
echo "   Permissions: $perms"
owner=$(ls -ld "$APP_PATH/uploads" | awk '{print $3":"$4}')
echo "   Owner: $owner"

echo ""
echo "4. Checking Nginx configuration..."
if command -v nginx &> /dev/null; then
    if nginx -t 2>/dev/null; then
        echo "   ✓ Nginx configuration is valid"
    else
        echo "   ✗ Nginx configuration has errors"
        nginx -t
    fi
    
    if systemctl is-active --quiet nginx; then
        echo "   ✓ Nginx is running"
    else
        echo "   ✗ Nginx is not running"
    fi
else
    echo "   ⚠ Nginx not found"
fi

echo ""
echo "5. Checking Node backend..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null; then
    echo "   ✓ Backend running on port 3000"
else
    echo "   ⚠ Backend not found on port 3000"
fi

echo ""
echo "6. Testing file access..."
sample_file=$(find "$APP_PATH/uploads" -type f -name "*.jpeg" -o -name "*.jpg" -o -name "*.png" | head -1)
if [ -n "$sample_file" ]; then
    filename=$(basename "$sample_file")
    subdir=$(basename $(dirname "$sample_file"))
    echo "   Sample file: $subdir/$filename"
    echo ""
    echo "   Test URLs:"
    echo "   - Direct backend: http://45.13.132.210:3000/uploads/$subdir/$filename"
    echo "   - Production: https://carwithdriver.lk/uploads/$subdir/$filename"
    echo ""
    echo "   Try these commands to test:"
    echo "   curl -k https://carwithdriver.lk/uploads/$subdir/$filename"
    echo "   curl http://45.13.132.210:3000/uploads/$subdir/$filename"
else
    echo "   ⚠ No image files found to test"
fi

echo ""
echo "==== Verification Complete ===="
