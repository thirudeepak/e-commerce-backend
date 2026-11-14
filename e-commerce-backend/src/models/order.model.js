'use strict';

module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    'Order',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      totalAmount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      deliveryAddress: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      paymentStatus: {
        type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'REFUNDED'),
        defaultValue: 'PENDING',
        allowNull: false,
      },
      orderStatus: {
        type: DataTypes.ENUM(
          'PENDING',
          'CONFIRMED',
          'PROCESSING',
          'SHIPPED',
          'DELIVERED',
          'CANCELLED'
        ),
        defaultValue: 'PENDING',
        allowNull: false,
      },
      razorpayOrderId: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      razorpayPaymentId: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      razorpaySignature: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    },
    {
      tableName: 'orders',
      timestamps: true,
      indexes: [
        { fields: ['userId'] },
        { fields: ['razorpayOrderId'] },
      ],
    }
  );

  return Order;
};
