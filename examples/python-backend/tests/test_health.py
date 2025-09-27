import json
import pytest

class TestHealthAPI:
    """Test cases for the Health API and root endpoint."""
    
    def test_health_check(self, client):
        """Test GET /api/health returns healthy status."""
        response = client.get('/api/health')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['status'] == 'healthy'
        assert data['version'] == '1.0.0'
    
    def test_root_endpoint(self, client):
        """Test GET / returns API information."""
        response = client.get('/')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['message'] == 'Python Backend API'
        assert data['version'] == '1.0.0'
        assert 'endpoints' in data
        assert data['endpoints']['users'] == '/api/users'
        assert data['endpoints']['products'] == '/api/products'
        assert data['endpoints']['health'] == '/api/health'

