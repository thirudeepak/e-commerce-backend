'use strict';

const { sequelize } = require('../config/database');
const { DataTypes } = require('sequelize');

// Import model factories
const defineUser = require('./user.model');
const defineProduct = require('./product.model');
const defineCart = require('./cart.model');
const defineCartItem = require('./cartItem.model');
const defineWishlist = require('./wishlist.model');
const defineWishlistItem = require('./wishlistItem.model');
const defineOrder = require('./order.model');
const defineOrderItem = require('./orderItem.model');
const defineRole = require('./role.model');
const definePermission = require('./permission.model');

// Initialize models
const User = defineUser(sequelize, DataTypes);
const Product = defineProduct(sequelize, DataTypes);
const Cart = defineCart(sequelize, DataTypes);
const CartItem = defineCartItem(sequelize, DataTypes);
const Wishlist = defineWishlist(sequelize, DataTypes);
const WishlistItem = defineWishlistItem(sequelize, DataTypes);
const Order = defineOrder(sequelize, DataTypes);
const OrderItem = defineOrderItem(sequelize, DataTypes);
const Role = defineRole(sequelize, DataTypes);
const Permission = definePermission(sequelize, DataTypes);

// ─── Associations ─────────────────────────────────────────────────────────────

// User <-> Role (RBAC)
Role.hasMany(User, { foreignKey: 'roleId', as: 'users' });
User.belongsTo(Role, { foreignKey: 'roleId', as: 'roleDetails' });

// Role <-> Permission (Many-to-Many RBAC)
Role.belongsToMany(Permission, {
  through: 'role_permissions',
  as: 'permissions',
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  timestamps: false,
});
Permission.belongsToMany(Role, {
  through: 'role_permissions',
  as: 'roles',
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  timestamps: false,
});

// User <-> Product (Owner)
User.hasMany(Product, { foreignKey: 'ownerId', as: 'products', onDelete: 'RESTRICT' });
Product.belongsTo(User, { foreignKey: 'ownerId', as: 'owner' });

// User <-> Cart (1-to-1)
User.hasOne(Cart, { foreignKey: 'userId', as: 'cart', onDelete: 'CASCADE' });
Cart.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Cart <-> CartItem (1-to-Many)
Cart.hasMany(CartItem, { foreignKey: 'cartId', as: 'items', onDelete: 'CASCADE' });
CartItem.belongsTo(Cart, { foreignKey: 'cartId', as: 'cart' });

// Product <-> CartItem (1-to-Many)
Product.hasMany(CartItem, { foreignKey: 'productId', as: 'cartItems', onDelete: 'CASCADE' });
CartItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// User <-> Wishlist (1-to-1)
User.hasOne(Wishlist, { foreignKey: 'userId', as: 'wishlist', onDelete: 'CASCADE' });
Wishlist.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Wishlist <-> WishlistItem (1-to-Many)
Wishlist.hasMany(WishlistItem, { foreignKey: 'wishlistId', as: 'items', onDelete: 'CASCADE' });
WishlistItem.belongsTo(Wishlist, { foreignKey: 'wishlistId', as: 'wishlist' });

// Product <-> WishlistItem (1-to-Many)
Product.hasMany(WishlistItem, { foreignKey: 'productId', as: 'wishlistItems', onDelete: 'CASCADE' });
WishlistItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// User <-> Order (1-to-Many)
User.hasMany(Order, { foreignKey: 'userId', as: 'orders', onDelete: 'RESTRICT' });
Order.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Order <-> OrderItem (1-to-Many)
Order.hasMany(OrderItem, { foreignKey: 'orderId', as: 'items', onDelete: 'CASCADE' });
OrderItem.belongsTo(Order, { foreignKey: 'orderId', as: 'order' });

// OrderItem <-> Product
Product.hasMany(OrderItem, { foreignKey: 'productId', as: 'orderItems', onDelete: 'SET NULL' });
OrderItem.belongsTo(Product, { foreignKey: 'productId', as: 'product' });

// OrderItem <-> User (Seller)
User.hasMany(OrderItem, { foreignKey: 'sellerId', as: 'sellerItems', onDelete: 'RESTRICT' });
OrderItem.belongsTo(User, { foreignKey: 'sellerId', as: 'seller' });

module.exports = {
  sequelize,
  User,
  Product,
  Cart,
  CartItem,
  Wishlist,
  WishlistItem,
  Order,
  OrderItem,
  Role,
  Permission,
};
