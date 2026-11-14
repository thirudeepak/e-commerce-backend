'use strict';

require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('../config/database');
const {
  sequelize,
  Role,
  Permission,
  User,
  Product,
  Cart,
  Wishlist,
  WishlistItem,
} = require('../models');

async function seed() {
  console.log('====================================================');
  console.log('🚀 Starting Database Seeder (RBAC, Users, Products)');
  console.log('====================================================');

  await connectDB();

  // ─── 1. Seed Roles ──────────────────────────────────────────────────────────
  console.log('\n[1/6] Seeding RBAC Roles...');
  const rolesData = [
    { name: 'ADMIN', description: 'System Administrator with platform-wide governance' },
    { name: 'SALES_PERSON', description: 'Retail Merchant / Shop Owner selling products' },
    { name: 'USER', description: 'Customer purchasing products and managing orders' },
  ];

  const roleMap = {};
  for (const r of rolesData) {
    const [role] = await Role.findOrCreate({
      where: { name: r.name },
      defaults: r,
    });
    roleMap[r.name] = role;
  }
  console.log(`✓ 3 Roles verified: ${Object.keys(roleMap).join(', ')}`);

  // ─── 2. Seed Permissions ────────────────────────────────────────────────────
  console.log('\n[2/6] Seeding Permissions...');
  const permissionsData = [
    { name: 'products:create_own', resource: 'products', action: 'create', description: 'Create own products' },
    { name: 'products:update_own', resource: 'products', action: 'update', description: 'Update own products' },
    { name: 'products:delete_own', resource: 'products', action: 'delete', description: 'Delete own products' },
    { name: 'products:manage_all', resource: 'products', action: 'manage', description: 'Manage all platform products' },
    { name: 'orders:view_own', resource: 'orders', action: 'read', description: 'View own customer orders' },
    { name: 'orders:view_seller', resource: 'orders', action: 'read', description: 'View seller-related order items' },
    { name: 'orders:view_all', resource: 'orders', action: 'read', description: 'View all platform orders' },
    { name: 'orders:update_status', resource: 'orders', action: 'update', description: 'Update order lifecycle status' },
    { name: 'dashboard:view_admin', resource: 'dashboard', action: 'read', description: 'View admin dashboard analytics' },
    { name: 'dashboard:view_sales', resource: 'dashboard', action: 'read', description: 'View sales person dashboard' },
    { name: 'dashboard:view_user', resource: 'dashboard', action: 'read', description: 'View user dashboard summary' },
    { name: 'bank:view_balance', resource: 'finance', action: 'read', description: 'View platform daily bank account balance' },
    { name: 'users:manage_rbac', resource: 'users', action: 'manage', description: 'Create and manage users with RBAC' },
    { name: 'cart:manage', resource: 'cart', action: 'manage', description: 'Add, update, and clear shopping cart' },
    { name: 'wishlist:manage', resource: 'wishlist', action: 'manage', description: 'Add, view, and clear wishlist' },
  ];

  const permissionMap = {};
  for (const p of permissionsData) {
    const [perm] = await Permission.findOrCreate({
      where: { name: p.name },
      defaults: p,
    });
    permissionMap[p.name] = perm;
  }
  console.log(`✓ ${Object.keys(permissionMap).length} Permissions verified.`);

  // ─── 3. Map Permissions to Roles (RBAC Junction) ────────────────────────────
  console.log('\n[3/6] Mapping Permissions to Roles in role_permissions...');
  const adminPermissions = Object.values(permissionMap);
  const salesPermissions = [
    permissionMap['products:create_own'],
    permissionMap['products:update_own'],
    permissionMap['products:delete_own'],
    permissionMap['orders:view_seller'],
    permissionMap['orders:view_own'],
    permissionMap['dashboard:view_sales'],
    permissionMap['cart:manage'],
    permissionMap['wishlist:manage'],
  ].filter(Boolean);

  const userPermissions = [
    permissionMap['orders:view_own'],
    permissionMap['dashboard:view_user'],
    permissionMap['cart:manage'],
    permissionMap['wishlist:manage'],
  ].filter(Boolean);

  await roleMap['ADMIN'].setPermissions(adminPermissions);
  await roleMap['SALES_PERSON'].setPermissions(salesPermissions);
  await roleMap['USER'].setPermissions(userPermissions);
  console.log('✓ Role-Permission associations mapped successfully.');

  // ─── 4. Seed 5 Users (1 Admin, 2 Sales Persons, 2 Users) ─────────────────────
  console.log('\n[4/6] Seeding 5 Users...');
  const defaultPassword = 'Password123!';
  const salt = await bcrypt.genSalt(12);
  const hashedPassword = await bcrypt.hash(defaultPassword, salt);

  const usersData = [
    {
      name: 'Super Admin',
      email: 'admin@ecommerce.com',
      password: hashedPassword,
      role: 'ADMIN',
      roleId: roleMap['ADMIN'].id,
      isActive: true,
    },
    {
      name: 'Apex Electronics',
      email: 'seller1@ecommerce.com',
      password: hashedPassword,
      role: 'SALES_PERSON',
      roleId: roleMap['SALES_PERSON'].id,
      isActive: true,
    },
    {
      name: 'Prime Gear & Lifestyle',
      email: 'seller2@ecommerce.com',
      password: hashedPassword,
      role: 'SALES_PERSON',
      roleId: roleMap['SALES_PERSON'].id,
      isActive: true,
    },
    {
      name: 'Alice Customer',
      email: 'alice@ecommerce.com',
      password: hashedPassword,
      role: 'USER',
      roleId: roleMap['USER'].id,
      address: 'Flat 402, Sunshine Residency, 100 Feet Road, Indiranagar, Bengaluru, Karnataka - 560038',
      isActive: true,
    },
    {
      name: 'Bob Customer',
      email: 'bob@ecommerce.com',
      password: hashedPassword,
      role: 'USER',
      roleId: roleMap['USER'].id,
      address: 'Plot 18, Green Meadows Colony, Banjara Hills Road No. 12, Hyderabad, Telangana - 500034',
      isActive: true,
    },
  ];

  const userMap = {};
  for (const u of usersData) {
    let user = await User.findOne({ where: { email: u.email } });
    if (!user) {
      user = await User.create(u);
    } else {
      user.name = u.name;
      user.role = u.role;
      user.roleId = u.roleId;
      user.password = u.password;
      user.address = u.address;
      await user.save();
    }
    userMap[u.email] = user;

    // Ensure Cart and Wishlist exist
    await Cart.findOrCreate({ where: { userId: user.id } });
    await Wishlist.findOrCreate({ where: { userId: user.id } });
  }
  console.log('✓ 5 Users verified with respective Carts and Wishlists.');

  // ─── 5. Seed 30 Products (10 for Seller 1, 20 for Seller 2) ──────────────────
  console.log('\n[5/6] Seeding 30 Segregated Products (10 for Seller 1, 20 for Seller 2)...');
  const seller1 = userMap['seller1@ecommerce.com'];
  const seller2 = userMap['seller2@ecommerce.com'];

  const productsList = [
    // Seller 1 (Apex Electronics) — 10 Products
    {
      name: 'Sony WH-1000XM5 Wireless Headphones',
      description: 'Industry-leading noise cancellation with two processors and 8 microphones. Up to 30 hours battery life.',
      price: 28990.00,
      stock: 25,
      category: 'Audio',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800', publicId: 'ecommerce/products/sony_wh1000xm5' }],
    },
    {
      name: 'Apple AirPods Pro (2nd Gen)',
      description: 'Active Noise Cancellation, Adaptive Transparency, and Personalized Spatial Audio with dynamic head tracking.',
      price: 24900.00,
      stock: 40,
      category: 'Audio',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1600294037681-c80b4cb5b434?w=800', publicId: 'ecommerce/products/airpods_pro_2' }],
    },
    {
      name: 'Logitech MX Master 3S Wireless Mouse',
      description: 'Quiet clicks and 8K DPI track-on-glass sensor. MagSpeed electromagnetic scrolling for supreme speed and precision.',
      price: 8995.00,
      stock: 50,
      category: 'Computer Peripherals',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1615663245857-ac93bb7c39e7?w=800', publicId: 'ecommerce/products/logitech_mx_master_3s' }],
    },
    {
      name: 'Keychron K2 Mechanical Keyboard',
      description: 'Wireless Bluetooth mechanical keyboard with Gateron Brown tactile switches and RGB LED backlighting.',
      price: 7499.00,
      stock: 35,
      category: 'Computer Peripherals',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=800', publicId: 'ecommerce/products/keychron_k2' }],
    },
    {
      name: 'Dell UltraSharp 27" 4K USB-C Hub Monitor',
      description: 'IPS Black technology with 2000:1 contrast ratio, 4K UHD resolution, 98% DCI-P3 color gamut, and 90W power delivery.',
      price: 45500.00,
      stock: 15,
      category: 'Electronics',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=800', publicId: 'ecommerce/products/dell_ultrasharp_27' }],
    },
    {
      name: 'Bose QuietComfort 45 Bluetooth Headphones',
      description: 'Legendary noise cancelling, high-fidelity audio, and lightweight comfort. TriPort acoustic architecture.',
      price: 22990.00,
      stock: 20,
      category: 'Audio',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800', publicId: 'ecommerce/products/bose_qc45' }],
    },
    {
      name: 'Anker 737 Power Bank 24,000mAh',
      description: 'Equipped with Power Delivery 3.1 and bi-directional technology to quickly recharge the portable charger or get a 140W ultra-powerful charge.',
      price: 11999.00,
      stock: 60,
      category: 'Electronics',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1609091839311-d5365f9ff1c5?w=800', publicId: 'ecommerce/products/anker_737' }],
    },
    {
      name: 'Samsung T7 Shield 2TB Portable SSD',
      description: 'Rugged durability with IP65 rating for water and dust resistance. Blazing read/write speeds up to 1,050/1,000 MB/s.',
      price: 15499.00,
      stock: 45,
      category: 'Storage',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=800', publicId: 'ecommerce/products/samsung_t7_shield' }],
    },
    {
      name: 'JBL Flip 6 Portable Bluetooth Speaker',
      description: 'Bold sound with 2-way speaker system engineered to deliver loud, crystal-clear, powerful sound with IP67 waterproof protection.',
      price: 9999.00,
      stock: 55,
      category: 'Audio',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800', publicId: 'ecommerce/products/jbl_flip_6' }],
    },
    {
      name: 'Elgato Stream Deck MK.2',
      description: '15 customizable LCD keys to control apps, tools, and platforms. One-touch tactile operation for live streaming and productivity.',
      price: 13499.00,
      stock: 30,
      category: 'Computer Peripherals',
      ownerId: seller1.id,
      images: [{ url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?w=800', publicId: 'ecommerce/products/elgato_stream_deck' }],
    },

    // Seller 2 (Prime Gear & Lifestyle) — 20 Products
    {
      name: 'Apple Watch Series 9 GPS 45mm',
      description: 'S9 SiP with Double Tap gesture, brighter Always-On Retina display, and on-device Siri with health tracking.',
      price: 41900.00,
      stock: 20,
      category: 'Wearables',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=800', publicId: 'ecommerce/products/apple_watch_series_9' }],
    },
    {
      name: 'Samsung Galaxy Watch 6 Classic 47mm',
      description: 'Iconic rotating bezel, sapphire crystal glass, advanced sleep coaching, and ECG blood pressure monitoring.',
      price: 36999.00,
      stock: 25,
      category: 'Wearables',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=800', publicId: 'ecommerce/products/galaxy_watch_6' }],
    },
    {
      name: 'Kindle Paperwhite (16 GB)',
      description: '6.8" display with adjustable warm light, up to 10 weeks of battery life, and 20% faster page turns.',
      price: 14999.00,
      stock: 50,
      category: 'Electronics',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?w=800', publicId: 'ecommerce/products/kindle_paperwhite' }],
    },
    {
      name: 'Garmin Forerunner 265 Running Smartwatch',
      description: 'Brilliant AMOLED touchscreen display with training readiness score, multi-band GPS, and wrist-based running dynamics.',
      price: 46490.00,
      stock: 15,
      category: 'Wearables',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1510017803434-a899398421b3?w=800', publicId: 'ecommerce/products/garmin_forerunner_265' }],
    },
    {
      name: 'Fitbit Charge 6 Fitness Tracker',
      description: 'Built-in GPS, YouTube Music controls, Google Maps integration, 40+ exercise modes, and 7-day battery life.',
      price: 14999.00,
      stock: 40,
      category: 'Wearables',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1576243345690-4e4b79b63288?w=800', publicId: 'ecommerce/products/fitbit_charge_6' }],
    },
    {
      name: 'Philips Hue White and Color Starter Kit',
      description: '3 E27 smart bulbs, Hue Bridge, and smart dimmer switch. 16 million colors to transform your room atmosphere.',
      price: 12999.00,
      stock: 30,
      category: 'Smart Home',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1550525811-e5869dd03032?w=800', publicId: 'ecommerce/products/philips_hue_kit' }],
    },
    {
      name: 'Amazon Echo Show 10 (3rd Gen)',
      description: '10.1" HD screen that moves with you during video calls or recipe instructions. Premium 2.1 sound system.',
      price: 24999.00,
      stock: 20,
      category: 'Smart Home',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1543512214-318c7553f230?w=800', publicId: 'ecommerce/products/echo_show_10' }],
    },
    {
      name: 'Google Nest Cam (Outdoor or Indoor Battery)',
      description: 'Smart security camera with wire-free installation. Intelligent alerts differentiate between people, vehicles, and animals.',
      price: 17999.00,
      stock: 35,
      category: 'Smart Home',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1557324232-b8917d3c3dcb?w=800', publicId: 'ecommerce/products/google_nest_cam' }],
    },
    {
      name: 'Peak Design Everyday Backpack 20L',
      description: 'Iconic award-winning pack for everyday and photo carry. Weatherproof 100% recycled 400D nylon canvas shell.',
      price: 26500.00,
      stock: 18,
      category: 'Lifestyle & Gear',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=800', publicId: 'ecommerce/products/peak_design_backpack' }],
    },
    {
      name: 'Bellroy Slim Sleeve Leather Wallet',
      description: 'Compact bifold wallet crafted from environmentally certified leather. Holds 4 to 12 cards with pull-tab quick access.',
      price: 6200.00,
      stock: 60,
      category: 'Accessories',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=800', publicId: 'ecommerce/products/bellroy_slim_sleeve' }],
    },
    {
      name: 'Hydro Flask 32 oz Wide Mouth Bottle',
      description: 'TempShield double-wall vacuum insulation keeps drinks cold for up to 24 hours. Pro-grade stainless steel construction.',
      price: 3850.00,
      stock: 80,
      category: 'Lifestyle & Gear',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=800', publicId: 'ecommerce/products/hydro_flask_32' }],
    },
    {
      name: 'Herman Miller Aeron Ergonomic Headrest',
      description: 'Engineered specifically for the Herman Miller Aeron chair to provide ergonomic posture support and relieves neck fatigue.',
      price: 14500.00,
      stock: 22,
      category: 'Office',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1580481077194-e3bc6a26df04?w=800', publicId: 'ecommerce/products/aeron_headrest' }],
    },
    {
      name: 'BenQ ScreenBar Halo LED Monitor Light',
      description: 'Zero screen glare, wireless rotary controller, and ambient back light for balanced workspace illumination.',
      price: 14990.00,
      stock: 30,
      category: 'Office',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800', publicId: 'ecommerce/products/benq_screenbar_halo' }],
    },
    {
      name: 'Grovemade Walnut Desk Pad (Large)',
      description: 'Premium natural merino wool felt combined with American Black Walnut leather accents for an elevated workspace.',
      price: 9800.00,
      stock: 25,
      category: 'Office',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1593642532400-2682810df593?w=800', publicId: 'ecommerce/products/grovemade_desk_pad' }],
    },
    {
      name: 'CalDigit TS4 Thunderbolt 4 Dock',
      description: '18 ports of extreme connectivity with 98W Power Delivery, 2.5 Gigabit Ethernet, and dual 6K display support.',
      price: 36000.00,
      stock: 12,
      category: 'Computer Peripherals',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1544652478-6653e09f18a2?w=800', publicId: 'ecommerce/products/caldigit_ts4' }],
    },
    {
      name: 'Razer BlackShark V2 Pro Wireless Gaming Headset',
      description: 'TriForce Titanium 50mm drivers and HyperClear Super Wideband Mic for esports competitive audio.',
      price: 17999.00,
      stock: 30,
      category: 'Audio',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1599669454699-248893623440?w=800', publicId: 'ecommerce/products/razer_blackshark_v2' }],
    },
    {
      name: 'Tile Pro Bluetooth Item Finder (4-Pack)',
      description: 'Up to 400 ft range, loud ring, and water-resistant design. Compatible with Android and iOS devices.',
      price: 8499.00,
      stock: 45,
      category: 'Accessories',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1584438784894-089d6a62b8fa?w=800', publicId: 'ecommerce/products/tile_pro_4pack' }],
    },
    {
      name: 'Marshall Emberton II Bluetooth Speaker',
      description: '30+ hours of portable playtime with True Stereophonic 360-degree sound and IP67 dust and water resistance.',
      price: 16999.00,
      stock: 28,
      category: 'Audio',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=800', publicId: 'ecommerce/products/marshall_emberton_2' }],
    },
    {
      name: 'Nespresso Vertuo Pop Coffee Machine',
      description: 'Brews 4 cup sizes at the touch of a button with Centrifusion extraction technology. Compact and colorful design.',
      price: 15999.00,
      stock: 20,
      category: 'Smart Home',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1517668808822-9ebb02f2a0e6?w=800', publicId: 'ecommerce/products/nespresso_vertuo_pop' }],
    },
    {
      name: 'Ember Temperature Control Smart Mug 2 (14 oz)',
      description: 'Maintains your chosen drinking temperature (120°F - 145°F) for up to 80 minutes on a single charge or all day on the charging coaster.',
      price: 13995.00,
      stock: 35,
      category: 'Smart Home',
      ownerId: seller2.id,
      images: [{ url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800', publicId: 'ecommerce/products/ember_smart_mug_2' }],
    },
  ];

  const createdProducts = [];
  for (const p of productsList) {
    let product = await Product.findOne({ where: { name: p.name } });
    if (!product) {
      product = await Product.create(p);
    } else {
      product.description = p.description;
      product.price = p.price;
      product.stock = p.stock;
      product.category = p.category;
      product.ownerId = p.ownerId;
      product.images = p.images;
      await product.save();
    }
    createdProducts.push(product);
  }

  const s1Count = createdProducts.filter((p) => p.ownerId === seller1.id).length;
  const s2Count = createdProducts.filter((p) => p.ownerId === seller2.id).length;
  console.log(`✓ 30 Products verified (Seller 1 owns: ${s1Count}, Seller 2 owns: ${s2Count})`);

  // ─── 6. Seed Wishlists for the 2 Users ───────────────────────────────────────
  console.log('\n[6/6] Seeding Wishlist items for Customer 1 (Alice) and Customer 2 (Bob)...');
  const alice = userMap['alice@ecommerce.com'];
  const bob = userMap['bob@ecommerce.com'];

  const aliceWishlist = await Wishlist.findOne({ where: { userId: alice.id } });
  const bobWishlist = await Wishlist.findOne({ where: { userId: bob.id } });

  // Clear existing to prevent duplicate errors
  await WishlistItem.destroy({ where: { wishlistId: aliceWishlist.id } });
  await WishlistItem.destroy({ where: { wishlistId: bobWishlist.id } });

  // Alice's wishlist (2 from Seller 1, 2 from Seller 2)
  const aliceProductNames = [
    'Sony WH-1000XM5 Wireless Headphones', // Seller 1
    'Keychron K2 Mechanical Keyboard',     // Seller 1
    'Apple Watch Series 9 GPS 45mm',       // Seller 2
    'Peak Design Everyday Backpack 20L',   // Seller 2
  ];

  for (const pName of aliceProductNames) {
    const prod = createdProducts.find((p) => p.name === pName);
    if (prod) {
      await WishlistItem.create({
        wishlistId: aliceWishlist.id,
        productId: prod.id,
      });
    }
  }

  // Bob's wishlist (2 from Seller 1, 2 from Seller 2)
  const bobProductNames = [
    'Dell UltraSharp 27" 4K USB-C Hub Monitor', // Seller 1
    'Bose QuietComfort 45 Bluetooth Headphones', // Seller 1
    'Kindle Paperwhite (16 GB)',                 // Seller 2
    'CalDigit TS4 Thunderbolt 4 Dock',           // Seller 2
  ];

  for (const pName of bobProductNames) {
    const prod = createdProducts.find((p) => p.name === pName);
    if (prod) {
      await WishlistItem.create({
        wishlistId: bobWishlist.id,
        productId: prod.id,
      });
    }
  }

  console.log('✓ Alice wishlist populated with 4 products (2 from Seller 1, 2 from Seller 2).');
  console.log('✓ Bob wishlist populated with 4 products (2 from Seller 1, 2 from Seller 2).');

  console.log('\n====================================================');
  console.log('🎉 SEEDING COMPLETED SUCCESSFULLY!');
  console.log('====================================================');
  console.log('Test Credentials (Password for all: Password123!):');
  console.log('1. Admin:         admin@ecommerce.com      (ADMIN)');
  console.log('2. Sales Person 1: seller1@ecommerce.com    (SALES_PERSON - 10 Products)');
  console.log('3. Sales Person 2: seller2@ecommerce.com    (SALES_PERSON - 20 Products)');
  console.log('4. Customer 1:    alice@ecommerce.com      (USER - 4 Wishlist items)');
  console.log('5. Customer 2:    bob@ecommerce.com        (USER - 4 Wishlist items)');
  console.log('====================================================\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seeder failed:', err);
  process.exit(1);
});

