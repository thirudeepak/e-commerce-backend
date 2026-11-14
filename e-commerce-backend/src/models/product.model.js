'use strict';

module.exports = (sequelize, DataTypes) => {
  const Product = sequelize.define(
    'Product',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
          min: 0,
        },
      },
      stock: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        validate: {
          min: 0,
        },
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      ownerId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id',
        },
      },
      images: {
        type: DataTypes.JSON,
        defaultValue: [],
        get() {
          const raw = this.getDataValue('images');
          if (!raw) return [];
          if (typeof raw === 'string') {
            try {
              const parsed = JSON.parse(raw);
              return Array.isArray(parsed) ? parsed : [parsed];
            } catch {
              return [];
            }
          }
          return Array.isArray(raw) ? raw : [raw];
        },
        set(value) {
          if (typeof value === 'string') {
            try {
              this.setDataValue('images', JSON.parse(value));
            } catch {
              this.setDataValue('images', []);
            }
          } else {
            this.setDataValue('images', Array.isArray(value) ? value : []);
          }
        },
        comment: 'Array of { url, publicId }',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
      },
    },
    {
      tableName: 'products',
      timestamps: true,
      indexes: [
        { fields: ['category'] },
        { fields: ['ownerId'] },
      ],
    }
  );

  return Product;
};
