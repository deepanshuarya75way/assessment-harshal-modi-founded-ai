"""
Founded AI — Forecast Service
ML-powered demand forecasting using trained RandomForestRegressor.
The model is trained on synthetic historical sales data with realistic features.
"""
import os
import json
import math
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional

import joblib
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import func

import models

logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "ml_models")
MODEL_PATH = os.path.join(MODEL_DIR, "demand_forecaster.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")

_cached_model = None
_cached_metrics = None


def _ensure_model_dir():
    os.makedirs(MODEL_DIR, exist_ok=True)


def _load_model():
    global _cached_model
    if _cached_model is not None:
        return _cached_model
    if os.path.exists(MODEL_PATH):
        _cached_model = joblib.load(MODEL_PATH)
        return _cached_model
    return None


def get_model_metrics() -> Optional[Dict]:
    global _cached_metrics
    if _cached_metrics:
        return _cached_metrics
    if os.path.exists(METRICS_PATH):
        with open(METRICS_PATH) as f:
            _cached_metrics = json.load(f)
        return _cached_metrics
    return None


def _build_features(df: pd.DataFrame) -> pd.DataFrame:
    """Feature engineering pipeline matching training."""
    df = df.copy()
    df["day"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["day_of_week"] = df["date"].dt.dayofweek
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    # Lag features
    for lag in [1, 3, 7, 14]:
        df[f"lag_{lag}"] = df["quantity"].shift(lag)

    # Rolling averages
    for window in [7, 14, 30]:
        df[f"rolling_mean_{window}"] = df["quantity"].rolling(window=window, min_periods=1).mean()
        df[f"rolling_std_{window}"] = df["quantity"].rolling(window=window, min_periods=1).std().fillna(0)

    df = df.fillna(0)
    return df


FEATURE_COLS = [
    "day", "month", "day_of_week", "week_of_year", "is_weekend",
    "price", "discount",
    "lag_1", "lag_3", "lag_7", "lag_14",
    "rolling_mean_7", "rolling_mean_14", "rolling_mean_30",
    "rolling_std_7", "rolling_std_14", "rolling_std_30",
]


def _get_historical_sales(db: Session, product_id: int, days: int = 180) -> pd.DataFrame:
    """Fetch sales history for a product as a DataFrame."""
    since = datetime.utcnow() - timedelta(days=days)
    sales = (
        db.query(models.Sale)
        .filter(
            models.Sale.product_id == product_id,
            models.Sale.sale_date >= since,
        )
        .order_by(models.Sale.sale_date)
        .all()
    )

    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    price = product.price if product else 10.0

    # Aggregate by day
    if not sales:
        # No history: return synthetic baseline
        dates = pd.date_range(end=datetime.utcnow(), periods=30, freq="D")
        return pd.DataFrame({
            "date": dates,
            "quantity": np.random.randint(1, 15, size=len(dates)),
            "price": price,
            "discount": 0.0,
        })

    by_date: Dict[str, Dict] = {}
    for s in sales:
        dk = s.sale_date.strftime("%Y-%m-%d")
        if dk not in by_date:
            by_date[dk] = {"quantity": 0, "price": s.unit_price, "discount": s.discount}
        by_date[dk]["quantity"] += s.quantity

    # Fill date gaps with 0
    start = datetime.utcnow() - timedelta(days=days)
    end = datetime.utcnow()
    all_dates = pd.date_range(start=start, end=end, freq="D")

    rows = []
    for d in all_dates:
        dk = d.strftime("%Y-%m-%d")
        row = by_date.get(dk, {"quantity": 0, "price": price, "discount": 0.0})
        row["date"] = d
        rows.append(row)

    return pd.DataFrame(rows)


def generate_forecasts_for_product(db: Session, product_id: int, horizon_days: int = 14) -> Dict:
    """
    Generate demand forecasts for the next `horizon_days` days.
    Saves forecasts to the database and returns them along with historical data.
    """
    model = _load_model()
    hist_df = _get_historical_sales(db, product_id)
    hist_df = _build_features(hist_df)

    historical_out = [
        {"date": row["date"].strftime("%Y-%m-%d"), "quantity": int(row["quantity"])}
        for _, row in hist_df.iterrows()
    ]

    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    price = product.price if product else 10.0

    forecasts_out = []
    now = datetime.utcnow()

    # Delete existing future forecasts for this product
    db.query(models.Forecast).filter(
        models.Forecast.product_id == product_id,
        models.Forecast.forecast_date > now,
    ).delete()

    if model is None:
        # Fallback: moving average
        recent_qty = hist_df["quantity"].tail(14).mean()
        predicted = max(1.0, recent_qty)
        for i in range(1, horizon_days + 1):
            fdate = now + timedelta(days=i)
            confidence = 0.65
            forecast = models.Forecast(
                product_id=product_id,
                forecast_date=fdate,
                predicted_demand=round(predicted, 2),
                confidence=confidence,
            )
            db.add(forecast)
            forecasts_out.append({
                "id": 0,
                "product_id": product_id,
                "forecast_date": fdate.isoformat(),
                "predicted_demand": round(predicted, 2),
                "confidence": confidence,
                "created_at": now.isoformat(),
            })
        db.commit()
        return {"historical": historical_out, "forecasts": forecasts_out}

    # Use ML model
    extended = hist_df.copy()
    for i in range(1, horizon_days + 1):
        fdate = now + timedelta(days=i)
        new_row = {
            "date": fdate,
            "quantity": 0.0,
            "price": price,
            "discount": 0.0,
        }
        new_df = pd.DataFrame([new_row])
        full = pd.concat([extended, new_df], ignore_index=True)
        full = _build_features(full)
        last_row = full.iloc[[-1]]

        available_cols = [c for c in FEATURE_COLS if c in last_row.columns]
        X = last_row[available_cols].fillna(0)

        try:
            pred = float(model.predict(X)[0])
        except Exception:
            pred = max(1.0, extended["quantity"].tail(7).mean())

        pred = max(0.0, pred)
        confidence = min(0.95, max(0.55, 1.0 - (i * 0.02)))

        # Update last row quantity for next iteration's lags
        full.iloc[-1, full.columns.get_loc("quantity")] = pred
        extended = full.copy()

        forecast = models.Forecast(
            product_id=product_id,
            forecast_date=fdate,
            predicted_demand=round(pred, 2),
            confidence=round(confidence, 2),
        )
        db.add(forecast)
        db.flush()

        forecasts_out.append({
            "id": forecast.id,
            "product_id": product_id,
            "forecast_date": fdate.isoformat(),
            "predicted_demand": round(pred, 2),
            "confidence": round(confidence, 2),
            "created_at": now.isoformat(),
        })

    db.commit()
    return {"historical": historical_out, "forecasts": forecasts_out}
