#!/bin/bash

# Simple demonstration of per-test coverage collection
set -e

echo "=== Testing Per-Test Coverage Collection ==="

# Clean up
rm -f main_test_binary coverage_*.out
rm -rf .tia/demo-per-test-coverage
mkdir -p .tia/demo-per-test-coverage

# Build app with coverage
echo "Building application with coverage..."
go build -cover -covermode=atomic -o main_test_binary main.go

# Test 1: Health endpoint only
echo ""
echo "=== Test 1: Health Endpoint Only ==="
export GOCOVERDIR=".tia/demo-per-test-coverage/test1"
mkdir -p "$GOCOVERDIR"

./main_test_binary &
APP_PID=$!
echo "Started app with PID: $APP_PID"

# Wait for app to be ready
for i in {1..10}; do
    if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Make only health request
echo "Making health request..."
curl -s http://localhost:8080/api/health > /dev/null

# Stop app gracefully
echo "Stopping app..."
kill -TERM $APP_PID
wait $APP_PID 2>/dev/null || true

# Convert coverage
go tool covdata textfmt -i="$GOCOVERDIR" -o=coverage_test1.out
echo "Test 1 coverage summary:"
go tool cover -func=coverage_test1.out | tail -1

echo ""
echo "=== Test 2: Users Endpoint Only ==="
export GOCOVERDIR=".tia/demo-per-test-coverage/test2"
mkdir -p "$GOCOVERDIR"

./main_test_binary &
APP_PID=$!
echo "Started app with PID: $APP_PID"

# Wait for app to be ready
for i in {1..10}; do
    if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
        break
    fi
    sleep 1
done

# Make only users request (this should hit the getUserByID error path)
echo "Making users request with invalid ID..."
curl -s http://localhost:8080/api/users/invalid > /dev/null

# Stop app gracefully
echo "Stopping app..."
kill -TERM $APP_PID
wait $APP_PID 2>/dev/null || true

# Convert coverage
go tool covdata textfmt -i="$GOCOVERDIR" -o=coverage_test2.out
echo "Test 2 coverage summary:"
go tool cover -func=coverage_test2.out | tail -1

echo ""
echo "=== Comparing Coverage ==="
echo "Test 1 (Health only) - Line 98 coverage:"
grep "main.go:98" coverage_test1.out || echo "Line 98 not covered"

echo "Test 2 (Users invalid ID) - Line 98 coverage:"
grep "main.go:98" coverage_test2.out || echo "Line 98 not covered"

echo ""
echo "This demonstrates that per-test coverage collection works!"
echo "Test 1 should NOT cover line 98 (getUserByID error)"
echo "Test 2 SHOULD cover line 98 (getUserByID error)"

# Don't clean up coverage files so we can examine them
rm -f main_test_binary
# rm -f coverage_*.out  # Keep these for analysis
rm -rf .tia/demo-per-test-coverage

echo ""
echo "Coverage files preserved for analysis:"
ls -la coverage_*.out 2>/dev/null || echo "No coverage files found"

