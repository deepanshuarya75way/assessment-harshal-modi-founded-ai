"""
Founded AI — Analytics Service
Dashboard KPIs, revenue trends, category breakdown, top products, anomaly detection.
All data is derived from actual database records.
"""
from datetime import datetime, timedelta
from typing import List, Dict, Any
import statistics
import math

from sqlalchemy.orm import Session
from sqlalchemy import func, and_

import models


def get_dashboard_stats(db: Session) -> Dict:
    """Compute all dashboard KPI values from real database queries."""
    total_revenue = db.query(func.sum(models.Sale.total_amount)).scalar() or 0.0
    total_sales = db.query(func.count(models.Sale.id)).scalar() or 0
    total_products = db.query(func.count(models.Product.id)).scalar() or 0

    # Inventory value = sum(current_stock * cost_price)
    inventory_value_result = db.query(
        func.sum(models.Product.current_stock * models.Product.cost_price)
    ).scalar()
    total_inventory_value = inventory_value_result or 0.0

    # Low stock count
    low_stock_count = (
        db.query(func.count(models.Product.id))
        .filter(models.Product.current_stock <= models.Product.minimum_stock)
        .scalar()
        or 0
    )

    # High risk: products with very low stock relative to minimum
    high_risk_count = (
        db.query(func.count(models.Product.id))
        .filter(models.Product.current_stock == 0)
        .scalar()
        or 0
    )

    avg_order_value = total_revenue / total_sales if total_sales > 0 else 0.0

    return {
        "total_revenue": round(total_revenue, 2),
        "total_sales": total_sales,
        "average_order_value": round(avg_order_value, 2),
        "total_products": total_products,
        "total_inventory_value": round(total_inventory_value, 2),
        "low_stock_count": low_stock_count,
        "high_risk_count": high_risk_count,
    }


def get_revenue_over_time(db: Session, days: int = 30) -> List[Dict]:
    """Daily revenue aggregated from the sales table."""
    since = datetime.utcnow() - timedelta(days=days)
    sales = (
        db.query(models.Sale)
        .filter(models.Sale.sale_date >= since)
        .all()
    )

    # Aggregate by date string (YYYY-MM-DD)
    daily: Dict[str, Dict] = {}
    for sale in sales:
        date_key = sale.sale_date.strftime("%Y-%m-%d")
        if date_key not in daily:
            daily[date_key] = {"date": date_key, "revenue": 0.0, "units_sold": 0}
        daily[date_key]["revenue"] += sale.total_amount
        daily[date_key]["units_sold"] += sale.quantity

    # Fill missing days with 0
    result = []
    for i in range(days):
        d = (datetime.utcnow() - timedelta(days=days - i - 1)).strftime("%Y-%m-%d")
        if d in daily:
            entry = daily[d]
            entry["revenue"] = round(entry["revenue"], 2)
            result.append(entry)
        else:
            result.append({"date": d, "revenue": 0.0, "units_sold": 0})

    return result


def get_category_revenue(db: Session) -> List[Dict]:
    """Total revenue grouped by product category."""
    rows = (
        db.query(
            models.Product.category,
            func.sum(models.Sale.total_amount).label("revenue"),
            func.sum(models.Sale.quantity).label("units_sold"),
        )
        .join(models.Sale, models.Sale.product_id == models.Product.id)
        .group_by(models.Product.category)
        .all()
    )
    return [
        {
            "category": row.category or "Uncategorized",
            "revenue": round(row.revenue, 2),
            "units_sold": row.units_sold,
        }
        for row in rows
    ]


def get_top_products(db: Session, limit: int = 10) -> List[Dict]:
    """Top products by total revenue."""
    rows = (
        db.query(
            models.Product.id.label("product_id"),
            models.Product.name.label("product_name"),
            models.Product.sku,
            func.sum(models.Sale.total_amount).label("total_revenue"),
            func.sum(models.Sale.quantity).label("units_sold"),
        )
        .join(models.Sale, models.Sale.product_id == models.Product.id)
        .group_by(models.Product.id, models.Product.name, models.Product.sku)
        .order_by(func.sum(models.Sale.total_amount).desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "product_id": row.product_id,
            "product_name": row.product_name,
            "sku": row.sku,
            "total_revenue": round(row.total_revenue, 2),
            "units_sold": row.units_sold,
        }
        for row in rows
    ]


def detect_sales_anomalies(db: Session, days: int = 90) -> Dict[str, Any]:
    """
    Detect sales anomalies using Z-score method.
    Flags daily sales totals that deviate more than 2 std deviations from the mean.
    """
    since = datetime.utcnow() - timedelta(days=days)
    sales = db.query(models.Sale).filter(models.Sale.sale_date >= since).all()

    # Group by date + product
    by_product_date: Dict[int, Dict[str, float]] = {}
    product_names: Dict[int, str] = {}

    for sale in sales:
        pid = sale.product_id
        date_key = sale.sale_date.strftime("%Y-%m-%d")
        if pid not in by_product_date:
            by_product_date[pid] = {}
        by_product_date[pid][date_key] = by_product_date[pid].get(date_key, 0) + sale.quantity
        if pid not in product_names:
            product_names[pid] = sale.product.name if sale.product else f"Product {pid}"

    anomalies = []
    for pid, date_sales in by_product_date.items():
        values = list(date_sales.values())
        if len(values) < 5:
            continue  # Not enough data

        mean = statistics.mean(values)
        stdev = statistics.stdev(values) if len(values) > 1 else 0

        if stdev == 0:
            continue

        for date, qty in date_sales.items():
            z_score = (qty - mean) / stdev
            if abs(z_score) > 2.0:
                direction = "unusually high" if z_score > 0 else "unusually low"
                anomalies.append({
                    "product_id": pid,
                    "product_name": product_names.get(pid, f"Product {pid}"),
                    "date": date,
                    "quantity": int(qty),
                    "mean_quantity": round(mean, 1),
                    "z_score": round(z_score, 2),
                    "explanation": (
                        f"{product_names.get(pid)} had {direction} sales on {date}: "
                        f"{int(qty)} units sold vs. average of {mean:.1f} units "
                        f"(Z-score: {z_score:.2f})"
                    ),
                })

    return {
        "period_days": days,
        "total_anomalies": len(anomalies),
        "anomalies": anomalies,
        "method": "Z-score (threshold: |z| > 2.0)",
    }
