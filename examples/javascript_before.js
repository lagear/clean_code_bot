// Dirty JavaScript example — violates multiple SOLID principles

const fs = require('fs');
const nodemailer = require('nodemailer');

let db = [];  // simulated in-memory DB

class OrderProcessor {
  processOrder(order) {
    // validate
    if (!order.id || !order.items || order.items.length == 0) {
      console.log("invalid order");
      return;
    }

    // calculate total
    let total = 0;
    for (let i = 0; i < order.items.length; i++) {
      total += order.items[i].price * order.items[i].qty;
      if (order.items[i].qty > 100) {
        total = total * 0.9; // bulk discount
      }
    }
    order.total = total;

    // apply coupon
    if (order.coupon == "SAVE10") {
      order.total = order.total * 0.90;
    } else if (order.coupon == "SAVE20") {
      order.total = order.total * 0.80;
    }

    // save to db
    db.push(order);
    fs.appendFileSync('orders.json', JSON.stringify(order) + '\n');

    // send email
    let transporter = nodemailer.createTransport({
      host: 'smtp.example.com',
      port: 587,
      auth: { user: 'shop@example.com', pass: 'password123' }
    });
    transporter.sendMail({
      from: 'shop@example.com',
      to: order.customerEmail,
      subject: 'Order Confirmed',
      text: `Your order #${order.id} total is $${order.total}`
    });

    // generate receipt
    let receipt = `ORDER RECEIPT\n=============\n`;
    receipt += `Order ID: ${order.id}\n`;
    for (let item of order.items) {
      receipt += `  ${item.name}: ${item.qty} x $${item.price}\n`;
    }
    receipt += `TOTAL: $${order.total}\n`;
    console.log(receipt);

    return order;
  }

  cancelOrder(orderId, userRole) {
    if (userRole != 'admin' && userRole != 'manager') {
      console.log("not allowed");
      return false;
    }
    let idx = db.findIndex(o => o.id == orderId);
    if (idx === -1) { console.log("not found"); return false; }
    db.splice(idx, 1);
    fs.appendFileSync('orders.json', JSON.stringify({cancelled: orderId}) + '\n');
    return true;
  }
}

module.exports = { OrderProcessor };
