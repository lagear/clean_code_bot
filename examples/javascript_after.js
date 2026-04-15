'use strict';

/**
 * @fileoverview Order processing module.
 *
 * Separates concerns into single-responsibility classes connected through
 * dependency injection, following SOLID design principles.
 */

// ---------------------------------------------------------------------------
// Domain model
// ---------------------------------------------------------------------------

/**
 * @typedef {Object} OrderItem
 * @property {string} name    - Display name of the product.
 * @property {number} qty     - Quantity ordered.
 * @property {number} price   - Unit price in USD.
 */

/**
 * @typedef {Object} Order
 * @property {string}      id            - Unique order identifier.
 * @property {string}      customerEmail - Recipient email address.
 * @property {OrderItem[]} items         - Line items in the order.
 * @property {string}      [coupon]      - Optional discount coupon code.
 * @property {number}      [total]       - Computed total (set after processing).
 */

// ---------------------------------------------------------------------------
// Input validation (Single Responsibility)
// ---------------------------------------------------------------------------

/**
 * Validates an order before processing.
 */
class OrderValidator {
  /**
   * Assert that the order contains the minimum required fields.
   *
   * @param {Order} order - The order to validate.
   * @throws {Error} If the order is missing required fields.
   */
  validate(order) {
    if (!order.id) throw new Error('Order must have an id.');
    if (!order.customerEmail) throw new Error('Order must have a customerEmail.');
    if (!Array.isArray(order.items) || order.items.length === 0) {
      throw new Error('Order must contain at least one item.');
    }
  }
}

// ---------------------------------------------------------------------------
// Pricing strategies (Open/Closed — new strategies without modifying existing)
// ---------------------------------------------------------------------------

/**
 * Abstract base for discount strategies.
 * @interface
 */
class DiscountStrategy {
  /**
   * Apply a discount to the given subtotal.
   *
   * @param {number} subtotal - The amount before discount.
   * @returns {number} The discounted amount.
   */
  // eslint-disable-next-line no-unused-vars
  apply(subtotal) {
    throw new Error('apply() must be implemented by subclass.');
  }
}

/** No discount applied. */
class NoDiscount extends DiscountStrategy {
  /** @override */
  apply(subtotal) {
    return subtotal;
  }
}

/**
 * Percentage-based discount.
 */
class PercentageDiscount extends DiscountStrategy {
  /**
   * @param {number} percent - Discount percentage (0–100).
   */
  constructor(percent) {
    super();
    this._multiplier = 1 - percent / 100;
  }

  /** @override */
  apply(subtotal) {
    return subtotal * this._multiplier;
  }
}

/**
 * Registry that maps coupon codes to their discount strategies.
 */
class CouponRegistry {
  constructor() {
    /** @type {Map<string, DiscountStrategy>} */
    this._coupons = new Map([
      ['SAVE10', new PercentageDiscount(10)],
      ['SAVE20', new PercentageDiscount(20)],
    ]);
  }

  /**
   * Look up the discount strategy for a coupon code.
   *
   * @param {string|undefined} couponCode - The coupon code to resolve.
   * @returns {DiscountStrategy} The matching strategy, or NoDiscount if unknown.
   */
  resolve(couponCode) {
    return this._coupons.get(couponCode) ?? new NoDiscount();
  }
}

// ---------------------------------------------------------------------------
// Total calculator (Single Responsibility)
// ---------------------------------------------------------------------------

const BULK_QTY_THRESHOLD = 100;
const BULK_DISCOUNT_RATE = 0.9;

/**
 * Computes the total cost of an order, including bulk and coupon discounts.
 */
class OrderCalculator {
  /**
   * @param {CouponRegistry} couponRegistry - Source of coupon discount strategies.
   */
  constructor(couponRegistry) {
    this._couponRegistry = couponRegistry;
  }

  /**
   * Calculate the final total for an order.
   *
   * Bulk discount (10% off) is applied per line item when quantity exceeds
   * {@link BULK_QTY_THRESHOLD}. The coupon discount is applied to the
   * overall subtotal afterwards.
   *
   * @param {Order} order - The order to calculate.
   * @returns {number} The final total in USD.
   */
  calculate(order) {
    const subtotal = order.items.reduce((sum, item) => {
      const lineTotal = item.price * item.qty;
      return sum + (item.qty > BULK_QTY_THRESHOLD ? lineTotal * BULK_DISCOUNT_RATE : lineTotal);
    }, 0);

    const couponDiscount = this._couponRegistry.resolve(order.coupon);
    return couponDiscount.apply(subtotal);
  }
}

// ---------------------------------------------------------------------------
// Persistence (Dependency Inversion — depend on abstraction)
// ---------------------------------------------------------------------------

/**
 * Abstract repository interface for orders.
 * @interface
 */
class OrderRepository {
  /** @param {Order} order @returns {void} */
  // eslint-disable-next-line no-unused-vars
  save(order) { throw new Error('save() not implemented.'); }

  /** @param {string} orderId @returns {void} */
  // eslint-disable-next-line no-unused-vars
  remove(orderId) { throw new Error('remove() not implemented.'); }

  /** @param {string} orderId @returns {Order|undefined} */
  // eslint-disable-next-line no-unused-vars
  findById(orderId) { throw new Error('findById() not implemented.'); }
}

/**
 * In-memory order repository.
 * @implements {OrderRepository}
 */
