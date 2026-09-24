"""
Founded AI — Products Router
Full CRUD + search/filter + stock update + low-stock detection
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, joinedload

import models, schemas
from database import get_db
from auth import get_current_user, require_manager_or_above

router = APIRouter(prefix="/api/products", tags=["products"])


@router.get("", response_model=List[schemas.ProductOut])
def list_products(
    search: Optional[str] = Query(None, description="Search by name or SKU"),
    category: Optional[str] = Query(None),
    low_stock_only: bool = Query(False),
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    q = db.query(models.Product).options(joinedload(models.Product.supplier))

    if search:
        q = q.filter(
            models.Product.name.ilike(f"%{search}%") |
            models.Product.sku.ilike(f"%{search}%")
        )
    if category:
        q = q.filter(models.Product.category == category)
    if low_stock_only:
        q = q.filter(models.Product.current_stock <= models.Product.minimum_stock)

    return q.offset(skip).limit(limit).all()


@router.get("/categories", response_model=List[str])
def get_categories(db: Session = Depends(get_db), _: models.User = Depends(get_current_user)):
    rows = db.query(models.Product.category).distinct().all()
    return [r[0] for r in rows if r[0]]


@router.get("/{product_id}", response_model=schemas.ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    product = db.query(models.Product).options(joinedload(models.Product.supplier)).filter(
        models.Product.id == product_id
    ).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.post("", response_model=schemas.ProductOut, status_code=201)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_above),
):
    if db.query(models.Product).filter(models.Product.sku == payload.sku).first():
        raise HTTPException(status_code=400, detail=f"SKU '{payload.sku}' already exists")

    product = models.Product(**payload.model_dump())
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.put("/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_above),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=204)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_above),
):
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    db.delete(product)
    db.commit()


@router.patch("/{product_id}/stock", response_model=schemas.ProductOut)
def update_stock(
    product_id: int,
    payload: schemas.StockUpdateRequest,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_above),
):
    """Manually adjust stock level. Positive = add, negative = remove."""
    product = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")

    new_stock = product.current_stock + payload.quantity
    if new_stock < 0:
        raise HTTPException(status_code=400, detail="Insufficient stock")

    product.current_stock = new_stock
    db.commit()
    db.refresh(product)
    return product
