"""
Founded AI — Seed Data Script
Creates realistic demo data: suppliers, products, 180 days of sales history.
Run: python seed_data.py
"""
import sys
import os
import random
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(__file__))

from database import SessionLocal, engine, Base
import models
from auth import hash_password

Base.metadata.create_all(bind=engine)

SUPPLIERS = [
    {"name": "TechCore Distributors", "email": "orders@techcore.com", "phone": "+1-555-0101", "address": "123 Silicon Ave, San Jose, CA 95101"},
    {"name": "Global Supply Co.", "email": "supply@globalsupply.com", "phone": "+1-555-0202", "address": "456 Commerce Blvd, Chicago, IL 60601"},
    {"name": "PremiumParts Ltd.", "email": "sales@premiumparts.com", "phone": "+1-555-0303", "address": "789 Industrial Rd, Detroit, MI 48201"},
    {"name": "Swift Electronics", "email": "info@swiftelectronics.com", "phone": "+1-555-0404", "address": "321 Circuit Dr, Austin, TX 73301"},
]

PRODUCTS = [
    # Electronics
    {"name": "Wireless Bluetooth Headphones", "sku": "ELEC-001", "category": "Electronics", "price": 89.99, "cost_price": 42.00, "current_stock": 85, "minimum_stock": 20, "supplier_idx": 0},
    {"name": "USB-C Fast Charger 65W", "sku": "ELEC-002", "category": "Electronics", "price": 34.99, "cost_price": 14.00, "current_stock": 12, "minimum_stock": 30, "supplier_idx": 3},
    {"name": "Mechanical Gaming Keyboard", "sku": "ELEC-003", "category": "Electronics", "price": 129.99, "cost_price": 58.00, "current_stock": 45, "minimum_stock": 15, "supplier_idx": 3},
    {"name": "Wireless Mouse Ergonomic", "sku": "ELEC-004", "category": "Electronics", "price": 49.99, "cost_price": 22.00, "current_stock": 7, "minimum_stock": 20, "supplier_idx": 3},
    {"name": "4K USB Webcam HD", "sku": "ELEC-005", "category": "Electronics", "price": 79.99, "cost_price": 35.00, "current_stock": 38, "minimum_stock": 10, "supplier_idx": 0},
    {"name": "Portable Power Bank 20000mAh", "sku": "ELEC-006", "category": "Electronics", "price": 44.99, "cost_price": 18.00, "current_stock": 60, "minimum_stock": 25, "supplier_idx": 3},
    # Office Supplies
    {"name": "Executive Office Chair", "sku": "OFFC-001", "category": "Office", "price": 249.99, "cost_price": 110.00, "current_stock": 18, "minimum_stock": 5, "supplier_idx": 1},
    {"name": "Adjustable Standing Desk", "sku": "OFFC-002", "category": "Office", "price": 399.99, "cost_price": 180.00, "current_stock": 0, "minimum_stock": 3, "supplier_idx": 1},
    {"name": "Monitor Arm Dual Mount", "sku": "OFFC-003", "category": "Office", "price": 69.99, "cost_price": 28.00, "current_stock": 5, "minimum_stock": 8, "supplier_idx": 1},
    {"name": "Whiteboard 4x3 ft", "sku": "OFFC-004", "category": "Office", "price": 54.99, "cost_price": 22.00, "current_stock": 23, "minimum_stock": 5, "supplier_idx": 1},
    # Accessories
    {"name": "Laptop Sleeve 15-inch", "sku": "ACCS-001", "category": "Accessories", "price": 24.99, "cost_price": 9.00, "current_stock": 120, "minimum_stock": 30, "supplier_idx": 2},
    {"name": "HDMI Cable 6ft 4K", "sku": "ACCS-002", "category": "Accessories", "price": 12.99, "cost_price": 4.50, "current_stock": 200, "minimum_stock": 50, "supplier_idx": 2},
    {"name": "Cable Management Kit", "sku": "ACCS-003", "category": "Accessories", "price": 18.99, "cost_price": 7.00, "current_stock": 9, "minimum_stock": 15, "supplier_idx": 2},
    {"name": "Webcam Privacy Cover", "sku": "ACCS-004", "category": "Accessories", "price": 7.99, "cost_price": 2.50, "current_stock": 180, "minimum_stock": 40, "supplier_idx": 2},
    # Storage
    {"name": "1TB External SSD", "sku": "STRG-001", "category": "Storage", "price": 89.99, "cost_price": 42.00, "current_stock": 35, "minimum_stock": 10, "supplier_idx": 0},
    {"name": "USB Flash Drive 64GB", "sku": "STRG-002", "category": "Storage", "price": 14.99, "cost_price": 5.50, "current_stock": 4, "minimum_stock": 20, "supplier_idx": 0},
    {"name": "NAS Storage 2-Bay", "sku": "STRG-003", "category": "Storage", "price": 299.99, "cost_price": 140.00, "current_stock": 12, "minimum_stock": 3, "supplier_idx": 0},
    # Networking
    {"name": "Wi-Fi 6 Router AC3000", "sku": "NET-001", "category": "Networking", "price": 149.99, "cost_price": 68.00, "current_stock": 22, "minimum_stock": 8, "supplier_idx": 3},
    {"name": "8-Port Gigabit Switch", "sku": "NET-002", "category": "Networking", "price": 39.99, "cost_price": 16.00, "current_stock": 6, "minimum_stock": 10, "supplier_idx": 3},
    {"name": "Network Patch Cable Cat6", "sku": "NET-003", "category": "Networking", "price": 8.99, "cost_price": 3.00, "current_stock": 300, "minimum_stock": 80, "supplier_idx": 1},
]


