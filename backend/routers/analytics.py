"""
Founded AI — Analytics Router
Dashboard KPIs, revenue trends, category breakdown, top products, anomaly detection
"""
from datetime import datetime, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

import models, schemas
from database import get_db
from auth import get_current_user
from services.analytics_service import (
    get_dashboard_stats,
    get_revenue_over_time,
    get_category_revenue,
    get_top_products,
    detect_sales_anomalies,
)

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/dashboard", response_model=schemas.RevenueStats)
def dashboard_stats(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    return get_dashboard_stats(db)


@router.get("/revenue", response_model=List[schemas.DailyRevenue])
def revenue_trend(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return get_revenue_over_time(db, days=days)


@router.get("/categories", response_model=List[schemas.CategoryRevenue])
def category_revenue(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    return get_category_revenue(db)


@router.get("/top-products", response_model=List[schemas.TopProduct])
def top_products(
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return get_top_products(db, limit=limit)


@router.get("/anomalies")
def sales_anomalies(
    days: int = Query(90, ge=7, le=365),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return detect_sales_anomalies(db, days=days)
