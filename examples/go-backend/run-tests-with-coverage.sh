#!/bin/bash

# Go Backend TIA Test Runner with Coverage
# This script runs tests with Go coverage instrumentation and TIA integration

set -e

echo "[TIA-Go] Starting Go backend tests with coverage collection..."

# Clean up any existing coverage files
rm -f coverage.out cover.out coverage.txt
rm -rf .tia/temp-coverage

# Create coverage directory
mkdir -p .tia/per-test-coverage

# Method 1: Run tests with coverage and then run Ginkgo tests
echo "[TIA-Go] Step 1: Generating coverage profile..."

# First, run tests with coverage to generate a coverage profile
go test -coverprofile=coverage.out -covermode=set ./...

if [ -f coverage.out ]; then
    echo "[TIA-Go] Coverage profile generated successfully"
    
    # Now run Ginkgo tests which will use the coverage data
    echo "[TIA-Go] Step 2: Running Ginkgo tests with TIA integration..."
    ginkgo -r --keep-going
    
    echo "[TIA-Go] Coverage collection completed!"
    echo "[TIA-Go] Coverage files saved in .tia/per-test-coverage/"
    ls -la .tia/per-test-coverage/
else
    echo "[TIA-Go] Warning: No coverage profile generated, running tests without coverage..."
    ginkgo -r --keep-going
fi

echo "[TIA-Go] Test execution completed!"

