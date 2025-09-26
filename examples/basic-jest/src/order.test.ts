/**
 * Order Service Tests  
 * These tests should ONLY cover order-service.ts and server.ts order endpoints
 */

import request from 'supertest';
import { app } from './server';
import { OrderService, OrderItem } from './order-service';

describe('Order Management', () => {
  let orderService: OrderService;

  beforeAll(() => {
    orderService = new OrderService();
  });

  // No server cleanup needed since we're only testing the Express app

  describe('OrderService', () => {
    it('should create an order with valid data', async () => {
      const orderData = {
        userId: 1,
        items: [
          { productId: 1, quantity: 2, price: 10.99 },
          { productId: 2, quantity: 1, price: 25.50 }
        ]
      };

      const order = await orderService.createOrder(orderData);

      expect(order).toMatchObject({
        id: expect.any(Number),
        userId: 1,
        items: orderData.items,
        total: 47.48, // (10.99 * 2) + (25.50 * 1)
        status: 'pending',
        createdAt: expect.any(String)
      });
    });

    it('should calculate order total correctly', async () => {
      const orderData = {
        userId: 2,
        items: [
          { productId: 3, quantity: 3, price: 5.00 },
          { productId: 4, quantity: 2, price: 12.75 }
        ]
      };

      const order = await orderService.createOrder(orderData);

      expect(order.total).toBe(40.50); // (5.00 * 3) + (12.75 * 2)
    });

    it('should retrieve order by ID', async () => {
      const orderData = {
        userId: 3,
        items: [{ productId: 5, quantity: 1, price: 99.99 }]
      };

      const createdOrder = await orderService.createOrder(orderData);
      const retrievedOrder = await orderService.getOrderById(createdOrder.id);

      expect(retrievedOrder).toEqual(createdOrder);
    });

    it('should update order status', async () => {
      const orderData = {
        userId: 4,
        items: [{ productId: 6, quantity: 1, price: 15.00 }]
      };

      const order = await orderService.createOrder(orderData);
      const updatedOrder = await orderService.updateOrderStatus(order.id, 'completed');

      expect(updatedOrder.status).toBe('completed');
    });
  });

  describe('Order API Endpoints', () => {
    it('should create order via POST /orders', async () => {
      const orderData = {
        userId: 5,
        items: [
          { productId: 7, quantity: 2, price: 8.50 }
        ]
      };

      const response = await request(app)
        .post('/orders')
        .send(orderData)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(Number),
        userId: 5,
        total: 17.00,
        status: 'pending'
      });
    });

    it('should get order via GET /orders/:id', async () => {
      // First create an order
      const createResponse = await request(app)
        .post('/orders')
        .send({
          userId: 6,
          items: [{ productId: 8, quantity: 1, price: 30.00 }]
        })
        .expect(201);

      const orderId = createResponse.body.id;

      // Then retrieve it
      const getResponse = await request(app)
        .get(`/orders/${orderId}`)
        .expect(200);

      expect(getResponse.body).toMatchObject({
        id: orderId,
        userId: 6,
        total: 30.00,
        status: 'pending'
      });
    });

    it('should return 404 for non-existent order', async () => {
      await request(app)
        .get('/orders/999')
        .expect(404);
    });
  });
});
