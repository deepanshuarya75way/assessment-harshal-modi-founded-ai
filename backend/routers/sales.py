"""
Founded AI — Sales Router
Record sales, auto-reduce inventory, history with filters
"""
from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

import models, schemas
from database import get_db
from auth import get_current_user

router = APIRouter(prefix="/api/sales", tags=["sales"])


@router.get("", response_model=List[schemas.SaleOut])
def list_sales(
    product_id: Optional[int] = Query(None),
    start_date: Optional[datetime] = Query(None),
    end_date: Optional[datetime] = Query(None),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.Sale).options(
        joinedload(models.Sale.product).joinedload(models.Product.supplier)
    )
    if product_id:
        q = q.filter(models.Sale.product_id == product_id)
    if start_date:
        q = q.filter(models.Sale.sale_date >= start_date)
    if end_date:
        q = q.filter(models.Sale.sale_date <= end_date)
    return q.order_by(models.Sale.sale_date.desc()).offset(skip).limit(limit).all()


@router.get("/{sale_id}", response_model=schemas.SaleOut)
def get_sale(sale_id: int, db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    sale = db.query(models.Sale).options(
        joinedload(models.Sale.product)
    ).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return sale


@router.post("", response_model=schemas.SaleOut, status_code=201)
def create_sale(
    payload: schemas.SaleCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    product = db.query(models.Product).filter(models.Product.id == payload.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.current_stock < payload.quantity:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient stock. Available: {product.current_stock}, Requested: {payload.quantity}"
        )

    discount_multiplier = 1 - (payload.discount / 100)
    total = round(payload.quantity * payload.unit_price * discount_multiplier, 2)

    sale = models.Sale(
        product_id=payload.product_id,
        quantity=payload.quantity,
        unit_price=payload.unit_price,
        discount=payload.discount,
        total_amount=total,
        sale_date=payload.sale_date or datetime.utcnow(),
    )
    db.add(sale)

    # Auto-reduce inventory
    product.current_stock -= payload.quantity

    db.commit()
    db.refresh(sale)
    return sale


@router.delete("/{sale_id}", status_code=204)
def delete_sale(
    sale_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """Delete a sale record (does not restore inventory)."""
    sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    db.delete(sale)
    db.commit()
