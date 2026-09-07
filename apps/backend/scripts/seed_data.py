"""
BaazarSetu — Seed Data Script
Creates sample artisans, buyers, products, market data, enquiries, orders for testing.

Usage: python scripts/seed_data.py
"""
import asyncio
import sys
import os
import uuid
from datetime import datetime, timezone, date, timedelta

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from app.core.config import settings
from app.models import *  # noqa — register all models
from app.core.database import Base


ENGINE = create_async_engine(settings.DATABASE_URL, echo=False)
Session = async_sessionmaker(ENGINE, expire_on_commit=False)


async def seed():
    print("🌱 Seeding database...")

    async with ENGINE.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with Session() as db:
        # ── Market Data ──────────────────────────────────────────────────────
        market_data_rows = [
            MarketData(category="Textiles", craft_type="Banarasi", material="Silk", state="Uttar Pradesh", average_price=3500, min_price=1500, max_price=8000, demand_score=0.85),
            MarketData(category="Textiles", craft_type="Chikankari", material="Cotton", state="Uttar Pradesh", average_price=1200, min_price=600, max_price=3000, demand_score=0.75),
            MarketData(category="Pottery", craft_type="Blue Pottery", material="Clay", state="Rajasthan", average_price=800, min_price=200, max_price=2500, demand_score=0.70),
            MarketData(category="Jewelry", craft_type="Dhokra", material="Brass", state="West Bengal", average_price=1500, min_price=400, max_price=5000, demand_score=0.65),
            MarketData(category="Paintings", craft_type="Madhubani", material="Paper/Canvas", state="Bihar", average_price=2000, min_price=500, max_price=15000, demand_score=0.80),
            MarketData(category="Woodwork", craft_type="Channapatna", material="Rosewood", state="Karnataka", average_price=600, min_price=150, max_price=2000, demand_score=0.60),
            MarketData(category="Textiles", craft_type="Warli", material="Cotton", state="Maharashtra", average_price=900, min_price=300, max_price=2500, demand_score=0.72),
            MarketData(category="Metalwork", craft_type="Bell Metal", material="Bronze", state="Odisha", average_price=2200, min_price=500, max_price=8000, demand_score=0.55),
            MarketData(category="Basketry", craft_type="Bamboo Craft", material="Bamboo", state="Assam", average_price=400, min_price=100, max_price=1500, demand_score=0.65),
            MarketData(category="Leather", craft_type="Mojari", material="Leather", state="Rajasthan", average_price=1800, min_price=600, max_price=4000, demand_score=0.70),
        ]
        for row in market_data_rows:
            db.add(row)
        await db.flush()
        print(f"✅ Created {len(market_data_rows)} market data records")

        # ── Users ─────────────────────────────────────────────────────────────
        user_a1 = User(phone="+919876543210", name="Lakshmi Devi", role=UserRole.artisan, preferred_language="hi", is_verified=True)
        user_a2 = User(phone="+919876543211", name="Rajan Patel", role=UserRole.artisan, preferred_language="gu", is_verified=True)
        user_a3 = User(phone="+919876543212", name="Fatima Khan", role=UserRole.artisan, preferred_language="ur", is_verified=True)
        user_b1 = User(phone="+919876543220", name="Sunita Sharma", role=UserRole.buyer, preferred_language="en", is_verified=True)
        user_b2 = User(phone="+919876543221", name="Rajesh Exports Ltd", role=UserRole.buyer, preferred_language="en", is_verified=True)

        for u in [user_a1, user_a2, user_a3, user_b1, user_b2]:
            db.add(u)
        await db.flush()
        print("✅ Created 5 users (3 artisans, 2 buyers)")

        # ── Artisan Profiles ─────────────────────────────────────────────────
        artisan1 = Artisan(
            user_id=user_a1.user_id, business_name="Lakshmi Handicrafts",
            craft_type="Chikankari", experience_years=15,
            state="Uttar Pradesh", district="Lucknow",
            bio="15 years of traditional Chikankari embroidery. All work done by hand.",
            verification_status=VerificationStatus.verified, rating=4.7,
            total_products=3, production_capacity=50, onboarding_complete=True
        )
        artisan2 = Artisan(
            user_id=user_a2.user_id, business_name="Patel Blue Pottery",
            craft_type="Blue Pottery", experience_years=20,
            state="Rajasthan", district="Jaipur",
            bio="Third generation blue pottery artist from Jaipur.",
            verification_status=VerificationStatus.verified, rating=4.5,
            total_products=2, production_capacity=30, onboarding_complete=True
        )
        artisan3 = Artisan(
            user_id=user_a3.user_id, business_name="Khan Banarasi Weavers",
            craft_type="Banarasi", experience_years=25,
            state="Uttar Pradesh", district="Varanasi",
            bio="Authentic Banarasi silk weaving since 1975.",
            verification_status=VerificationStatus.verified, rating=4.9,
            total_products=2, production_capacity=20, onboarding_complete=True
        )
        for a in [artisan1, artisan2, artisan3]:
            db.add(a)
        await db.flush()
        print("✅ Created 3 artisan profiles")

        # ── Buyer Profiles ────────────────────────────────────────────────────
        buyer1 = Buyer(user_id=user_b1.user_id, buyer_type=BuyerType.individual, state="Maharashtra", district="Mumbai")
        buyer2 = Buyer(user_id=user_b2.user_id, buyer_type=BuyerType.exporter, company_name="Rajesh Exports Ltd", state="Gujarat", district="Surat")
        for b in [buyer1, buyer2]:
            db.add(b)
        await db.flush()
        print("✅ Created 2 buyer profiles")

        # ── Products ──────────────────────────────────────────────────────────
        products = [
            Product(
                seller_id=artisan1.artisan_id, product_name="Chikankari Kurta - White Cotton",
                category="Textiles", subcategory="Kurta", craft_type="Chikankari",
                material="Cotton", colour="White", description="Handmade Chikankari embroidered kurta. Fine white-on-white floral patterns.",
                tags=["chikankari", "kurta", "cotton", "handmade", "traditional"],
                price=1200, ai_suggested_price=1250, market_min_price=600, market_max_price=3000,
                rating=4.8, review_count=12, status=ProductStatus.published, ai_confidence=0.92,
            ),
            Product(
                seller_id=artisan1.artisan_id, product_name="Chikankari Dupatta - Georgette",
                category="Textiles", subcategory="Dupatta", craft_type="Chikankari",
                material="Georgette", colour="Cream", price=800, rating=4.6, review_count=8,
                status=ProductStatus.published, tags=["dupatta", "chikankari", "georgette"],
            ),
            Product(
                seller_id=artisan2.artisan_id, product_name="Blue Pottery Flower Vase",
                category="Pottery", subcategory="Vase", craft_type="Blue Pottery",
                material="Clay", colour="Blue and White", description="Hand-painted Jaipur blue pottery vase with floral motifs.",
                tags=["blue pottery", "vase", "jaipur", "ceramic", "decor"],
                price=650, ai_suggested_price=700, rating=4.5, review_count=5,
                status=ProductStatus.published, ai_confidence=0.88,
            ),
            Product(
                seller_id=artisan3.artisan_id, product_name="Banarasi Silk Saree - Zari Work",
                category="Textiles", subcategory="Saree", craft_type="Banarasi",
                material="Silk", colour="Red and Gold", description="Pure Banarasi silk saree with traditional zari weaving.",
                tags=["banarasi", "saree", "silk", "zari", "wedding"],
                price=4500, ai_suggested_price=5000, market_min_price=1500, market_max_price=8000,
                rating=4.9, review_count=20, status=ProductStatus.published, ai_confidence=0.95,
            ),
            Product(
                seller_id=artisan3.artisan_id, product_name="Banarasi Brocade Blouse Fabric",
                category="Textiles", subcategory="Fabric", craft_type="Banarasi",
                material="Silk Brocade", colour="Green and Gold",
                price=1800, rating=4.7, review_count=9, status=ProductStatus.published,
            ),
        ]
        for p in products:
            db.add(p)
        await db.flush()
        print(f"✅ Created {len(products)} products")

        # ── Inventory ─────────────────────────────────────────────────────────
        inventories = [
            Inventory(product_id=products[0].product_id, available_quantity=25, sold_quantity=40, reorder_level=5, stock_status=StockStatus.in_stock),
            Inventory(product_id=products[1].product_id, available_quantity=15, sold_quantity=20, reorder_level=3, stock_status=StockStatus.in_stock),
            Inventory(product_id=products[2].product_id, available_quantity=8, sold_quantity=12, reorder_level=3, stock_status=StockStatus.in_stock),
            Inventory(product_id=products[3].product_id, available_quantity=5, sold_quantity=15, reorder_level=2, stock_status=StockStatus.low_stock),
            Inventory(product_id=products[4].product_id, available_quantity=10, sold_quantity=5, reorder_level=2, stock_status=StockStatus.in_stock),
        ]
        for inv in inventories:
            db.add(inv)
        await db.flush()
        print("✅ Created inventory records")

        # ── Catalogs ──────────────────────────────────────────────────────────
        catalog1 = Catalog(
            product_id=products[0].product_id,
            generated_title="Chikankari Kurta — Hand-Embroidered White Cotton",
            generated_description="A masterpiece of Lucknow's finest Chikankari tradition, this pristine white cotton kurta features intricate hand-embroidered floral patterns. Each stitch reflects 15 years of artisanal skill passed down through generations. Perfect for festive occasions or elegant daily wear.",
            generated_category="Textiles", generated_subcategory="Ethnic Wear",
            generated_craft_type="Chikankari", generated_material="Premium Cotton",
            generated_colour="White", generated_tags=["chikankari", "kurta", "lucknow", "handmade", "ethnic"],
            seo_keywords=["chikankari kurta online", "lucknow embroidery", "handmade kurta india"],
        )
        db.add(catalog1)

        # ── Reviews ───────────────────────────────────────────────────────────
        reviews = [
            Review(buyer_id=buyer1.buyer_id, product_id=products[0].product_id, rating=5, review_text="Beautiful work! Very fine embroidery."),
            Review(buyer_id=buyer1.buyer_id, product_id=products[3].product_id, rating=5, review_text="Authentic Banarasi quality. Worth every rupee."),
        ]
        for r in reviews:
            db.add(r)

        # ── Enquiry ───────────────────────────────────────────────────────────
        enquiry = Enquiry(
            buyer_id=buyer2.buyer_id, seller_id=artisan1.artisan_id,
            product_id=products[0].product_id, required_quantity=200,
            budget=200000, proposed_price=950, delivery_date=date.today() + timedelta(days=60),
            message="We need 200 Chikankari kurtas for export. Can you handle bulk production?",
            status=EnquiryStatus.pending,
        )
        db.add(enquiry)

        await db.commit()
        print("✅ Created reviews and enquiry")

    print("\n🎉 Seeding complete!")
    print("📋 Test credentials:")
    print("   Artisan: +919876543210 (OTP: 123456 in dev mode)")
    print("   Buyer:   +919876543220 (OTP: 123456 in dev mode)")
    await ENGINE.dispose()


if __name__ == "__main__":
    asyncio.run(seed())
