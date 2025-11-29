#!/bin/bash

set -e

CONTAINER_NAME="viber"
IMAGE_NAME="viber"
PORT=${PORT:-3000}

echo "🔨 Building Docker image..."
docker build -t $IMAGE_NAME .

echo "🛑 Stopping and removing existing container (if any)..."
docker stop $CONTAINER_NAME 2>/dev/null || true
docker rm $CONTAINER_NAME 2>/dev/null || true

echo "🚀 Starting new container..."
docker run -d \
  --name $CONTAINER_NAME \
  -p $PORT:3000 \
  $IMAGE_NAME

echo "⏳ Waiting for server to start..."
sleep 3

echo "🧪 Testing API routes..."

echo ""
echo "Testing /api/test:"
TEST_RESPONSE=$(curl -s http://localhost:$PORT/api/test)
echo "$TEST_RESPONSE" | jq '.' 2>/dev/null || echo "$TEST_RESPONSE"

echo ""
echo "Testing /api/health:"
HEALTH_RESPONSE=$(curl -s http://localhost:$PORT/api/health)
echo "$HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "$HEALTH_RESPONSE"

echo ""
echo "✅ Container '$CONTAINER_NAME' is running on port $PORT"
echo "📋 View logs: docker logs -f $CONTAINER_NAME"
echo "🛑 Stop container: docker stop $CONTAINER_NAME"
