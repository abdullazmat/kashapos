import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Tenant from "@/models/Tenant";
import User from "@/models/User";
import Branch from "@/models/Branch";
import Category from "@/models/Category";
import Product from "@/models/Product";
import Stock from "@/models/Stock";
import Customer from "@/models/Customer";
import Vendor from "@/models/Vendor";
import Sale from "@/models/Sale";
import Invoice from "@/models/Invoice";
import PurchaseOrder from "@/models/PurchaseOrder";
import { hashPassword } from "@/lib/auth";

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(daysBack: number) {
  const d = new Date();
  d.setDate(d.getDate() - Math.floor(Math.random() * daysBack));
  d.setHours(randomBetween(7, 21), randomBetween(0, 59), randomBetween(0, 59));
  return d;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export async function POST() {
  try {
    await dbConnect();

    // Check if seed data already exists
    const existingTenant = await Tenant.findOne({ slug: "corner-cafe" });
    if (existingTenant) {
      return NextResponse.json({ message: "Seed data already exists" });
    }

    // Create demo tenants for each plan
    const tenants = await Tenant.create([
      {
        name: "Corner Cafe",
        slug: "corner-cafe",
        email: "basic@poscloud.me",
        phone: "+256700100200",
        plan: "basic",
        saasProduct: "retail",
        settings: { currency: "UGX", taxRate: 18, lowStockThreshold: 10 },
      },
      {
        name: "MedPlus Pharmacy",
        slug: "medplus-pharmacy",
        email: "pro@poscloud.com",
        phone: "+256700300400",
        plan: "professional",
        saasProduct: "pharmacy",
        settings: { currency: "UGX", taxRate: 0, lowStockThreshold: 20 },
      },
      {
        name: "CityWide Retail",
        slug: "citywide-retail",
        email: "enterprise@poscloud.com",
        phone: "+256700500600",
        plan: "enterprise",
        saasProduct: "retail",
        settings: { currency: "UGX", taxRate: 18, lowStockThreshold: 15 },
      },
    ]);

    // Create branches for tenant 1
    const branches = await Branch.create([
      {
        tenantId: tenants[0]._id,
        name: "Main Branch",
        code: "MAIN",
        isMain: true,
      },
      {
        tenantId: tenants[1]._id,
        name: "Main Pharmacy",
        code: "MAIN",
        isMain: true,
      },
      {
        tenantId: tenants[2]._id,
        name: "Downtown Store",
        code: "DT01",
        isMain: true,
      },
      {
        tenantId: tenants[2]._id,
        name: "Mall Branch",
        code: "ML01",
        isMain: false,
      },
    ]);

    // Create users
    const password = await hashPassword("basic123");
    const proPassword = await hashPassword("pro123");
    const entPassword = await hashPassword("enterprise23");

    await User.create([
      {
        tenantId: tenants[0]._id,
        name: "Sarah Nakamya",
        email: "basic@poscloud.me",
        password: password,
        role: "admin",
        branchId: branches[0]._id,
      },
      {
        tenantId: tenants[0]._id,
        name: "John Mukasa",
        email: "cashier@poscloud.me",
        password: password,
        role: "cashier",
        branchId: branches[0]._id,
      },
      {
        tenantId: tenants[1]._id,
        name: "Dr. Peter Okello",
        email: "pro@poscloud.com",
        password: proPassword,
        role: "admin",
        branchId: branches[1]._id,
      },
      {
        tenantId: tenants[2]._id,
        name: "Grace Atim",
        email: "enterprise@poscloud.com",
        password: entPassword,
        role: "admin",
        branchId: branches[2]._id,
      },
    ]);

    // Create categories for tenant 1
    const categories = await Category.create([
      {
        tenantId: tenants[0]._id,
        name: "Beverages",
        slug: "beverages",
        description: "Hot and cold drinks",
      },
      {
        tenantId: tenants[0]._id,
        name: "Food",
        slug: "food",
        description: "Meals and snacks",
      },
      {
        tenantId: tenants[0]._id,
        name: "Bakery",
        slug: "bakery",
        description: "Fresh baked goods",
      },
      {
        tenantId: tenants[0]._id,
        name: "Supplies",
        slug: "supplies",
        description: "Cafe supplies",
      },
    ]);

    // Create products for tenant 1
    const products = await Product.create([
      {
        tenantId: tenants[0]._id,
        name: "Cappuccino",
        slug: "cappuccino",
        sku: "BEV-CAP-001",
        barcode: "1000000000001",
        categoryId: categories[0]._id,
        price: 8000,
        costPrice: 3000,
        taxRate: 18,
        unit: "cup",
      },
      {
        tenantId: tenants[0]._id,
        name: "Espresso",
        slug: "espresso",
        sku: "BEV-ESP-001",
        barcode: "1000000000002",
        categoryId: categories[0]._id,
        price: 6000,
        costPrice: 2000,
        taxRate: 18,
        unit: "cup",
      },
      {
        tenantId: tenants[0]._id,
        name: "Fresh Juice",
        slug: "fresh-juice",
        sku: "BEV-JUI-001",
        barcode: "1000000000003",
        categoryId: categories[0]._id,
        price: 7000,
        costPrice: 3500,
        taxRate: 18,
        unit: "glass",
      },
      {
        tenantId: tenants[0]._id,
        name: "Chicken Sandwich",
        slug: "chicken-sandwich",
        sku: "FOD-CSW-001",
        barcode: "1000000000004",
        categoryId: categories[1]._id,
        price: 15000,
        costPrice: 7000,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: tenants[0]._id,
        name: "Beef Burger",
        slug: "beef-burger",
        sku: "FOD-BBG-001",
        barcode: "1000000000005",
        categoryId: categories[1]._id,
        price: 18000,
        costPrice: 8500,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: tenants[0]._id,
        name: "Croissant",
        slug: "croissant",
        sku: "BAK-CRO-001",
        barcode: "1000000000006",
        categoryId: categories[2]._id,
        price: 5000,
        costPrice: 2000,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: tenants[0]._id,
        name: "Chocolate Cake",
        slug: "chocolate-cake",
        sku: "BAK-CHO-001",
        barcode: "1000000000007",
        categoryId: categories[2]._id,
        price: 12000,
        costPrice: 5000,
        taxRate: 18,
        unit: "slice",
      },
      {
        tenantId: tenants[0]._id,
        name: "Bottled Water",
        slug: "bottled-water",
        sku: "BEV-WAT-001",
        barcode: "1000000000008",
        categoryId: categories[0]._id,
        price: 2000,
        costPrice: 800,
        taxRate: 18,
        unit: "bottle",
      },
      {
        tenantId: tenants[0]._id,
        name: "Tea",
        slug: "tea",
        sku: "BEV-TEA-001",
        barcode: "1000000000009",
        categoryId: categories[0]._id,
        price: 4000,
        costPrice: 1500,
        taxRate: 18,
        unit: "cup",
      },
      {
        tenantId: tenants[0]._id,
        name: "Paper Napkins",
        slug: "paper-napkins",
        sku: "SUP-NAP-001",
        barcode: "1000000000010",
        categoryId: categories[3]._id,
        price: 3000,
        costPrice: 1200,
        taxRate: 18,
        unit: "pack",
      },
    ]);

    // Create stock entries
    for (const product of products) {
      await Stock.create({
        tenantId: tenants[0]._id,
        productId: product._id,
        branchId: branches[0]._id,
        quantity: Math.floor(Math.random() * 200) + 50,
        reorderLevel: 10,
      });
    }

    // Create customers
    await Customer.create([
      {
        tenantId: tenants[0]._id,
        name: "Agnes Nantongo",
        phone: "+256701234567",
        email: "agnes@email.com",
      },
      {
        tenantId: tenants[0]._id,
        name: "Robert Ssemakula",
        phone: "+256702345678",
        email: "robert@email.com",
      },
      {
        tenantId: tenants[0]._id,
        name: "Faith Auma",
        phone: "+256703456789",
        email: "faith@email.com",
      },
    ]);

    // Create vendors
    await Vendor.create([
      {
        tenantId: tenants[0]._id,
        name: "Uganda Coffee Co.",
        phone: "+256700111222",
        email: "supply@ugcoffee.co.ug",
        contactPerson: "James Ochieng",
      },
      {
        tenantId: tenants[0]._id,
        name: "FreshBake Supplies",
        phone: "+256700333444",
        email: "orders@freshbake.co.ug",
        contactPerson: "Mary Kisakye",
      },
    ]);

    return NextResponse.json(
      { message: "Seed data created successfully" },
      { status: 201 },
    );
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Failed to seed data" }, { status: 500 });
  }
}

// PUT: Full reseed with comprehensive transaction data
export async function PUT() {
  try {
    await dbConnect();

    // Clear all existing data
    await Promise.all([
      Tenant.deleteMany({}),
      User.deleteMany({}),
      Branch.deleteMany({}),
      Category.deleteMany({}),
      Product.deleteMany({}),
      Stock.deleteMany({}),
      Customer.deleteMany({}),
      Vendor.deleteMany({}),
      Sale.deleteMany({}),
      Invoice.deleteMany({}),
      PurchaseOrder.deleteMany({}),
    ]);

    // ── Tenants ──
    const tenants = await Tenant.create([
      {
        name: "Corner Cafe",
        slug: "corner-cafe",
        email: "basic@poscloud.me",
        phone: "+256700100200",
        plan: "basic",
        saasProduct: "retail",
        settings: {
          currency: "UGX",
          taxRate: 18,
          lowStockThreshold: 10,
          receiptHeader: "Corner Cafe - Quality Coffee & Food",
          receiptFooter: "Thank you for visiting Corner Cafe!",
        },
      },
      {
        name: "MedPlus Pharmacy",
        slug: "medplus-pharmacy",
        email: "pro@poscloud.com",
        phone: "+256700300400",
        plan: "professional",
        saasProduct: "pharmacy",
        settings: { currency: "UGX", taxRate: 0, lowStockThreshold: 20 },
      },
      {
        name: "CityWide Retail",
        slug: "citywide-retail",
        email: "enterprise@poscloud.com",
        phone: "+256700500600",
        plan: "enterprise",
        saasProduct: "retail",
        settings: { currency: "UGX", taxRate: 18, lowStockThreshold: 15 },
      },
    ]);

    const t = tenants[0]; // Corner Cafe

    // ── Branches ──
    const branches = await Branch.create([
      {
        tenantId: t._id,
        name: "Main Branch",
        code: "MAIN",
        isMain: true,
        address: "123 Kampala Road",
        phone: "+256700100200",
      },
      {
        tenantId: t._id,
        name: "Garden City Branch",
        code: "GC01",
        isMain: false,
        address: "Garden City Mall, Yusuf Lule Rd",
        phone: "+256700100300",
      },
      {
        tenantId: tenants[1]._id,
        name: "Main Pharmacy",
        code: "MAIN",
        isMain: true,
      },
      {
        tenantId: tenants[2]._id,
        name: "Downtown Store",
        code: "DT01",
        isMain: true,
      },
      {
        tenantId: tenants[2]._id,
        name: "Mall Branch",
        code: "ML01",
        isMain: false,
      },
    ]);

    // ── Users ──
    const password = await hashPassword("basic123");
    const proPassword = await hashPassword("pro123");
    const entPassword = await hashPassword("enterprise23");

    const users = await User.create([
      {
        tenantId: t._id,
        name: "Sarah Nakamya",
        email: "basic@poscloud.me",
        password,
        role: "admin",
        branchId: branches[0]._id,
      },
      {
        tenantId: t._id,
        name: "John Mukasa",
        email: "cashier@poscloud.me",
        password,
        role: "cashier",
        branchId: branches[0]._id,
      },
      {
        tenantId: t._id,
        name: "Grace Apio",
        email: "manager@poscloud.me",
        password,
        role: "manager",
        branchId: branches[0]._id,
      },
      {
        tenantId: tenants[1]._id,
        name: "Dr. Peter Okello",
        email: "pro@poscloud.com",
        password: proPassword,
        role: "admin",
        branchId: branches[2]._id,
      },
      {
        tenantId: tenants[2]._id,
        name: "Grace Atim",
        email: "enterprise@poscloud.com",
        password: entPassword,
        role: "admin",
        branchId: branches[3]._id,
      },
    ]);

    // ── Categories ──
    const categories = await Category.create([
      {
        tenantId: t._id,
        name: "Hot Beverages",
        slug: "hot-beverages",
        description: "Coffee, tea, and warm drinks",
      },
      {
        tenantId: t._id,
        name: "Cold Beverages",
        slug: "cold-beverages",
        description: "Juices, smoothies, and cold drinks",
      },
      {
        tenantId: t._id,
        name: "Meals",
        slug: "meals",
        description: "Main dishes and combos",
      },
      {
        tenantId: t._id,
        name: "Snacks",
        slug: "snacks",
        description: "Quick bites and sides",
      },
      {
        tenantId: t._id,
        name: "Bakery",
        slug: "bakery",
        description: "Fresh baked goods",
      },
      {
        tenantId: t._id,
        name: "Desserts",
        slug: "desserts",
        description: "Cakes, pastries, and sweets",
      },
    ]);

    // ── Products ──
    const products = await Product.create([
      {
        tenantId: t._id,
        name: "Cappuccino",
        slug: "cappuccino",
        sku: "HB-CAP-001",
        barcode: "1000000000001",
        categoryId: categories[0]._id,
        price: 8000,
        costPrice: 3000,
        taxRate: 18,
        unit: "cup",
      },
      {
        tenantId: t._id,
        name: "Espresso",
        slug: "espresso",
        sku: "HB-ESP-001",
        barcode: "1000000000002",
        categoryId: categories[0]._id,
        price: 6000,
        costPrice: 2000,
        taxRate: 18,
        unit: "cup",
      },
      {
        tenantId: t._id,
        name: "Latte",
        slug: "latte",
        sku: "HB-LAT-001",
        barcode: "1000000000003",
        categoryId: categories[0]._id,
        price: 9000,
        costPrice: 3500,
        taxRate: 18,
        unit: "cup",
      },
      {
        tenantId: t._id,
        name: "Hot Chocolate",
        slug: "hot-chocolate",
        sku: "HB-HOT-001",
        barcode: "1000000000004",
        categoryId: categories[0]._id,
        price: 7000,
        costPrice: 2800,
        taxRate: 18,
        unit: "cup",
      },
      {
        tenantId: t._id,
        name: "Green Tea",
        slug: "green-tea",
        sku: "HB-GRN-001",
        barcode: "1000000000005",
        categoryId: categories[0]._id,
        price: 4000,
        costPrice: 1500,
        taxRate: 18,
        unit: "cup",
      },
      {
        tenantId: t._id,
        name: "Fresh Orange Juice",
        slug: "orange-juice",
        sku: "CB-ORA-001",
        barcode: "1000000000006",
        categoryId: categories[1]._id,
        price: 7000,
        costPrice: 3500,
        taxRate: 18,
        unit: "glass",
      },
      {
        tenantId: t._id,
        name: "Mango Smoothie",
        slug: "mango-smoothie",
        sku: "CB-MAN-001",
        barcode: "1000000000007",
        categoryId: categories[1]._id,
        price: 10000,
        costPrice: 4500,
        taxRate: 18,
        unit: "glass",
      },
      {
        tenantId: t._id,
        name: "Bottled Water",
        slug: "bottled-water",
        sku: "CB-WAT-001",
        barcode: "1000000000008",
        categoryId: categories[1]._id,
        price: 2000,
        costPrice: 800,
        taxRate: 18,
        unit: "bottle",
      },
      {
        tenantId: t._id,
        name: "Iced Coffee",
        slug: "iced-coffee",
        sku: "CB-ICE-001",
        barcode: "1000000000009",
        categoryId: categories[1]._id,
        price: 8500,
        costPrice: 3200,
        taxRate: 18,
        unit: "glass",
      },
      {
        tenantId: t._id,
        name: "Chicken Sandwich",
        slug: "chicken-sandwich",
        sku: "ML-CSW-001",
        barcode: "1000000000010",
        categoryId: categories[2]._id,
        price: 15000,
        costPrice: 7000,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: t._id,
        name: "Beef Burger",
        slug: "beef-burger",
        sku: "ML-BBG-001",
        barcode: "1000000000011",
        categoryId: categories[2]._id,
        price: 18000,
        costPrice: 8500,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: t._id,
        name: "Grilled Chicken",
        slug: "grilled-chicken",
        sku: "ML-GCH-001",
        barcode: "1000000000012",
        categoryId: categories[2]._id,
        price: 22000,
        costPrice: 10000,
        taxRate: 18,
        unit: "plate",
      },
      {
        tenantId: t._id,
        name: "Veggie Wrap",
        slug: "veggie-wrap",
        sku: "ML-VWR-001",
        barcode: "1000000000013",
        categoryId: categories[2]._id,
        price: 12000,
        costPrice: 5000,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: t._id,
        name: "French Fries",
        slug: "french-fries",
        sku: "SN-FFR-001",
        barcode: "1000000000014",
        categoryId: categories[3]._id,
        price: 6000,
        costPrice: 2500,
        taxRate: 18,
        unit: "serving",
      },
      {
        tenantId: t._id,
        name: "Samosa",
        slug: "samosa",
        sku: "SN-SAM-001",
        barcode: "1000000000015",
        categoryId: categories[3]._id,
        price: 3000,
        costPrice: 1200,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: t._id,
        name: "Spring Roll",
        slug: "spring-roll",
        sku: "SN-SPR-001",
        barcode: "1000000000016",
        categoryId: categories[3]._id,
        price: 4000,
        costPrice: 1800,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: t._id,
        name: "Croissant",
        slug: "croissant",
        sku: "BK-CRO-001",
        barcode: "1000000000017",
        categoryId: categories[4]._id,
        price: 5000,
        costPrice: 2000,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: t._id,
        name: "Chocolate Muffin",
        slug: "chocolate-muffin",
        sku: "BK-CMF-001",
        barcode: "1000000000018",
        categoryId: categories[4]._id,
        price: 6000,
        costPrice: 2500,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: t._id,
        name: "Cinnamon Roll",
        slug: "cinnamon-roll",
        sku: "BK-CIN-001",
        barcode: "1000000000019",
        categoryId: categories[4]._id,
        price: 5500,
        costPrice: 2200,
        taxRate: 18,
        unit: "pcs",
      },
      {
        tenantId: t._id,
        name: "Chocolate Cake",
        slug: "chocolate-cake",
        sku: "DS-CHO-001",
        barcode: "1000000000020",
        categoryId: categories[5]._id,
        price: 12000,
        costPrice: 5000,
        taxRate: 18,
        unit: "slice",
      },
      {
        tenantId: t._id,
        name: "Cheesecake",
        slug: "cheesecake",
        sku: "DS-CHE-001",
        barcode: "1000000000021",
        categoryId: categories[5]._id,
        price: 14000,
        costPrice: 6000,
        taxRate: 18,
        unit: "slice",
      },
      {
        tenantId: t._id,
        name: "Ice Cream",
        slug: "ice-cream",
        sku: "DS-ICE-001",
        barcode: "1000000000022",
        categoryId: categories[5]._id,
        price: 8000,
        costPrice: 3500,
        taxRate: 18,
        unit: "scoop",
      },
    ]);

    // ── Stock ──
    for (const product of products) {
      await Stock.create({
        tenantId: t._id,
        productId: product._id,
        branchId: branches[0]._id,
        quantity: randomBetween(20, 300),
        reorderLevel: randomBetween(8, 25),
      });
    }
    // Some low-stock items for alerts
    await Stock.findOneAndUpdate(
      { tenantId: t._id, productId: products[14]._id },
      { quantity: 3, reorderLevel: 15 },
    );
    await Stock.findOneAndUpdate(
      { tenantId: t._id, productId: products[19]._id },
      { quantity: 5, reorderLevel: 12 },
    );
    await Stock.findOneAndUpdate(
      { tenantId: t._id, productId: products[7]._id },
      { quantity: 4, reorderLevel: 20 },
    );

    // ── Customers ──
    const customers = await Customer.create([
      {
        tenantId: t._id,
        name: "Agnes Nantongo",
        phone: "+256701234567",
        email: "agnes@email.com",
        address: "Ntinda, Kampala",
      },
      {
        tenantId: t._id,
        name: "Robert Ssemakula",
        phone: "+256702345678",
        email: "robert@email.com",
        address: "Kololo, Kampala",
      },
      {
        tenantId: t._id,
        name: "Faith Auma",
        phone: "+256703456789",
        email: "faith@email.com",
        address: "Bukoto, Kampala",
      },
      {
        tenantId: t._id,
        name: "David Ochieng",
        phone: "+256704567890",
        email: "david.o@email.com",
        address: "Naguru, Kampala",
      },
      {
        tenantId: t._id,
        name: "Patricia Nakato",
        phone: "+256705678901",
        email: "patricia@email.com",
        address: "Muyenga, Kampala",
      },
      {
        tenantId: t._id,
        name: "Joseph Kizza",
        phone: "+256706789012",
        email: "joseph.k@email.com",
        address: "Kisaasi, Kampala",
      },
      {
        tenantId: t._id,
        name: "Esther Namutebi",
        phone: "+256707890123",
        email: "esther@email.com",
        address: "Wandegeya, Kampala",
      },
      {
        tenantId: t._id,
        name: "Moses Lubega",
        phone: "+256708901234",
        email: "moses@email.com",
        address: "Makerere, Kampala",
      },
    ]);

    // ── Vendors ──
    const vendors = await Vendor.create([
      {
        tenantId: t._id,
        name: "Uganda Coffee Co.",
        phone: "+256700111222",
        email: "supply@ugcoffee.co.ug",
        contactPerson: "James Ochieng",
        address: "Industrial Area, Kampala",
      },
      {
        tenantId: t._id,
        name: "FreshBake Supplies",
        phone: "+256700333444",
        email: "orders@freshbake.co.ug",
        contactPerson: "Mary Kisakye",
        address: "Mukono Road",
      },
      {
        tenantId: t._id,
        name: "FarmFresh Distributors",
        phone: "+256700555666",
        email: "info@farmfresh.ug",
        contactPerson: "Samuel Wabwire",
        address: "Jinja Road, Kampala",
      },
      {
        tenantId: t._id,
        name: "Nile Beverages Ltd",
        phone: "+256700777888",
        email: "trade@nilebev.co.ug",
        contactPerson: "Christine Adero",
        address: "Luzira, Kampala",
      },
    ]);

    // ── Sales (80 transactions: 10 today, 20 this week, 50 over last 30 days) ──
    const paymentMethods: ("cash" | "card" | "mobile_money")[] = [
      "cash",
      "card",
      "mobile_money",
    ];
    const cashierIds = [users[0]._id, users[1]._id, users[2]._id];

    function todayDate() {
      const d = new Date();
      d.setHours(
        randomBetween(7, 21),
        randomBetween(0, 59),
        randomBetween(0, 59),
      );
      return d;
    }

    function thisWeekDate() {
      const d = new Date();
      d.setDate(d.getDate() - randomBetween(1, 6));
      d.setHours(
        randomBetween(7, 21),
        randomBetween(0, 59),
        randomBetween(0, 59),
      );
      return d;
    }

    const saleDates: Date[] = [];
    // 10 sales today
    for (let i = 0; i < 10; i++) saleDates.push(todayDate());
    // 20 sales this week
    for (let i = 0; i < 20; i++) saleDates.push(thisWeekDate());
    // 50 sales over last 30 days
    for (let i = 0; i < 50; i++) saleDates.push(randomDate(30));

    for (let i = 0; i < saleDates.length; i++) {
      const saleDate = saleDates[i];
      const numItems = randomBetween(1, 5);
      const items = [];
      const usedProducts = new Set<number>();

      for (let j = 0; j < numItems; j++) {
        let pIdx: number;
        do {
          pIdx = randomBetween(0, products.length - 1);
        } while (usedProducts.has(pIdx));
        usedProducts.add(pIdx);

        const p = products[pIdx];
        const qty = randomBetween(1, 4);
        const tax = Math.round(p.price * qty * (p.taxRate / 100));
        items.push({
          productId: p._id,
          productName: p.name,
          sku: p.sku,
          quantity: qty,
          unitPrice: p.price,
          discount: 0,
          discountType: "fixed" as const,
          tax,
          total: p.price * qty + tax,
        });
      }

      const subtotal = items.reduce(
        (s, it) => s + it.unitPrice * it.quantity,
        0,
      );
      const totalTax = items.reduce((s, it) => s + it.tax, 0);
      const total = subtotal + totalTax;
      const pm = pickRandom(paymentMethods);
      const hasCustomer = Math.random() > 0.4;
      const customer = hasCustomer ? pickRandom(customers) : null;

      await Sale.create({
        tenantId: t._id,
        branchId: branches[0]._id,
        orderNumber: `ORD-${String(saleDate.getFullYear()).slice(-2)}${String(saleDate.getMonth() + 1).padStart(2, "0")}${String(saleDate.getDate()).padStart(2, "0")}-${String(1000 + i).slice(-4)}`,
        customerId: customer?._id,
        items,
        subtotal,
        totalDiscount: 0,
        totalTax,
        total,
        paymentMethod: pm,
        paymentDetails:
          pm === "cash"
            ? { cashAmount: total, changeGiven: 0 }
            : pm === "card"
              ? { cardAmount: total }
              : {
                  mobileMoneyAmount: total,
                  mobileMoneyProvider: pickRandom(["mtn", "airtel"] as const),
                },
        status: "completed",
        cashierId: pickRandom(cashierIds),
        createdAt: saleDate,
        updatedAt: saleDate,
      });

      if (customer) {
        await Customer.findByIdAndUpdate(customer._id, {
          $inc: { totalPurchases: 1, totalSpent: total },
        });
      }
    }

    // ── Invoices ──
    const invoiceStatuses: ("draft" | "sent" | "paid" | "overdue")[] = [
      "draft",
      "sent",
      "paid",
      "overdue",
    ];
    for (let i = 0; i < 12; i++) {
      const cust = pickRandom(customers);
      const numItems = randomBetween(1, 4);
      const invItems = [];
      for (let j = 0; j < numItems; j++) {
        const p = pickRandom(products);
        const qty = randomBetween(1, 10);
        const tax = Math.round(p.price * qty * 0.18);
        invItems.push({
          description: p.name,
          quantity: qty,
          unitPrice: p.price,
          tax,
          total: p.price * qty + tax,
        });
      }
      const subtotal = invItems.reduce(
        (s, it) => s + it.unitPrice * it.quantity,
        0,
      );
      const totalTax = invItems.reduce((s, it) => s + it.tax, 0);
      const total = subtotal + totalTax;
      const status = pickRandom(invoiceStatuses);
      const amountPaid =
        status === "paid"
          ? total
          : status === "overdue"
            ? Math.round(total * 0.3)
            : 0;
      const createdDate = randomDate(45);
      const dueDate = new Date(createdDate);
      dueDate.setDate(dueDate.getDate() + randomBetween(7, 30));

      await Invoice.create({
        tenantId: t._id,
        invoiceNumber: `INV-${String(createdDate.getFullYear()).slice(-2)}${String(createdDate.getMonth() + 1).padStart(2, "0")}-${String(1000 + i).slice(-4)}`,
        customerId: cust._id,
        items: invItems,
        subtotal,
        totalTax,
        total,
        amountPaid,
        balance: total - amountPaid,
        status,
        dueDate,
        notes:
          status === "overdue"
            ? "Payment overdue - follow up with customer"
            : "",
        createdBy: users[0]._id,
        createdAt: createdDate,
        updatedAt: createdDate,
      });
    }

    // ── Purchase Orders ──
    const poStatuses: ("draft" | "ordered" | "partial" | "received")[] = [
      "draft",
      "ordered",
      "partial",
      "received",
    ];
    for (let i = 0; i < 8; i++) {
      const vendor = pickRandom(vendors);
      const numItems = randomBetween(2, 5);
      const poItems = [];
      const usedProds = new Set<number>();
      for (let j = 0; j < numItems; j++) {
        let pIdx: number;
        do {
          pIdx = randomBetween(0, products.length - 1);
        } while (usedProds.has(pIdx));
        usedProds.add(pIdx);
        const p = products[pIdx];
        const qty = randomBetween(10, 100);
        const received = i > 4 ? qty : i > 2 ? Math.floor(qty * 0.6) : 0;
        poItems.push({
          productId: p._id,
          productName: p.name,
          quantity: qty,
          unitCost: p.costPrice,
          receivedQuantity: received,
          total: p.costPrice * qty,
        });
      }
      const subtotal = poItems.reduce((s, it) => s + it.total, 0);
      const tax = Math.round(subtotal * 0.18);
      const shipping = randomBetween(5000, 30000);
      const total = subtotal + tax + shipping;
      const status = poStatuses[Math.min(i, poStatuses.length - 1)];
      const paymentStatus =
        status === "received"
          ? ("paid" as const)
          : status === "partial"
            ? ("partial" as const)
            : ("unpaid" as const);
      const amountPaid =
        paymentStatus === "paid"
          ? total
          : paymentStatus === "partial"
            ? Math.round(total * 0.5)
            : 0;
      const createdDate = randomDate(60);

      await PurchaseOrder.create({
        tenantId: t._id,
        orderNumber: `PO-${String(1000 + i)}`,
        vendorId: vendor._id,
        branchId: branches[0]._id,
        items: poItems,
        subtotal,
        tax,
        shippingCost: shipping,
        total,
        status,
        paymentStatus,
        amountPaid,
        expectedDelivery: new Date(
          createdDate.getTime() + 7 * 24 * 60 * 60 * 1000,
        ),
        notes: "",
        createdBy: users[0]._id,
        createdAt: createdDate,
        updatedAt: createdDate,
      });

      // Update vendor stats
      await Vendor.findByIdAndUpdate(vendor._id, {
        $inc: { totalOrders: 1, totalPaid: amountPaid },
      });
    }

    return NextResponse.json(
      {
        message:
          "Full reseed completed with 22 products, 8 customers, 4 vendors, 80 sales (10 today), 12 invoices, 8 purchase orders",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Full reseed error:", error);
    return NextResponse.json(
      { error: "Failed to reseed: " + (error as Error).message },
      { status: 500 },
    );
  }
}