class InMemoryOrderRepository extends OrderRepository {
  constructor() {
    super();
    /** @type {Map<string, Order>} */
    this._store = new Map();
  }

  /** @override */
  save(order) {
    this._store.set(order.id, order);
  }

  /** @override */
  remove(orderId) {
    this._store.delete(orderId);
  }

  /** @override */
  findById(orderId) {
    return this._store.get(orderId);
  }
}

// ---------------------------------------------------------------------------
// Notification (Single Responsibility)
// ---------------------------------------------------------------------------

/**
 * Abstract notifier interface.
 * @interface
 */
class OrderNotifier {
  /** @param {Order} order @returns {Promise<void>} */
  // eslint-disable-next-line no-unused-vars
  async notifyConfirmation(order) { throw new Error('notifyConfirmation() not implemented.'); }
}

/**
 * Email notifier using nodemailer.
 * @implements {OrderNotifier}
 */
class EmailOrderNotifier extends OrderNotifier {
  /**
   * @param {import('nodemailer').Transporter} transporter - A configured nodemailer transporter.
   * @param {string} senderAddress - The From address for outgoing emails.
   */
  constructor(transporter, senderAddress) {
    super();
    this._transporter = transporter;
    this._sender = senderAddress;
  }

  /** @override */
  async notifyConfirmation(order) {
    await this._transporter.sendMail({
      from: this._sender,
      to: order.customerEmail,
      subject: 'Order Confirmed',
      text: `Your order #${order.id} total is $${order.total.toFixed(2)}`,
    });
  }
}

// ---------------------------------------------------------------------------
// Receipt formatting (Single Responsibility)
// ---------------------------------------------------------------------------

/**
 * Generates a plain-text receipt for an order.
 */
class ReceiptFormatter {
  /**
   * Format an order as a human-readable receipt string.
   *
   * @param {Order} order - A fully processed order (must have `total` set).
   * @returns {string} The formatted receipt.
   */
  format(order) {
    const lines = [
      'ORDER RECEIPT',
      '=============',
      `Order ID: ${order.id}`,
      ...order.items.map(item => `  ${item.name}: ${item.qty} x $${item.price.toFixed(2)}`),
      `TOTAL: $${order.total.toFixed(2)}`,
    ];
    return lines.join('\n');
  }
}

// ---------------------------------------------------------------------------
// Authorization (Single Responsibility)
// ---------------------------------------------------------------------------

const CANCELLATION_ALLOWED_ROLES = new Set(['admin', 'manager']);

/**
 * Authorisation guard for order operations.
 */
class OrderAuthorizer {
  /**
   * Assert that the caller's role permits cancellation.
   *
   * @param {string} role - The caller's role identifier.
   * @throws {Error} If the role is not authorised.
   */
  assertCanCancel(role) {
    if (!CANCELLATION_ALLOWED_ROLES.has(role)) {
      throw new Error(`Role '${role}' is not permitted to cancel orders.`);
    }
  }
}

// ---------------------------------------------------------------------------
// Orchestrating service (thin, delegates to collaborators)
// ---------------------------------------------------------------------------

/**
 * High-level order processing service.
 *
 * All dependencies are injected, keeping this class open for extension
 * but closed for modification (Open/Closed Principle).
 */
class OrderService {
  /**
   * @param {OrderValidator}    validator    - Input validation.
   * @param {OrderCalculator}   calculator   - Pricing and discounts.
   * @param {OrderRepository}   repository   - Persistence.
   * @param {OrderNotifier}     notifier     - Customer notifications.
   * @param {ReceiptFormatter}  formatter    - Receipt generation.
   * @param {OrderAuthorizer}   authorizer   - Role-based access control.
   */
  constructor(validator, calculator, repository, notifier, formatter, authorizer) {
    this._validator   = validator;
    this._calculator  = calculator;
    this._repository  = repository;
    this._notifier    = notifier;
    this._formatter   = formatter;
    this._authorizer  = authorizer;
  }

  /**
   * Process an incoming order end-to-end.
   *
   * Validates the order, computes the total, persists it, sends a
   * confirmation email, and prints the receipt to stdout.
   *
   * @param {Order} order - The order to process.
   * @returns {Promise<Order>} The processed order with `total` populated.
   * @throws {Error} If validation fails or a dependency throws.
   */
  async processOrder(order) {
    this._validator.validate(order);
    order.total = this._calculator.calculate(order);
    this._repository.save(order);
    await this._notifier.notifyConfirmation(order);
    console.log(this._formatter.format(order));
    return order;
  }

  /**
   * Cancel an existing order if the requester has the required role.
   *
   * @param {string} orderId       - ID of the order to cancel.
   * @param {string} requesterRole - Role of the caller.
   * @returns {boolean} True if the order was found and removed.
   * @throws {Error} If the caller is not authorised.
   */
  cancelOrder(orderId, requesterRole) {
    this._authorizer.assertCanCancel(requesterRole);

    const order = this._repository.findById(orderId);
    if (!order) {
      console.warn(`Order not found: ${orderId}`);
      return false;
    }

    this._repository.remove(orderId);
    return true;
  }
}

module.exports = {
  OrderValidator,
  OrderCalculator,
  CouponRegistry,
  InMemoryOrderRepository,
  EmailOrderNotifier,
  ReceiptFormatter,
  OrderAuthorizer,
  OrderService,
};
