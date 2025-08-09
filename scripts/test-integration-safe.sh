#!/bin/bash

# Safe Integration Test Runner
# Ensures test database is running before executing integration tests

set -e

echo "🔍 Checking test database..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
  echo "❌ Docker is not running. Please start Docker first."
  exit 1
fi

# Check if test database container exists and is running
if docker ps | grep -q postgres-test; then
  echo "✅ Test database is already running"
else
  # Check if container exists but is stopped
  if docker ps -a | grep -q postgres-test; then
    echo "⚠️  Test database container exists but is stopped. Starting it..."
    docker start postgres-test
  else
    echo "⚠️  Test database not found. Creating and starting it..."
    npm run test:db:start
  fi
  
  # Wait for database to be ready
  echo "⏳ Waiting for database to be ready..."
  sleep 3
  
  # Verify connection
  max_attempts=10
  attempt=1
  while [ $attempt -le $max_attempts ]; do
    if PGPASSWORD=testpass psql -U testuser -h localhost -p 5433 -d maix_test -c "SELECT 1" > /dev/null 2>&1; then
      echo "✅ Test database is ready"
      break
    fi
    echo "   Attempt $attempt/$max_attempts: Database not ready yet..."
    sleep 1
    attempt=$((attempt + 1))
  done
  
  if [ $attempt -gt $max_attempts ]; then
    echo "❌ Test database failed to start. Please check Docker logs."
    exit 1
  fi
fi

echo "🧪 Running integration tests..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Pass all arguments to the test command
npm run test:integration "$@"