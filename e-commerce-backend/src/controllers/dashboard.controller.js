'use strict';

const { fn, col, Op } = require('sequelize');
const { User, Product, Order, OrderItem } = require('../models');

/**
 * Get Admin dashboard summary (ADMIN only)
 * Includes platform metrics, order status distribution, and daily/cumulative bank balance.
 */
async function getAdminDashboard(req, res, next) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalUsers,
      totalSalesPersons,
      totalProducts,
      totalOrders,
      totalPaidRevenue,
      todayPaidRevenue,
      pendingOrdersVolume,
      recentOrders,
      orderStatusCounts,
    ] = await Promise.all([
      User.count({ where: { role: 'USER' } }),
      User.count({ where: { role: 'SALES_PERSON' } }),
      Product.count({ where: { isActive: true } }),
      Order.count(),
      Order.sum('totalAmount', { where: { paymentStatus: 'PAID' } }),
      Order.sum('totalAmount', {
        where: {
          paymentStatus: 'PAID',
          createdAt: { [Op.gte]: startOfToday },
        },
      }),
      Order.sum('totalAmount', { where: { paymentStatus: 'PENDING' } }),
      Order.findAll({
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
          { model: OrderItem, as: 'items' },
        ],
      }),
      Order.findAll({
        attributes: ['orderStatus', [fn('COUNT', col('id')), 'count']],
        group: ['orderStatus'],
      }),
    ]);

    const statusSummary = {};
    orderStatusCounts.forEach((record) => {
      const raw = record.toJSON();
      statusSummary[raw.orderStatus] = parseInt(raw.count, 10);
    });

    const totalBankBalance = parseFloat((totalPaidRevenue || 0).toFixed(2));
    const dailyBankBalance = parseFloat((todayPaidRevenue || 0).toFixed(2));
    const pendingSettlements = parseFloat((pendingOrdersVolume || 0).toFixed(2));

    return res.status(200).json({
      success: true,
      message: 'Admin dashboard summary retrieved successfully',
      data: {
        totalUsers,
        totalSalesPersons,
        totalProducts,
        totalOrders,
        totalRevenue: totalBankBalance,
        bankAccount: {
          dailyBankBalance,
          totalBankBalance,
          pendingSettlements,
          currency: 'INR',
          lastSettlementCheck: new Date().toISOString(),
        },
        statusSummary,
        recentOrders,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get Sales Person dashboard summary (SALES_PERSON or ADMIN)
 */
async function getSalesDashboard(req, res, next) {
  try {
    const sellerId = req.user.id;

    const [totalProductsOwned, soldItems, recentSoldItems] = await Promise.all([
      Product.count({ where: { ownerId: sellerId } }),
      OrderItem.findAll({
        where: { sellerId },
        include: [
          {
            model: Order,
            as: 'order',
            where: { paymentStatus: 'PAID' },
            attributes: ['id', 'orderStatus', 'createdAt'],
          },
        ],
      }),
      OrderItem.findAll({
        where: { sellerId },
        limit: 5,
        order: [['id', 'DESC']],
        include: [
          {
            model: Order,
            as: 'order',
            attributes: ['id', 'orderStatus', 'paymentStatus', 'createdAt'],
          },
          {
            model: Product,
            as: 'product',
            attributes: ['id', 'name', 'images'],
          },
        ],
      }),
    ]);

    let totalItemsSold = 0;
    let totalSalesRevenue = 0;

    soldItems.forEach((item) => {
      totalItemsSold += item.quantity;
      totalSalesRevenue += Number(item.subtotal);
    });

    return res.status(200).json({
      success: true,
      message: 'Sales dashboard summary retrieved successfully',
      data: {
        totalProductsOwned,
        totalItemsSold,
        totalSalesRevenue: parseFloat(totalSalesRevenue.toFixed(2)),
        recentSoldItems,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Get User dashboard summary (Customer)
 */
async function getUserDashboard(req, res, next) {
  try {
    const userId = req.user.id;

    const [totalOrders, paidAmount, recentOrders] = await Promise.all([
      Order.count({ where: { userId } }),
      Order.sum('totalAmount', { where: { userId, paymentStatus: 'PAID' } }),
      Order.findAll({
        where: { userId },
        limit: 5,
        order: [['createdAt', 'DESC']],
        include: [
          {
            model: OrderItem,
            as: 'items',
            include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'images'] }],
          },
        ],
      }),
    ]);

    return res.status(200).json({
      success: true,
      message: 'User dashboard summary retrieved successfully',
      data: {
        totalOrders,
        totalSpent: parseFloat((paidAmount || 0).toFixed(2)),
        recentOrders,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getAdminDashboard,
  getSalesDashboard,
  getUserDashboard,
};
