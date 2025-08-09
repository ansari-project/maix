#!/bin/bash

# Test Database Management Script

set -e

command=$1

case $command in
  "start")
    echo "🚀 Starting test database..."
    # Check if container already exists
    if docker ps -a | grep -q postgres-test; then
      echo "Container exists, starting it..."
      docker start postgres-test
    else
      echo "Creating new test database container..."
      docker run -d --name postgres-test -p 5433:5432 \
        -e POSTGRES_USER=testuser \
        -e POSTGRES_PASSWORD=testpass \
        -e POSTGRES_DB=maix_test \
        postgres:15-alpine
    fi
    echo "⏳ Waiting for database to be ready..."
    sleep 3
    echo "✅ Test database ready on port 5433"
    ;;
    
  "stop")
    echo "🛑 Stopping test database..."
    docker stop postgres-test 2>/dev/null || true
    echo "✅ Test database stopped"
    ;;
    
  "reset")
    echo "🔄 Resetting test database..."
    docker stop postgres-test 2>/dev/null || true
    docker rm postgres-test 2>/dev/null || true
    docker run -d --name postgres-test -p 5433:5432 \
      -e POSTGRES_USER=testuser \
      -e POSTGRES_PASSWORD=testpass \
      -e POSTGRES_DB=maix_test \
      postgres:15-alpine
    sleep 3
    echo "✅ Test database reset"
    ;;
    
  "logs")
    docker compose -f docker-compose.test.yml logs -f
    ;;
    
  *)
    echo "Usage: $0 {start|stop|reset|logs}"
    exit 1
    ;;
esac