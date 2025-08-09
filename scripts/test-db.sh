#!/bin/bash

# Test Database Management Script

set -e

command=$1

case $command in
  "start")
    echo "🚀 Starting test database..."
    docker compose -f docker-compose.test.yml up -d
    echo "⏳ Waiting for database to be ready..."
    sleep 3
    echo "✅ Test database ready on port 5433"
    ;;
    
  "stop")
    echo "🛑 Stopping test database..."
    docker compose -f docker-compose.test.yml down
    echo "✅ Test database stopped"
    ;;
    
  "reset")
    echo "🔄 Resetting test database..."
    docker compose -f docker-compose.test.yml down -v
    docker compose -f docker-compose.test.yml up -d
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