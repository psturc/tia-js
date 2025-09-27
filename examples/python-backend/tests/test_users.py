import json
import pytest

class TestUsersAPI:
    """Test cases for the Users API endpoints."""
    
    def test_get_users(self, client):
        """Test GET /api/users returns all users."""
        response = client.get('/api/users')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'users' in data
        assert len(data['users']) == 2
        assert data['users'][0]['name'] == 'John Doe'
        assert data['users'][1]['name'] == 'Jane Smith'
    
    def test_get_user_by_id_existing(self, client):
        """Test GET /api/users/:id with existing user."""
        response = client.get('/api/users/1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['id'] == 1
        assert data['name'] == 'John Doe'
        assert data['email'] == 'john@example.com'
    
    def test_get_user_by_id_not_found(self, client):
        """Test GET /api/users/:id with non-existent user."""
        response = client.get('/api/users/999')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        
        assert data['error'] == 'User not found'
    
    def test_create_user_valid_data(self, client):
        """Test POST /api/users with valid user data."""
        new_user = {
            'name': 'Test User',
            'email': 'test@example.com'
        }
        
        response = client.post('/api/users', 
                             data=json.dumps(new_user),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        assert data['id'] == 3  # Should be next available ID
        assert data['name'] == 'Test User'
        assert data['email'] == 'test@example.com'
    
    def test_create_user_missing_name(self, client):
        """Test POST /api/users with missing name field."""
        invalid_user = {
            'email': 'test@example.com'
        }
        
        response = client.post('/api/users',
                             data=json.dumps(invalid_user),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['error'] == 'Name and email are required'
    
    def test_create_user_missing_email(self, client):
        """Test POST /api/users with missing email field."""
        invalid_user = {
            'name': 'Test User'
        }
        
        response = client.post('/api/users',
                             data=json.dumps(invalid_user),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['error'] == 'Name and email are required'
    
    def test_create_user_empty_data(self, client):
        """Test POST /api/users with empty data."""
        response = client.post('/api/users',
                             data=json.dumps({}),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['error'] == 'Name and email are required'
    
    def test_create_user_no_json(self, client):
        """Test POST /api/users without JSON content type."""
        response = client.post('/api/users',
                             data='invalid data')
        
        assert response.status_code == 415  # Unsupported Media Type
