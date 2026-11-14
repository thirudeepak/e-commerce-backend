'use strict';

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const nodemailer = require('nodemailer');
const logger = require('./logger');

let transporter = null;

/**
 * Initialize or get existing Nodemailer transporter
 */
async function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    // Real SMTP configuration
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
    logger.info(`Nodemailer configured with SMTP host: ${host}:${port}`);
  } else if (process.env.SMTP_SERVICE === 'gmail' && user && pass) {
    // Gmail service configuration
    transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass },
    });
    logger.info('Nodemailer configured with Gmail service');
  } else {
    // Fallback: Automatic Ethereal test account for local development
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      logger.info(
        `Nodemailer initialized with Ethereal Test Account: ${testAccount.user} (Emails can be previewed online)`
      );
    } catch (testErr) {
      logger.warn(`Could not create Ethereal test account: ${testErr.message}. Using JSON transport.`);
      transporter = nodemailer.createTransport({ jsonTransport: true });
    }
  }

  return transporter;
}

/**
 * Format currency in INR
 */
function formatCurrency(amount) {
  const num = Number(amount);
  return isNaN(num) ? '0.00' : num.toLocaleString('en-IN', { minimumFractionDigits: 2 });
}

/**
 * Generate responsive HTML email template for confirmed order
 */
