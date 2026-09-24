"""
Founded AI — Alerts Router
Aggregates all system alerts: low stock, stockout risk, sales anomalies
"""
from datetime import datetime
from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

import models, schemas
from database import get_db
from auth import get_current_user
from services.inventory_service import get_low_stock_products, get_stockout_risk_products
from services.analytics_service import detect_sales_anomalies

router = APIRouter(prefix="/api/alerts", tags=["alerts"])


@router.get("", response_model=List[schemas.Alert])
def get_all_alerts(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    alerts: List[schemas.Alert] = []
    now = datetime.utcnow()
    counter = 0

    # Low stock alerts
    for p in get_low_stock_products(db):
        counter += 1
        severity = "critical" if p["current_stock"] == 0 else "warning"
        alerts.append(schemas.Alert(
            id=f"low-stock-{p['id']}",
            type="low_stock",
            severity=severity,
            title="Low Stock Alert" if severity == "warning" else "Out of Stock",
            message=f"{p['name']} has only {p['current_stock']} units remaining (minimum: {p['minimum_stock']})",
            product_id=p["id"],
            product_name=p["name"],
            created_at=now,
        ))

    # Stockout risk alerts
    for p in get_stockout_risk_products(db):
        if p["risk_level"] == "HIGH":
            counter += 1
            alerts.append(schemas.Alert(
                id=f"stockout-risk-{p['id']}",
                type="stockout_risk",
                severity="critical",
                title="High Stockout Risk",
                message=f"{p['name']} has only {p['days_of_stock']:.1f} days of stock remaining based on predicted demand",
                product_id=p["id"],
                product_name=p["name"],
                created_at=now,
            ))
        elif p["risk_level"] == "MEDIUM":
            counter += 1
            alerts.append(schemas.Alert(
                id=f"stockout-risk-{p['id']}-medium",
                type="stockout_risk",
                severity="warning",
                title="Medium Stockout Risk",
                message=f"{p['name']} may run out within 2 weeks based on demand forecasts",
                product_id=p["id"],
                product_name=p["name"],
                created_at=now,
            ))

    # Anomaly alerts
    anomalies = detect_sales_anomalies(db, days=30)
    for anomaly in anomalies.get("anomalies", []):
        counter += 1
        alerts.append(schemas.Alert(
            id=f"anomaly-{anomaly['product_id']}-{anomaly['date']}",
            type="sales_anomaly",
            severity="info",
            title="Sales Anomaly Detected",
            message=anomaly["explanation"],
            product_id=anomaly.get("product_id"),
            product_name=anomaly.get("product_name"),
            created_at=now,
        ))

    return alerts
