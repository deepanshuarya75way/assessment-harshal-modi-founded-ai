"""
Founded AI — Inventory Intelligence Router
Low-stock detection, stockout risk classification, reorder recommendations
"""
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models, schemas
from database import get_db
from auth import get_current_user
from services.inventory_service import (
    get_low_stock_products,
    get_stockout_risk_products,
    get_reorder_recommendations,
)

router = APIRouter(prefix="/api/inventory", tags=["inventory"])


@router.get("/low-stock", response_model=List[schemas.LowStockProduct])
def low_stock(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    """Return products where current_stock <= minimum_stock."""
    return get_low_stock_products(db)


@router.get("/stockout-risk", response_model=List[schemas.StockoutRiskProduct])
def stockout_risk(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    """Classify products by stockout risk (LOW / MEDIUM / HIGH)."""
    return get_stockout_risk_products(db)


@router.get("/recommendations", response_model=List[schemas.ReorderRecommendation])
def reorder_recommendations(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    """Return calculated reorder recommendations for at-risk products."""
    return get_reorder_recommendations(db)
