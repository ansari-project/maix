#!/bin/bash

# Integration Test Runner
# Runs integration tests against local PostgreSQL test database

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Set the test database URL
export DATABASE_URL="postgresql://mwk@localhost:5432/maix_test"

# Check if postgres is running
if ! pg_isready -h localhost -p 5432 > /dev/null 2>&1; then
    echo -e "${RED}❌ PostgreSQL is not running on localhost:5432${NC}"
    echo "Please start PostgreSQL and try again."
    exit 1
fi

# Check if test database exists
if ! psql $DATABASE_URL -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${YELLOW}⚠️  Test database 'maix_test' does not exist. Creating...${NC}"
    psql postgresql://localhost:5432/postgres -c "CREATE DATABASE maix_test;"
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Test database created${NC}"
    else
        echo -e "${RED}❌ Failed to create test database${NC}"
        exit 1
    fi
fi

# Show what we're testing against
echo -e "${GREEN}🧪 Running integration tests${NC}"
echo "Database: maix_test"
echo "Host: localhost:5432"
echo ""

# Run the tests
if [ "$1" = "--watch" ]; then
    # Watch mode
    npx jest --config jest.integration.config.js --watch "${@:2}"
elif [ "$1" = "--single" ]; then
    # Run a single test by pattern
    if [ -z "$2" ]; then
        echo -e "${RED}Please provide a test name pattern${NC}"
        echo "Usage: $0 --single \"test name pattern\""
        exit 1
    fi
    npx jest --config jest.integration.config.js --runInBand --testNamePattern="$2"
elif [ "$1" = "--file" ]; then
    # Run a specific test file
    if [ -z "$2" ]; then
        echo -e "${RED}Please provide a test file path${NC}"
        echo "Usage: $0 --file path/to/test.integration.test.ts"
        exit 1
    fi
    npx jest --config jest.integration.config.js --runInBand "$2"
elif [ "$1" = "--help" ]; then
    # Show help
    echo "Integration Test Runner"
    echo ""
    echo "Usage:"
    echo "  $0                    Run all integration tests"
    echo "  $0 --watch           Run tests in watch mode"
    echo "  $0 --single \"name\"   Run a single test by name pattern"
    echo "  $0 --file path       Run a specific test file"
    echo "  $0 --verbose         Run with verbose output"
    echo "  $0 --help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0"
    echo "  $0 --single \"should create an event\""
    echo "  $0 --file src/lib/services/__tests__/event.service.integration.test.ts"
    echo "  $0 --watch"
elif [ "$1" = "--verbose" ]; then
    # Verbose mode
    npx jest --config jest.integration.config.js --runInBand --verbose "${@:2}"
else
    # Default: run all tests
    npx jest --config jest.integration.config.js --runInBand "$@"
fi

# Show summary
EXIT_CODE=$?
if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✅ Integration tests completed successfully${NC}"
else
    echo ""
    echo -e "${YELLOW}⚠️  Some tests failed. Check the output above.${NC}"
fi

exit $EXIT_CODE