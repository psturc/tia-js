import pytest
import sys
import os

# Add the parent directory to the path so we can import the app
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import app

# Import TIA plugin
pytest_plugins = ["pytest_tia_plugin"]

@pytest.fixture
def client():
    """Create a test client for the Flask application."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        with app.app_context():
            yield client

@pytest.fixture(autouse=True)
def reset_data():
    """Reset the global data before each test."""
    # Import the global variables from app
    import app as app_module
    
    # Reset users data
    app_module.users.clear()
    app_module.users.extend([
        {"id": 1, "name": "John Doe", "email": "john@example.com"},
        {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
    ])
    
    # Reset products data
    app_module.products.clear()
    app_module.products.extend([
        {"id": 1, "name": "Laptop", "price": 999.99, "description": "High-performance laptop"},
        {"id": 2, "name": "Mouse", "price": 29.99, "description": "Wireless mouse"},
        {"id": 3, "name": "Keyboard", "price": 79.99, "description": "Mechanical keyboard"}
    ])
    
    yield
