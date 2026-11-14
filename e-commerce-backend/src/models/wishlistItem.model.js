'use strict';

module.exports = (sequelize, DataTypes) => {
  const WishlistItem = sequelize.define(
    'WishlistItem',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      wishlistId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'wishlists',
          key: 'id',
        },
      },
      productId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'products',
          key: 'id',
        },
      },
    },
    {
      tableName: 'wishlist_items',
      timestamps: false,
      indexes: [
        {
          unique: true,
          fields: ['wishlistId', 'productId'],
        },
      ],
    }
  );

  return WishlistItem;
};
