# Python Backend Testing with TIA

This example demonstrates how to use TIA (Test Impact Analysis) with a Python Flask backend application using pytest testing framework.

## Application Overview

The Python Flask application is a simple REST API that provides:
- User management endpoints (`/api/users`)
- Product management endpoints (`/api/products`)
- Health check endpoint (`/api/health`)
- Root endpoint with API information (`/`)

## Setup

1. **Create virtual environment (recommended):**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

## Running the Application

Start the Flask server:
```bash
python app.py
```

The application will be available at `http://localhost:5000`.

## Running Tests

Run all tests with pytest:
```bash
pytest
```

Run tests with verbose output:
```bash
pytest -v
```

Run tests with coverage:
```bash
pytest --cov=app --cov-report=html
```

Run specific test file:
```bash
pytest tests/test_users.py
```

Run specific test:
```bash
pytest tests/test_users.py::TestUsersAPI::test_get_users
```

## TIA Integration

This example includes TIA integration for Python coverage analysis:

1. **Coverage Collection**: The `pytest_tia_plugin.py` collects Python coverage data during test execution
2. **Coverage Format**: Converts Python coverage data to TIA-compatible format
3. **Per-Test Coverage**: Stores coverage data for each individual test in `.tia/per-test-coverage/`

### TIA Configuration

The `tia.config.js` file configures TIA for Python applications:
- Specifies Python source patterns
- Sets up coverage format as 'python-coverage'
- Configures analysis thresholds

### Coverage Data Format

Python coverage is collected using the `coverage.py` library and converted to a TIA-compatible JSON format similar to Istanbul/NYC coverage.

## Test Structure

- `tests/test_users.py` - Tests for user management functionality
- `tests/test_products.py` - Tests for product management functionality  
- `tests/test_health.py` - Tests for health check and root endpoint functionality
- `tests/conftest.py` - Pytest configuration and fixtures

Each test file contains multiple test cases that exercise different aspects of the application.

## API Endpoints

### Root
- `GET /` - API information and available endpoints

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

## Coverage Analysis

After running tests, you can analyze test impact using TIA:

```bash
# Analyze which tests are affected by changes
npx tia analyze

# Run only affected tests
npx tia run
```

The TIA system will analyze your Python code changes and determine which tests need to be run based on the coverage data collected during previous test runs.

## Development

### Adding New Tests

1. Create test files in the `tests/` directory following the `test_*.py` naming convention
2. Use the provided fixtures in `conftest.py` for consistent test setup
3. Follow the existing test structure and naming patterns

### Test Data Reset

The `conftest.py` file includes an `autouse` fixture that automatically resets the in-memory data before each test, ensuring test isolation.

### Coverage Plugin

The `pytest_tia_plugin.py` automatically collects coverage data for each test. No additional configuration is needed - just run pytest normally and the plugin will handle coverage collection for TIA.