def seed_data():
    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(models.User).count() > 0:
            print("Database already seeded. Skipping.")
            return

        print("🌱 Seeding Founded AI database...")

        # Create admin user
        admin = models.User(
            name="Alex Morgan",
            email="admin@founded.ai",
            password_hash=hash_password("founded2024"),
            role=models.UserRole.ADMIN,
        )
        manager = models.User(
            name="Sam Chen",
            email="manager@founded.ai",
            password_hash=hash_password("founded2024"),
            role=models.UserRole.MANAGER,
        )
        staff = models.User(
            name="Jamie Rivera",
            email="staff@founded.ai",
            password_hash=hash_password("founded2024"),
            role=models.UserRole.STAFF,
        )
        db.add_all([admin, manager, staff])
        db.commit()
        print("✅ Users created")

        # Create suppliers
        suppliers = []
        for s in SUPPLIERS:
            supplier = models.Supplier(**s)
            db.add(supplier)
            db.flush()
            suppliers.append(supplier)
        db.commit()
        print(f"✅ {len(suppliers)} suppliers created")

        # Create products
        products = []
        for p_data in PRODUCTS:
            supplier_idx = p_data.pop("supplier_idx")
            p = models.Product(**p_data, supplier_id=suppliers[supplier_idx].id)
            db.add(p)
            db.flush()
            products.append(p)
        db.commit()
        print(f"✅ {len(products)} products created")

        # Create 180 days of sales history
        print("📊 Generating 180 days of sales history...")
        now = datetime.utcnow()
        total_sales = 0

        for day_offset in range(180, 0, -1):
            sale_date = now - timedelta(days=day_offset)

            # Base demand per day varies by product and season
            for product in products:
                if product.current_stock <= 0 and day_offset > 10:
                    continue

                # Simulate realistic demand: weekends higher, some seasonality
                day_of_week = sale_date.weekday()
                is_weekend = 1 if day_of_week >= 5 else 0
                month_factor = 1 + 0.2 * (sale_date.month in [11, 12, 1])  # Holiday boost

                # Base demand: higher for accessories, lower for expensive items
                if product.price < 20:
                    base_demand = random.uniform(3, 12)
                elif product.price < 60:
                    base_demand = random.uniform(2, 8)
                elif product.price < 150:
                    base_demand = random.uniform(1, 5)
                else:
                    base_demand = random.uniform(0.5, 2.5)

                # Apply factors
                adjusted = base_demand * month_factor * (1.3 if is_weekend else 1.0)
                quantity = max(0, int(random.gauss(adjusted, adjusted * 0.3)))

                if quantity <= 0:
                    continue

                # Skip some products to make it realistic (not all sell every day)
                if random.random() < 0.3:
                    continue

                discount = random.choice([0, 0, 0, 5, 10, 15]) if random.random() < 0.2 else 0
                unit_price = product.price
                total_amount = round(quantity * unit_price * (1 - discount / 100), 2)

                sale = models.Sale(
                    product_id=product.id,
                    quantity=quantity,
                    unit_price=unit_price,
                    discount=discount,
                    total_amount=total_amount,
                    sale_date=sale_date,
                )
                db.add(sale)
                total_sales += 1

            if day_offset % 30 == 0:
                db.commit()

        db.commit()
        print(f"✅ {total_sales} sales records created")

        # Create a few purchase orders
        po1 = models.PurchaseOrder(
            supplier_id=suppliers[0].id,
            status=models.PurchaseOrderStatus.APPROVED,
            total_amount=1250.00,
            notes="Quarterly electronics restock",
        )
        db.add(po1)
        db.flush()
        db.add(models.PurchaseOrderItem(
            purchase_order_id=po1.id,
            product_id=products[0].id,
            quantity=50,
            unit_price=products[0].cost_price,
        ))
        db.add(models.PurchaseOrderItem(
            purchase_order_id=po1.id,
            product_id=products[4].id,
            quantity=20,
            unit_price=products[4].cost_price,
        ))

        po2 = models.PurchaseOrder(
            supplier_id=suppliers[2].id,
            status=models.PurchaseOrderStatus.PENDING,
            total_amount=450.00,
            notes="Accessories restock - awaiting approval",
        )
        db.add(po2)
        db.flush()
        db.add(models.PurchaseOrderItem(
            purchase_order_id=po2.id,
            product_id=products[12].id,
            quantity=30,
            unit_price=products[12].cost_price,
        ))

        db.commit()
        print("✅ Purchase orders created")

        print("\n🎉 Seeding complete!")
        print("\n📋 Demo Credentials:")
        print("  Admin   → admin@founded.ai   / founded2024")
        print("  Manager → manager@founded.ai / founded2024")
        print("  Staff   → staff@founded.ai   / founded2024")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_data()
