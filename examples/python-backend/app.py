from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# Global data stores (in-memory for simplicity)
users = [
    {"id": 1, "name": "John Doe", "email": "john@example.com"},
    {"id": 2, "name": "Jane Smith", "email": "jane@example.com"}
]

products = [
    {"id": 1, "name": "Laptop", "price": 999.99, "description": "High-performance laptop"},
    {"id": 2, "name": "Mouse", "price": 29.99, "description": "Wireless mouse"},
    {"id": 3, "name": "Keyboard", "price": 79.99, "description": "Mechanical keyboard"}
]

# Root endpoint for API info
@app.route('/')
def home_page():
    return jsonify({
        "message": "Python Backend API",
        "version": "1.0.0",
        "endpoints": {
            "users": "/api/users",
            "products": "/api/products", 
            "health": "/api/health"
        }
    })

@app.route('/api/users', methods=['GET'])
def get_users():
    return jsonify({"users": users})

@app.route('/api/users/<int:user_id>', methods=['GET'])
def get_user_by_id(user_id):
    user = next((u for u in users if u["id"] == user_id), None)
    if user:
        return jsonify(user)
    return jsonify({"error": "User not found"}), 404

@app.route('/api/users', methods=['POST'])
def create_user():
    data = request.get_json()
    if not data or 'name' not in data or 'email' not in data:
        return jsonify({"error": "Name and email are required"}), 400
    
    new_user = {
        "id": len(users) + 1,
        "name": data["name"],
        "email": data["email"]
    }
    users.append(new_user)
    return jsonify(new_user), 201

@app.route('/api/products', methods=['GET'])
def get_products():
    return jsonify({"products": products})

@app.route('/api/products/<int:product_id>', methods=['GET'])
def get_product_by_id(product_id):
    product = next((p for p in products if p["id"] == product_id), None)
    if product:
        return jsonify(product)
    return jsonify({"error": "Product not found"}), 404

@app.route('/api/products', methods=['POST'])
def create_product():
    data = request.get_json()
    if not data or 'name' not in data or 'price' not in data:
        return jsonify({"error": "Name and price are required"}), 400
    
    new_product = {
        "id": len(products) + 1,
        "name": data["name"],
        "price": data["price"],
        "description": data.get("description", "")
    }
    products.append(new_product)
    return jsonify(new_product), 201

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "version": "1.0.0"
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)