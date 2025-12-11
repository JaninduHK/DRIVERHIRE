#!/bin/bash

echo "================================"
echo "DRIVERHIRE Image Upload Setup Check"
echo "================================"
echo ""

# Check Node.js
echo "✓ Checking Node.js..."
if command -v node &> /dev/null; then
    echo "  Node.js version: $(node -v)"
else
    echo "  ✗ Node.js not found!"
    exit 1
fi

# Check npm
echo ""
echo "✓ Checking npm..."
if command -v npm &> /dev/null; then
    echo "  npm version: $(npm -v)"
else
    echo "  ✗ npm not found!"
    exit 1
fi

# Check backend directory
echo ""
echo "✓ Checking backend directory..."
if [ -d "backend" ]; then
    echo "  ✓ backend/ directory found"
else
    echo "  ✗ backend/ directory not found!"
    exit 1
fi

# Check .env file
echo ""
echo "✓ Checking .env configuration..."
if [ -f "backend/.env" ]; then
    echo "  ✓ backend/.env file exists"
    
    if grep -q "MONGO_URI" backend/.env; then
        MONGO_URI=$(grep "MONGO_URI=" backend/.env | cut -d'=' -f2-)
        echo "  ✓ MONGO_URI configured: ${MONGO_URI:0:50}..."
    else
        echo "  ✗ MONGO_URI not configured!"
    fi
    
    if grep -q "PUBLIC_ASSET_BASE_URL" backend/.env; then
        ASSET_URL=$(grep "PUBLIC_ASSET_BASE_URL=" backend/.env | cut -d'=' -f2-)
        echo "  ✓ PUBLIC_ASSET_BASE_URL configured: $ASSET_URL"
    else
        echo "  ✗ PUBLIC_ASSET_BASE_URL not configured!"
    fi
else
    echo "  ✗ backend/.env file not found!"
    echo "  Please copy backend/.env.example to backend/.env and configure it"
    exit 1
fi

# Check uploads directory
echo ""
echo "✓ Checking uploads directory..."
if [ -d "uploads" ]; then
    echo "  ✓ uploads/ directory exists"
    
    for subdir in vehicles profiles commissions; do
        if [ -d "uploads/$subdir" ]; then
            echo "  ✓ uploads/$subdir/ exists"
        else
            echo "  ⚠ uploads/$subdir/ missing (will be created on startup)"
        fi
    done
else
    echo "  ⚠ uploads/ directory missing (will be created on startup)"
fi

# Check key files
echo ""
echo "✓ Checking key backend files..."
FILES=(
    "backend/server.js"
    "backend/routes/driverRoutes.js"
    "backend/routes/authRoutes.js"
    "backend/controllers/driverController.js"
    "backend/controllers/authController.js"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file exists"
    else
        echo "  ✗ $file missing!"
    fi
done

# Check dependencies
echo ""
echo "✓ Checking dependencies..."
if [ -d "backend/node_modules" ]; then
    if grep -q '"multer"' backend/package.json; then
        echo "  ✓ multer dependency configured"
    else
        echo "  ✗ multer not in package.json!"
    fi
else
    echo "  ⚠ node_modules not installed yet"
    echo "    Run: cd backend && npm install"
fi

echo ""
echo "================================"
echo "✓ Setup check complete!"
echo "================================"
echo ""
echo "Next steps:"
echo "1. cd backend"
echo "2. npm install (if not done)"
echo "3. npm start"
echo ""
echo "Image uploads will be saved to:"
echo "  - uploads/vehicles/"
echo "  - uploads/profiles/"
echo "  - uploads/commissions/"
echo ""
echo "Files served at: PUBLIC_ASSET_BASE_URL from .env"