function buildOrderEmailHtml({ user, order, items }) {
  const orderDate = new Date(order.createdAt || Date.now()).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const itemsHtml = (items || [])
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #e2e8f0;">
        <td style="padding: 12px; font-size: 14px; color: #1e293b; font-weight: 500;">
          ${item.productName || (item.product && item.product.name) || 'Product Item'}
        </td>
        <td style="padding: 12px; font-size: 14px; color: #64748b; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px; font-size: 14px; color: #64748b; text-align: right;">
          ₹${formatCurrency(item.price)}
        </td>
        <td style="padding: 12px; font-size: 14px; color: #0f172a; font-weight: 700; text-align: right;">
          ₹${formatCurrency(item.subtotal || Number(item.price) * item.quantity)}
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - NexusMarket</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 30px 10px;">
    <tr>
      <td align="center">
        
        <!-- Main Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                NexusMarket
              </h1>
              <p style="margin: 6px 0 0; color: #94a3b8; font-size: 13px;">
                Multi-Vendor Tech & Lifestyle Marketplace
              </p>
            </td>
          </tr>

          <!-- Confirmation Status -->
          <tr>
            <td style="padding: 30px 28px 20px; text-align: center;">
              <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; border-radius: 50%; background-color: #dcfce7; color: #16a34a; font-size: 24px; font-weight: bold; margin-bottom: 12px;">
                ✓
              </div>
              <h2 style="margin: 0 0 6px; color: #0f172a; font-size: 20px; font-weight: 700;">
                Payment Successful & Order Confirmed!
              </h2>
              <p style="margin: 0; color: #64748b; font-size: 14px;">
                Hi <strong>${user.name || 'Valued Customer'}</strong>, thank you for your purchase. We have received your payment via Razorpay.
              </p>
            </td>
          </tr>

          <!-- Order Summary Card -->
          <tr>
            <td style="padding: 0 28px 20px;">
              <table role="presentation" width="100%" style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; font-size: 13px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Order ID:</strong></td>
                  <td style="padding: 4px 0; color: #0f172a; text-align: right; font-family: monospace; font-weight: 600;">
                    ${order.id}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Order Date:</strong></td>
                  <td style="padding: 4px 0; color: #0f172a; text-align: right;">${orderDate}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Razorpay Payment ID:</strong></td>
                  <td style="padding: 4px 0; color: #0f172a; text-align: right; font-family: monospace;">
                    ${order.razorpayPaymentId || 'N/A'}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Payment Status:</strong></td>
                  <td style="padding: 4px 0; text-align: right;">
                    <span style="background-color: #dcfce7; color: #15803d; font-weight: 700; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                      PAID (RAZORPAY)
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; color: #64748b;"><strong>Delivery Status:</strong></td>
                  <td style="padding: 4px 0; text-align: right;">
                    <span style="background-color: #e0f2fe; color: #0369a1; font-weight: 700; padding: 2px 8px; border-radius: 12px; font-size: 11px;">
                      ${order.orderStatus || 'CONFIRMED'}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Delivery Address Card -->
          <tr>
            <td style="padding: 0 28px 20px;">
              <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 8px; padding: 14px 16px;">
                <span style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #64748b; letter-spacing: 0.5px;">
                  📍 Delivery Address:
                </span>
                <p style="margin: 6px 0 0; font-size: 13px; color: #0f172a; font-weight: 600; line-height: 1.5;">
                  ${order.deliveryAddress || user.address || 'Address provided on profile'}
                </p>
              </div>
            </td>
          </tr>

          <!-- Items Table -->
          <tr>
            <td style="padding: 0 28px 20px;">
              <h3 style="margin: 0 0 12px; font-size: 15px; font-weight: 700; color: #0f172a;">
                Items in Your Order
              </h3>
              <table role="presentation" width="100%" style="border-collapse: collapse;" cellspacing="0" cellpadding="0">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th style="padding: 10px 12px; text-align: left; font-size: 12px; color: #64748b; text-transform: uppercase;">Product</th>
                    <th style="padding: 10px 12px; text-align: center; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Unit Price</th>
                    <th style="padding: 10px 12px; text-align: right; font-size: 12px; color: #64748b; text-transform: uppercase;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- Price Calculation Breakdown -->
          <tr>
            <td style="padding: 0 28px 24px;">
              <table role="presentation" width="100%" style="border-top: 2px solid #e2e8f0; padding-top: 12px;" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #64748b;">Subtotal:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #0f172a; text-align: right; font-weight: 600;">
                    ₹${formatCurrency(order.totalAmount)}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #64748b;">Standard Delivery:</td>
                  <td style="padding: 4px 0; font-size: 14px; color: #16a34a; text-align: right; font-weight: 600;">
                    FREE
                  </td>
                </tr>
                <tr>
                  <td style="padding: 10px 0 0; font-size: 16px; color: #0f172a; font-weight: 800;">Total Paid:</td>
                  <td style="padding: 10px 0 0; font-size: 18px; color: #2563eb; text-align: right; font-weight: 800;">
                    ₹${formatCurrency(order.totalAmount)}
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Next Steps & Help -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 28px; border-top: 1px solid #e2e8f0;">
              <p style="margin: 0 0 6px; font-size: 13px; color: #475569; font-weight: 600;">
                What happens next?
              </p>
              <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Our retail merchant partners are packaging your items. You will receive real-time notifications as your delivery progresses. You can also view your order details any time in the <strong>My Orders</strong> section on NexusMarket.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 20px 28px; text-align: center; font-size: 11px; color: #94a3b8;">
              <p style="margin: 0 0 4px;">NexusMarket Inc. — Verified Multi-Vendor E-Commerce Platform</p>
              <p style="margin: 0;">This email was sent to ${user.email}. If you have questions, please reach out to our customer support.</p>
            </td>
          </tr>

        </table>

      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Generate plain text version of order confirmation
 */
function buildOrderEmailText({ user, order, items }) {
  const itemsText = (items || [])
    .map(
      (item) =>
        `- ${item.productName || (item.product && item.product.name)} (x${item.quantity}): ₹${formatCurrency(item.subtotal || Number(item.price) * item.quantity)}`
    )
    .join('\n');

  return `
NEXUSMARKET - ORDER CONFIRMATION & RECEIPT
=========================================

Hi ${user.name || 'Valued Customer'},

Thank you for shopping with NexusMarket! Your payment has been verified via Razorpay, and your order has been confirmed.

ORDER SUMMARY
-------------
Order ID: ${order.id}
Razorpay Order ID: ${order.razorpayOrderId || 'N/A'}
Razorpay Payment ID: ${order.razorpayPaymentId || 'N/A'}
Date: ${new Date(order.createdAt || Date.now()).toLocaleString('en-IN')}
Payment Status: PAID
Order Status: ${order.orderStatus || 'CONFIRMED'}

DELIVERY ADDRESS
----------------
${order.deliveryAddress || user.address || 'Address provided on profile'}

ITEMS ORDERED
-------------
${itemsText}

TOTAL AMOUNT PAID: ₹${formatCurrency(order.totalAmount)}
Standard Delivery: FREE

You can review your order anytime at: ${process.env.FRONTEND_URL || 'http://localhost:4200'}/orders/my

Thank you for choosing NexusMarket!
  `;
}

/**
 * Send order confirmation email to customer upon successful Razorpay payment
 * @param {Object} payload
 * @param {Object} payload.user - { name, email }
 * @param {Object} payload.order - { id, totalAmount, razorpayOrderId, razorpayPaymentId, createdAt, orderStatus }
 * @param {Array} payload.items - Array of OrderItem
 * @returns {Promise<Object>}
 */
async function sendOrderConfirmationEmail({ user, order, items }) {
  try {
    if (!user || !user.email) {
      logger.warn('Cannot send order confirmation email: recipient email is missing.');
      return null;
    }

    const mailTransporter = await getTransporter();
    const fromAddress =
      process.env.EMAIL_FROM ||
      process.env.SMTP_USER ||
      '"NexusMarket Support" <no-reply@nexusmarket.com>';

    const mailOptions = {
      from: fromAddress,
      to: user.email,
      bcc: process.env.SMTP_USER && process.env.SMTP_USER !== user.email ? process.env.SMTP_USER : undefined,
      subject: `Order Confirmed: #${order.id.substring(0, 8).toUpperCase()} - NexusMarket`,
      text: buildOrderEmailText({ user, order, items }),
      html: buildOrderEmailHtml({ user, order, items }),
    };

    const info = await mailTransporter.sendMail(mailOptions);
    logger.info(`Order confirmation email sent successfully to ${user.email}. MessageId: ${info.messageId}`);

    // If sent via Ethereal test account, log the instant preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      logger.info(`[Email Preview Link]: ${previewUrl}`);
      console.log(`\n📧 [EMAIL SENT]: Order confirmation sent to ${user.email}`);
      console.log(`🔗 [Preview in Browser]: ${previewUrl}\n`);
    }

    return {
      messageId: info.messageId,
      previewUrl: previewUrl || null,
    };
  } catch (err) {
    // Non-blocking: log error so order completion is not disrupted if email service is down
    logger.error(`Failed to send order confirmation email to ${user?.email}: ${err.message}`);
    return null;
  }
}

module.exports = {
  getTransporter,
  sendOrderConfirmationEmail,
};

