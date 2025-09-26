/**
 * Simple Node.js server for TIA demonstration
 * Two distinct endpoints with separate business logic
 */

import express from 'express';
import { UserService } from './user-service';
import { OrderService } from './order-service';

const app = express();
app.use(express.json());

// Initialize services
const userService = new UserService();
const orderService = new OrderService();

/**
 * Health check endpoint - covered by health tests
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'operational',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

/**
 * User management endpoints - covered by user tests
 */
app.get('/users/:id', async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const user = await userService.getUserById(userId);
    res.json(user);
  } catch (error) {
    res.status(404).json({ error: 'User not found' });
  }
});

app.post('/users', async (req, res) => {
  try {
    const userData = req.body;
    const user = await userService.createUser(userData);
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ error: 'Invalid user data' });
  }
});

/**
 * Order management endpoints - covered by order tests
 */
app.get('/orders/:id', async (req, res) => {
  try {
    const orderId = parseInt(req.params.id);
    const order = await orderService.getOrderById(orderId);
    res.json(order);
  } catch (error) {
    res.status(404).json({ error: 'Order not found' });
  }
});

app.post('/orders', async (req, res) => {
  try {
    const orderData = req.body;
    const order = await orderService.createOrder(orderData);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: 'Invalid order data' });
  }
});

// Export app for testing, but don't start server automatically
export { app };

// Only start server if this file is run directly (not during tests)
if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
