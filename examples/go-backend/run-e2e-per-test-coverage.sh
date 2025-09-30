#!/bin/bash

# Go Backend E2E Runner with Per-Test Coverage Collection
# This script runs each E2E test individually with its own application instance

set -e

echo "[TIA-Go Per-Test] Starting Go backend E2E execution with per-test coverage..."

# Clean up any existing coverage files and processes
rm -f coverage.out cover.out coverage.txt main_per_test_binary
rm -rf .tia/per-test-coverage-raw
mkdir -p .tia/per-test-coverage-raw
mkdir -p .tia/per-test-coverage

# Kill any existing processes safely
if lsof -ti:8080 >/dev/null 2>&1; then
    echo "[TIA-Go Per-Test] Stopping existing process on port 8080..."
    lsof -ti:8080 | xargs kill -9 2>/dev/null || true
    sleep 2
fi

echo "[TIA-Go Per-Test] Building application with coverage instrumentation..."

# Build the application with coverage instrumentation
go build -cover -covermode=atomic -o main_per_test_binary main.go

if [ ! -f main_per_test_binary ]; then
    echo "[TIA-Go Per-Test] Error: Failed to build application"
    exit 1
fi

# Function to run a single test with its own app instance
run_single_test() {
    local test_focus="$1"
    local test_name="$2"
    
    echo ""
    echo "=========================================="
    echo "[TIA-Go Per-Test] Running test: $test_name"
    echo "=========================================="
    
    # Create unique coverage directory for this test
    local coverage_dir=".tia/per-test-coverage-raw/$test_name"
    mkdir -p "$coverage_dir"
    
    # Start the application with coverage
    export GOCOVERDIR="$coverage_dir"
    ./main_per_test_binary &
    local app_pid=$!
    
    echo "[TIA-Go Per-Test] Started app for '$test_name' with PID: $app_pid"
    
    # Wait for the application to start
    local ready=false
    for i in {1..30}; do
        if curl -s http://localhost:8080/api/health > /dev/null 2>&1; then
            echo "[TIA-Go Per-Test] Application ready for '$test_name'"
            ready=true
            break
        fi
        sleep 1
    done
    
    if [ "$ready" = false ]; then
        echo "[TIA-Go Per-Test] Error: Application failed to start for '$test_name'"
        kill $app_pid 2>/dev/null || true
        return 1
    fi
    
    # Execute the actual test logic (HTTP requests)
    echo "[TIA-Go Per-Test] Executing test logic: $test_name"
    case "$test_name" in
        "Health_API_should_return_healthy_status")
            curl -s http://localhost:8080/api/health > /dev/null
            echo "[TIA-Go Per-Test] Health check executed"
            ;;
        "Users_API_should_return_all_users")
            curl -s http://localhost:8080/api/users > /dev/null
            echo "[TIA-Go Per-Test] Get all users executed"
            ;;
        "Users_API_should_return_400_for_invalid_user_ID")
            curl -s http://localhost:8080/api/users/invalid > /dev/null
            echo "[TIA-Go Per-Test] Invalid user ID test executed"
            ;;
        "Users_API_should_return_user_by_valid_ID")
            curl -s http://localhost:8080/api/users/1 > /dev/null
            echo "[TIA-Go Per-Test] Valid user ID test executed"
            ;;
        "Users_API_should_create_a_new_user")
            curl -s -X POST -H "Content-Type: application/json" -d '{"name":"Test User","email":"test@example.com"}' http://localhost:8080/api/users > /dev/null
            echo "[TIA-Go Per-Test] Create user test executed"
            ;;
        "Products_API_should_return_all_products")
            curl -s http://localhost:8080/api/products > /dev/null
            echo "[TIA-Go Per-Test] Get all products executed"
            ;;
        "Products_API_should_return_404_for_non_existent_product")
            curl -s http://localhost:8080/api/products/999 > /dev/null
            echo "[TIA-Go Per-Test] Non-existent product test executed"
            ;;
        *)
            echo "[TIA-Go Per-Test] Unknown test: $test_name"
            ;;
    esac
    
    # Stop the application gracefully
    echo "[TIA-Go Per-Test] Stopping application for '$test_name'"
    kill -TERM $app_pid 2>/dev/null || true
    sleep 2
    
    # Force kill if still running
    if kill -0 $app_pid 2>/dev/null; then
        echo "[TIA-Go Per-Test] Force killing application"
        kill -KILL $app_pid 2>/dev/null || true
    fi
    
    wait $app_pid 2>/dev/null || true
    echo "[TIA-Go Per-Test] Application stopped for '$test_name'"
    
    # Convert coverage data to text format and then to TIA format
    if [ -d "$coverage_dir" ] && [ "$(ls -A $coverage_dir 2>/dev/null)" ]; then
        echo "[TIA-Go Per-Test] Converting coverage data for '$test_name'"
        local temp_coverage="temp_coverage_$test_name.out"
        go tool covdata textfmt -i="$coverage_dir" -o="$temp_coverage" 2>/dev/null || true
        
        if [ -f "$temp_coverage" ]; then
            # Convert to proper TIA format using the converter script
            local tia_file=".tia/per-test-coverage/Per_Test_E2E__$test_name.json"
            
            node convert-go-coverage-to-tia.js "$temp_coverage" "$tia_file" "$test_name"
            
            # Show coverage summary
            echo "[TIA-Go Per-Test] Coverage summary for '$test_name':"
            go tool cover -func="$temp_coverage" | tail -1 || echo "No coverage summary available"
        else
            echo "[TIA-Go Per-Test] No coverage data generated for '$test_name'"
        fi
        
        rm -f "$temp_coverage"
    else
        echo "[TIA-Go Per-Test] No coverage data generated for '$test_name'"
    fi
    
    echo "[TIA-Go Per-Test] Completed test: $test_name"
}

# List of tests to run individually
# Each test gets its own application instance
echo "[TIA-Go Per-Test] Running individual tests with isolated coverage..."

run_single_test "should return healthy status" "Health_API_should_return_healthy_status"
run_single_test "should return all users" "Users_API_should_return_all_users" 
run_single_test "should return 400 for invalid user ID" "Users_API_should_return_400_for_invalid_user_ID"
run_single_test "should return user by valid ID" "Users_API_should_return_user_by_valid_ID"
run_single_test "should create a new user" "Users_API_should_create_a_new_user"
run_single_test "should return all products" "Products_API_should_return_all_products"
run_single_test "should return 404 for non-existent product" "Products_API_should_return_404_for_non_existent_product"

# Clean up
rm -f main_per_test_binary
rm -rf .tia/per-test-coverage-raw

echo ""
echo "=========================================="
echo "[TIA-Go Per-Test] Per-test E2E execution completed!"
echo "[TIA-Go Per-Test] Each test now has isolated coverage data"
echo "=========================================="

# Show the generated coverage files
echo ""
echo "Generated per-test coverage files:"
ls -la .tia/per-test-coverage/Per_Test_E2E__*.json 2>/dev/null || echo "No coverage files found"
