#!/bin/bash

# Go Backend E2E Test Runner with Coverage
# This script builds the app with coverage instrumentation and runs true E2E tests

set -e

echo "[TIA-Go E2E] Starting Go backend E2E tests with coverage collection..."

# Clean up any existing coverage files and processes
rm -f coverage.out cover.out coverage.txt main
# Kill only our specific main process if it exists (much safer approach)
PID_FILE=".tia/main.pid"
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "[TIA-Go E2E] Stopping existing main process (PID: $OLD_PID)..."
        kill "$OLD_PID" || true
        sleep 2
    fi
    rm -f "$PID_FILE"
fi

# Create coverage directory
mkdir -p .tia/per-test-coverage

echo "[TIA-Go E2E] Step 1: Building application with coverage instrumentation..."

# Build the application with coverage instrumentation
go build -cover -covermode=atomic -o main main.go

if [ ! -f main ]; then
    echo "[TIA-Go E2E] Error: Failed to build application"
    exit 1
fi

echo "[TIA-Go E2E] Step 2: Starting application with coverage..."

# Set coverage output file
export GOCOVERDIR=".tia/go-coverage"
mkdir -p "$GOCOVERDIR"

# Start the application in the background
./main &
APP_PID=$!

# Save PID for future cleanup
echo "$APP_PID" > "$PID_FILE"

echo "[TIA-Go E2E] Application started with PID: $APP_PID"

# Wait for the application to start
echo "[TIA-Go E2E] Waiting for application to be ready..."
for i in {1..30}; do
    if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
        echo "[TIA-Go E2E] Application is ready!"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "[TIA-Go E2E] Error: Application failed to start within 30 seconds"
        kill $APP_PID 2>/dev/null || true
        exit 1
    fi
    sleep 1
done

echo "[TIA-Go E2E] Step 3: Running E2E tests..."

# Function to cleanup on exit
cleanup() {
    echo "[TIA-Go E2E] Cleaning up..."
    if [ ! -z "$APP_PID" ]; then
        echo "[TIA-Go E2E] Stopping application gracefully (PID: $APP_PID)..."
        kill -TERM $APP_PID 2>/dev/null || true
        sleep 1
        # Force kill if still running
        if kill -0 $APP_PID 2>/dev/null; then
            kill -KILL $APP_PID 2>/dev/null || true
        fi
        wait $APP_PID 2>/dev/null || true
        echo "[TIA-Go E2E] Application stopped"
    fi
    # Clean up PID file
    rm -f "$PID_FILE"
}

# Set trap to cleanup on script exit
trap cleanup EXIT

# Run the E2E tests (run only the main_test package to avoid duplicate RunSpecs)
go test -v ./... -run TestE2E

echo "[TIA-Go E2E] Step 4: Collecting coverage data..."

# Stop the application gracefully to trigger coverage data collection
echo "[TIA-Go E2E] Sending SIGTERM to application for graceful shutdown..."
kill -TERM $APP_PID 2>/dev/null || true
sleep 2

# If still running, send SIGINT
if kill -0 $APP_PID 2>/dev/null; then
    echo "[TIA-Go E2E] Sending SIGINT to application..."
    kill -INT $APP_PID 2>/dev/null || true
    sleep 2
fi

# Wait for process to exit
wait $APP_PID 2>/dev/null || true
echo "[TIA-Go E2E] Application stopped gracefully"

# Convert coverage data if available
if [ -d "$GOCOVERDIR" ] && [ "$(ls -A $GOCOVERDIR)" ]; then
    echo "[TIA-Go E2E] Converting coverage data..."
    go tool covdata textfmt -i="$GOCOVERDIR" -o=coverage.out
    
    if [ -f coverage.out ]; then
        echo "[TIA-Go E2E] Coverage data collected successfully!"
        echo "[TIA-Go E2E] Coverage summary:"
        go tool cover -func=coverage.out | tail -1
        
        # Process coverage for TIA (this would be enhanced to create per-test coverage)
        echo "[TIA-Go E2E] Processing coverage for TIA..."
        # For now, we'll create a single coverage file representing all E2E tests
        # In a more advanced setup, you could run tests individually to get per-test coverage
        
    else
        echo "[TIA-Go E2E] Warning: No coverage data generated"
    fi
else
    echo "[TIA-Go E2E] Warning: No coverage directory or files found"
fi

echo "[TIA-Go E2E] E2E test execution completed!"

# Clean up the trap since we're doing manual cleanup
trap - EXIT

