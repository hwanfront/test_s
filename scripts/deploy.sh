#!/bin/bash

# Production Deployment Script for Vercel
# This script prepares and deploys the AI Analysis MVP to production

set -e

echo "🚀 Starting production deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "package.json not found. Please run this script from the project root."
    exit 1
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_warning "Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Verify environment variables are set
REQUIRED_VARS=(
    "NEXTAUTH_URL"
    "NEXTAUTH_SECRET" 
    "GOOGLE_CLIENT_ID"
    "GOOGLE_CLIENT_SECRET"
    "SUPABASE_URL"
    "SUPABASE_ANON_KEY"
    "GEMINI_API_KEY"
)

echo "🔍 Checking environment variables..."
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        print_warning "Environment variable $var is not set"
        print_warning "Please set it with: vercel env add $var"
    else
        print_status "Environment variable $var is set"
    fi
done

# Run pre-deployment checks
echo "🧪 Running pre-deployment checks..."

# Type checking
print_status "Running TypeScript type check..."
pnpm run type-check || {
    print_error "TypeScript type check failed"
    exit 1
}

# Linting
print_status "Running ESLint..."
pnpm run lint || {
    print_error "Linting failed"
    exit 1
}

# Testing
print_status "Running tests..."
pnpm run test || {
    print_error "Tests failed"
    exit 1
}

# Build check
print_status "Testing production build..."
pnpm run build || {
    print_error "Production build failed"
    exit 1
}

# Security audit
print_status "Running security audit..."
pnpm audit --audit-level moderate || {
    print_warning "Security audit found issues. Review before deploying."
    read -p "Continue with deployment? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_error "Deployment cancelled"
        exit 1
    fi
}

# Check for production-ready configuration
echo "⚙️ Verifying production configuration..."

# Check next.config.js for production settings
if grep -q "removeConsole.*production" next.config.js; then
    print_status "Console removal configured for production"
else
    print_warning "Console removal not configured for production"
fi

# Check for security headers
if grep -q "X-Frame-Options" next.config.js || grep -q "X-Frame-Options" vercel.json; then
    print_status "Security headers configured"
else
    print_warning "Security headers not found in configuration"
fi

# Deploy to Vercel
echo "🚀 Deploying to Vercel..."

# Check if this is the first deployment
if [ ! -f ".vercel/project.json" ]; then
    print_status "First time deployment - setting up project..."
    vercel --prod
else
    print_status "Deploying to existing project..."
    vercel --prod
fi

# Verify deployment
echo "✅ Deployment verification..."
print_status "Deployment completed!"

# Get deployment URL
DEPLOYMENT_URL=$(vercel ls --scope $(vercel whoami) | grep -E "https://.*\.vercel\.app" | head -1 | awk '{print $2}')

if [ ! -z "$DEPLOYMENT_URL" ]; then
    print_status "Deployment URL: $DEPLOYMENT_URL"
    
    # Basic health check
    echo "🏥 Performing health check..."
    if curl -f -s "$DEPLOYMENT_URL/api/health" > /dev/null; then
        print_status "Health check passed"
    else
        print_warning "Health check failed - please verify manually"
    fi
    
    # Performance check
    echo "⚡ Running basic performance check..."
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "$DEPLOYMENT_URL")
    if (( $(echo "$RESPONSE_TIME < 2.0" | bc -l) )); then
        print_status "Performance check passed (${RESPONSE_TIME}s)"
    else
        print_warning "Slow response time: ${RESPONSE_TIME}s"
    fi
else
    print_warning "Could not determine deployment URL"
fi

echo "🎉 Deployment process completed!"
echo ""
echo "📋 Post-deployment checklist:"
echo "  □ Verify OAuth providers work with new domain"
echo "  □ Test analysis pipeline end-to-end"
echo "  □ Check error monitoring dashboard"
echo "  □ Verify SSL certificate"
echo "  □ Update DNS if using custom domain"
echo ""
echo "📊 Monitoring:"
echo "  • Vercel Dashboard: https://vercel.com/dashboard"
echo "  • Sentry: https://sentry.io/"
echo "  • Application: $DEPLOYMENT_URL"