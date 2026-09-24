"""
Founded AI — FastAPI Application Entry Point
"""
import os
import sys
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

# Add project root to path so ml/ module can be imported
ROOT_DIR = Path(__file__).parent.parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

load_dotenv()

from database import engine, Base
import models  # noqa: F401 — import to register models

from routers import auth_router, products, suppliers, sales, inventory, forecasts, purchase_orders, analytics, copilot, alerts

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: create DB tables, seed data, train ML model."""
    logger.info("🚀 Founded AI starting up...")

    # Create all tables
    Base.metadata.create_all(bind=engine)
    logger.info("✅ Database tables created/verified")

    # Seed data if database is empty
    try:
        from seed_data import seed_data
        seed_data()
    except Exception as e:
        logger.warning(f"Seed data skipped: {e}")

    # Train ML model if not already trained
    try:
        from ml.train import train_model_if_needed
        train_model_if_needed()
        logger.info("✅ ML model ready")
    except Exception as e:
        logger.warning(f"ML model training skipped (will use fallback): {e}")

    yield
    logger.info("👋 Founded AI shutting down")


app = FastAPI(
    title="Founded AI API",
    description="AI-Powered Business Operations & Intelligence Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth_router.router)
app.include_router(products.router)
app.include_router(suppliers.router)
app.include_router(sales.router)
app.include_router(inventory.router)
app.include_router(forecasts.router)
app.include_router(purchase_orders.router)
app.include_router(analytics.router)
app.include_router(copilot.router)
app.include_router(alerts.router)


@app.get("/")
def root():
    return {
        "app": "Founded AI",
        "tagline": "Predict. Analyze. Decide. Act.",
        "version": "1.0.0",
        "docs": "/docs",
    }


@app.get("/health")
def health():
    return {"status": "healthy"}
