# Go Backend Testing with TIA

This example demonstrates how to use TIA (Test Impact Analysis) with a Go backend application using Ginkgo testing framework.

## Application Overview

The Go application is a simple REST API built with Gin that provides:
- User management endpoints (`/api/users`)
- Product management endpoints (`/api/products`)
- Health check endpoint (`/api/health`)

## Setup

1. **Install Go dependencies:**
   ```bash
   go mod tidy
   ```

2. **Initialize Ginkgo (if not already done):**
   ```bash
   go install github.com/onsi/ginkgo/v2/ginkgo
   ```

## Running the Application

Start the Go server:
```bash
go run main.go
```

The application will be available at `http://localhost:8080`.

## Running Tests

### Standard Ginkgo Tests
Run all tests with Ginkgo:
```bash
ginkgo -r
```

Run tests with verbose output:
```bash
ginkgo -r -v
```

### TIA-Enabled Tests with Real Coverage
Run tests with real Go coverage collection for TIA:
```bash
./run-tests-with-coverage.sh
```

This script:
1. Generates a Go coverage profile using `go test -coverprofile=coverage.out`
2. Runs Ginkgo tests which parse the real coverage data
3. Converts Go coverage format to TIA-compatible JSON format
4. Saves per-test coverage files in `.tia/per-test-coverage/`

## TIA Integration

This example includes TIA integration for **real Go coverage analysis**:

1. **Real Coverage Collection**: Uses Go's built-in coverage instrumentation (`go test -coverprofile`)
2. **Coverage Parsing**: The `tia_hooks.go` parses actual Go coverage profiles during test execution
3. **Format Conversion**: Converts Go coverage format to TIA-compatible JSON format
4. **Per-Test Coverage**: Stores individual coverage data for each test in `.tia/per-test-coverage/`

### TIA Configuration

The `tia.config.js` file configures TIA for Go applications:
- Specifies Go source patterns (`**/*.go`, `!**/*_test.go`)
- Sets up coverage format as 'go-coverage'
- Configures analysis thresholds

### Real Coverage Data

The implementation now uses **real Go coverage data**:
- ✅ **Actual execution counts**: Shows which lines were actually executed (0 = not executed, 1+ = executed)
- ✅ **Precise line mapping**: Maps to actual source code lines and columns
- ✅ **Function coverage**: Tracks which functions were called during tests
- ✅ **Statement coverage**: Tracks which statements were executed

### Coverage Files

Each test generates a coverage file like:
```json
{
  "go-backend-app/main.go": {
    "path": "go-backend-app/main.go",
    "statementMap": { /* actual line mappings */ },
    "s": { /* real execution counts */ },
    "_coverageSchema": "go-coverage-tia-1.0.0"
  }
}
```

## Test Structure

- `users_test.go` - Ginkgo tests for user management functionality
- `products_test.go` - Ginkgo tests for product management functionality  
- `health_test.go` - Ginkgo tests for health check functionality
- `tia_hooks.go` - TIA coverage collection hooks and real coverage parsing
- `run-tests-with-coverage.sh` - Script to run tests with real Go coverage

Each test file contains multiple Ginkgo test cases that exercise different aspects of the application.

## API Endpoints

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `POST /api/users` - Create new user

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product

### Health
- `GET /api/health` - Health check endpoint
- `GET /` - Main web interface

## Coverage Analysis

After running tests, you can analyze test impact using TIA:

```bash
# Analyze which tests are affected by changes
npx tia analyze

# Run only affected tests
npx tia run
```

The TIA system will analyze your Go code changes and determine which E2E tests need to be run based on the coverage data collected during previous test runs.
