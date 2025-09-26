/**
 * Order Service - Business logic for order management  
 * This should only be covered by order-related tests
 */

export interface Order {
  id: number;
  userId: number;
  items: OrderItem[];
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface OrderItem {
  productId: number;
  quantity: number;
  price: number;
}

export class OrderService {
  private orders: Map<number, Order> = new Map();
  private nextId = 1;

  async getOrderById(id: number): Promise<Order> {
    console.log(`Fetching order with ID: ${id}`);
    
    const order = this.orders.get(id);
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }
    
    return order;
  }

  async createOrder(orderData: { userId: number; items: OrderItem[] }): Promise<Order> {
    // Validate order data with comprehensive checks
    if (!orderData.userId || !orderData.items || orderData.items.length === 0) {
      throw new Error('User ID and items are required');
    }

    // Calculate total
    const total = this.calculateOrderTotal(orderData.items);

    const order: Order = {
      id: this.nextId++,
      userId: orderData.userId,
      items: orderData.items,
      total,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    this.orders.set(order.id, order); // Store order with enhanced tracking
    console.log(`Created order: ${order.id} for user ${order.userId} (total: $${order.total})`);
    
    return order;
  }

  private calculateOrderTotal(items: OrderItem[]): number {
    const total = items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    
    // Round to 2 decimal places to avoid floating point precision issues
    return Math.round(total * 100) / 100;
  }

  async updateOrderStatus(id: number, status: Order['status']): Promise<Order> {
    const order = this.orders.get(id);
    if (!order) {
      throw new Error(`Order with ID ${id} not found`);
    }

    order.status = status;
    console.log(`Updated order ${id} status to: ${status}`);
    
    return order;
  }

  async getOrdersByUser(userId: number): Promise<Order[]> {
    const userOrders = Array.from(this.orders.values())
      .filter(order => order.userId === userId);
    
    return userOrders;
  }
}
