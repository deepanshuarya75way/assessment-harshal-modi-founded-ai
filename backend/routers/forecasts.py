"""
Founded AI — Forecasts Router
ML-powered demand forecasting per product
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models, schemas
from database import get_db
from auth import get_current_user
from services.forecast_service import generate_forecasts_for_product, get_model_metrics

router = APIRouter(prefix="/api/forecast", tags=["forecasts"])


@router.get("/{product_id}", response_model=schemas.ForecastResponse)
def get_forecast(
    product_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    result = generate_forecasts_for_product(db, product_id)
    metrics = get_model_metrics()

    return {
        "product_id": product_id,
        "product_name": product.name,
        "historical_demand": result["historical"],
        "forecasts": result["forecasts"],
        "model_metrics": metrics,
    }


@router.get("", response_model=List[schemas.ForecastOut])
def list_all_forecasts(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Return the most recent forecasts for all products."""
    from sqlalchemy import func
    # Get latest forecast per product
    latest = (
        db.query(
            models.Forecast.product_id,
            func.max(models.Forecast.created_at).label("max_created"),
        )
        .group_by(models.Forecast.product_id)
        .subquery()
    )
    forecasts = (
        db.query(models.Forecast)
        .join(latest, (models.Forecast.product_id == latest.c.product_id) &
              (models.Forecast.created_at == latest.c.max_created))
        .all()
    )
    return forecasts
