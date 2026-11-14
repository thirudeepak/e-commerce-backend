'use strict';

module.exports = (sequelize, DataTypes) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      orderId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: true,
        references: {
          model: 'products',
          key: 'id',
        },
        comment: 'Nullable — product might be deleted later',
      },
      sellerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
        comment: 'Snapshot of product owner at order time',
      },
      productName: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Snapshot of product name at order time',
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
        },
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Unit price snapshot at order time',
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
    },
    {
      tableName: 'order_items',
      timestamps: false,
    }
  );

  return OrderItem;
};
