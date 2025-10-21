#!/bin/bash

# Production Deployment Script
# This script builds and deploys the Next.js application with proper configuration

set -e  # Exit on error

echo "🚀 Starting deployment process..."

# Validate environment variables
echo "🔍 Validating environment configuration..."
npm run validate:env
if [ $? -ne 0 ]; then
  echo "❌ Environment validation failed. Please fix the issues above."
  exit 1
fi
echo "✅ Environment validation passed"

# Optional: Set default values
export NEXT_PUBLIC_APP_URL=${NEXT_PUBLIC_APP_URL:-"https://your-domain.com"}
export NODE_ENV="production"
export NEXT_TELEMETRY_DISABLED=1

echo "📦 Building Docker image..."

# Build the Docker image
docker build \
  --build-arg NODE_ENV=production \
  -t read-fast-app:latest \
  -f Dockerfile \
  .

echo "✅ Docker image built successfully"

# Optional: Tag for registry
if [ ! -z "$DOCKER_REGISTRY" ]; then
  echo "🏷️  Tagging image for registry: $DOCKER_REGISTRY"
  docker tag read-fast-app:latest $DOCKER_REGISTRY/read-fast-app:latest
  docker tag read-fast-app:latest $DOCKER_REGISTRY/read-fast-app:$(git rev-parse --short HEAD)
fi

# Optional: Push to registry
if [ "$PUSH_TO_REGISTRY" = "true" ] && [ ! -z "$DOCKER_REGISTRY" ]; then
  echo "📤 Pushing to registry..."
  docker push $DOCKER_REGISTRY/read-fast-app:latest
  docker push $DOCKER_REGISTRY/read-fast-app:$(git rev-parse --short HEAD)
fi

# Run locally with docker-compose (optional)
if [ "$RUN_LOCAL" = "true" ]; then
  echo "🏃 Running locally with docker-compose..."
  docker-compose up -d

  echo "⏳ Waiting for health check..."
  sleep 10

  # Check health
  if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "✅ Application is healthy and running at http://localhost:3000"
  else
    echo "⚠️  Health check failed. Check logs with: docker-compose logs app"
  fi
fi

echo "🎉 Deployment complete!"

# Print useful commands
echo ""
echo "📝 Useful commands:"
echo "  View logs:        docker-compose logs -f app"
echo "  Stop services:    docker-compose down"
echo "  Restart app:      docker-compose restart app"
echo "  Check health:     curl http://localhost:3000/api/health"
echo ""