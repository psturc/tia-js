import json
import pytest

class TestProductsAPI:
    """Test cases for the Products API endpoints."""
    
    def test_get_products(self, client):
        """Test GET /api/products returns all products."""
        response = client.get('/api/products')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert 'products' in data
        assert len(data['products']) == 3
        assert data['products'][0]['name'] == 'Laptop'
        assert data['products'][1]['name'] == 'Mouse'
        assert data['products'][2]['name'] == 'Keyboard'
    
    def test_get_product_by_id_existing(self, client):
        """Test GET /api/products/:id with existing product."""
        response = client.get('/api/products/1')
        
        assert response.status_code == 200
        data = json.loads(response.data)
        
        assert data['id'] == 1
        assert data['name'] == 'Laptop'
        assert data['price'] == 999.99
        assert data['description'] == 'High-performance laptop'
    
    def test_get_product_by_id_not_found(self, client):
        """Test GET /api/products/:id with non-existent product."""
        response = client.get('/api/products/999')
        
        assert response.status_code == 404
        data = json.loads(response.data)
        
        assert data['error'] == 'Product not found'
    
    def test_create_product_valid_data(self, client):
        """Test POST /api/products with valid product data."""
        new_product = {
            'name': 'Test Product',
            'price': 99.99,
            'description': 'A test product'
        }
        
        response = client.post('/api/products',
                             data=json.dumps(new_product),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        assert data['id'] == 4  # Should be next available ID
        assert data['name'] == 'Test Product'
        assert data['price'] == 99.99
        assert data['description'] == 'A test product'
    
    def test_create_product_missing_name(self, client):
        """Test POST /api/products with missing name field."""
        invalid_product = {
            'price': 99.99,
            'description': 'A test product'
        }
        
        response = client.post('/api/products',
                             data=json.dumps(invalid_product),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['error'] == 'Name and price are required'
    
    def test_create_product_missing_price(self, client):
        """Test POST /api/products with missing price field."""
        invalid_product = {
            'name': 'Test Product',
            'description': 'A test product'
        }
        
        response = client.post('/api/products',
                             data=json.dumps(invalid_product),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['error'] == 'Name and price are required'
    
    def test_create_product_without_description(self, client):
        """Test POST /api/products without description (should use empty string)."""
        new_product = {
            'name': 'Test Product',
            'price': 99.99
        }
        
        response = client.post('/api/products',
                             data=json.dumps(new_product),
                             content_type='application/json')
        
        assert response.status_code == 201
        data = json.loads(response.data)
        
        assert data['id'] == 4
        assert data['name'] == 'Test Product'
        assert data['price'] == 99.99
        assert data['description'] == ''
    
    def test_create_product_empty_data(self, client):
        """Test POST /api/products with empty data."""
        response = client.post('/api/products',
                             data=json.dumps({}),
                             content_type='application/json')
        
        assert response.status_code == 400
        data = json.loads(response.data)
        
        assert data['error'] == 'Name and price are required'
    
    def test_create_product_no_json(self, client):
        """Test POST /api/products without JSON content type."""
        response = client.post('/api/products',
                             data='invalid data')
        
        assert response.status_code == 415  # Unsupported Media Type
