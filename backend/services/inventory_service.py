"""
Founded AI — Inventory Intelligence Service
Low-stock detection, stockout risk classification, reorder recommendations.
All calculations are based on real inventory and ML forecast data.
"""
from datetime import datetime, timedelta
from typing import List, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func

import models


def get_low_stock_products(db: Session) -> List[Dict]:
    """Products where current_stock <= minimum_stock."""
    products = (
        db.query(models.Product)
        .filter(models.Product.current_stock <= models.Product.minimum_stock)
        .all()
    )
    return [
        {
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "current_stock": p.current_stock,
            "minimum_stock": p.minimum_stock,
            "shortage": p.minimum_stock - p.current_stock,
        }
        for p in products
    ]


def _get_avg_daily_demand(db: Session, product_id: int, days: int = 30) -> float:
    """Calculate average daily demand from sales history."""
    since = datetime.utcnow() - timedelta(days=days)
    result = (
        db.query(func.sum(models.Sale.quantity))
        .filter(
            models.Sale.product_id == product_id,
            models.Sale.sale_date >= since,
        )
        .scalar()
    )
    total_sold = result or 0
    return total_sold / days if days > 0 else 0


def _get_latest_predicted_demand(db: Session, product_id: int) -> float:
    """Get the most recent ML-predicted daily demand for a product."""
    forecast = (
        db.query(models.Forecast)
        .filter(models.Forecast.product_id == product_id)
        .order_by(models.Forecast.created_at.desc())
        .first()
    )
    if forecast:
        return forecast.predicted_demand
    # Fall back to historical average
    return _get_avg_daily_demand(db, product_id)


def get_stockout_risk_products(db: Session) -> List[Dict]:
    """
    Classify all products by stockout risk:
    - HIGH: < 7 days of stock remaining
    - MEDIUM: 7–14 days of stock remaining
    - LOW: > 14 days of stock remaining
    """
    products = db.query(models.Product).all()
    result = []

    for p in products:
        predicted_demand = _get_latest_predicted_demand(db, p.id)

        if predicted_demand <= 0:
            predicted_demand = 0.01  # Avoid division by zero

        days_of_stock = p.current_stock / predicted_demand

        if days_of_stock < 7:
            risk = "HIGH"
        elif days_of_stock < 14:
            risk = "MEDIUM"
        else:
            risk = "LOW"

        result.append({
            "id": p.id,
            "name": p.name,
            "sku": p.sku,
            "category": p.category,
            "current_stock": p.current_stock,
            "predicted_demand": round(predicted_demand, 2),
            "days_of_stock": round(days_of_stock, 1),
            "risk_level": risk,
        })

    # Sort: HIGH first, then MEDIUM, then LOW
    order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    result.sort(key=lambda x: order[x["risk_level"]])
    return result


def get_reorder_recommendations(db: Session) -> List[Dict]:
    """
    Calculate reorder recommendations for products at medium or high risk.

    Formulas:
    - safety_stock = avg_daily_demand * lead_time_days * 0.5  (lead_time assumed 7 days)
    - reorder_point = avg_daily_demand * lead_time_days + safety_stock
    - recommended_quantity = max(minimum_order, (safety_stock * 2) - current_stock)
    """
    LEAD_TIME_DAYS = 7
    MIN_ORDER_QTY = 10

    risk_products = get_stockout_risk_products(db)
    recommendations = []

    for rp in risk_products:
        if rp["risk_level"] == "LOW":
            continue

        product = db.query(models.Product).filter(models.Product.id == rp["id"]).first()
        if not product:
            continue

        avg_daily = rp["predicted_demand"]
        safety_stock = avg_daily * LEAD_TIME_DAYS * 0.5
        reorder_point = avg_daily * LEAD_TIME_DAYS + safety_stock
        target_stock = avg_daily * 30  # 30-day supply
        recommended_qty = max(MIN_ORDER_QTY, int(target_stock - product.current_stock))

        supplier_name = None
        if product.supplier:
            supplier_name = product.supplier.name
        elif product.supplier_id:
            sup = db.query(models.Supplier).filter(models.Supplier.id == product.supplier_id).first()
            supplier_name = sup.name if sup else None

        recommendations.append({
            "product_id": product.id,
            "product_name": product.name,
            "sku": product.sku,
            "current_stock": product.current_stock,
            "minimum_stock": product.minimum_stock,
            "predicted_demand": round(avg_daily, 2),
            "safety_stock": round(safety_stock, 1),
            "reorder_point": round(reorder_point, 1),
            "recommended_quantity": recommended_qty,
            "supplier_id": product.supplier_id,
            "supplier_name": supplier_name,
            "estimated_cost": round(recommended_qty * product.cost_price, 2),
        })

    return recommendations
