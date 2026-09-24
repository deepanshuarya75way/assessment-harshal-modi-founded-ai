"""
Founded AI — Purchase Orders Router
Create, list, approve/reject, view recommendations
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload

import models, schemas
from database import get_db
from auth import get_current_user, require_manager_or_above

router = APIRouter(prefix="/api/purchase-orders", tags=["purchase-orders"])


@router.get("", response_model=List[schemas.PurchaseOrderOut])
def list_purchase_orders(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    return (
        db.query(models.PurchaseOrder)
        .options(
            joinedload(models.PurchaseOrder.supplier),
            joinedload(models.PurchaseOrder.items).joinedload(models.PurchaseOrderItem.product),
        )
        .order_by(models.PurchaseOrder.created_at.desc())
        .all()
    )


@router.get("/{po_id}", response_model=schemas.PurchaseOrderOut)
def get_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    po = (
        db.query(models.PurchaseOrder)
        .options(
            joinedload(models.PurchaseOrder.supplier),
            joinedload(models.PurchaseOrder.items).joinedload(models.PurchaseOrderItem.product),
        )
        .filter(models.PurchaseOrder.id == po_id)
        .first()
    )
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po


@router.post("", response_model=schemas.PurchaseOrderOut, status_code=201)
def create_purchase_order(
    payload: schemas.PurchaseOrderCreate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_above),
):
    supplier = db.query(models.Supplier).filter(models.Supplier.id == payload.supplier_id).first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    po = models.PurchaseOrder(
        supplier_id=payload.supplier_id,
        notes=payload.notes,
        status=models.PurchaseOrderStatus.PENDING,
    )
    db.add(po)
    db.flush()

    total = 0.0
    for item in payload.items:
        product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=404, detail=f"Product {item.product_id} not found")
        po_item = models.PurchaseOrderItem(
            purchase_order_id=po.id,
            product_id=item.product_id,
            quantity=item.quantity,
            unit_price=item.unit_price,
        )
        db.add(po_item)
        total += item.quantity * item.unit_price

    po.total_amount = round(total, 2)
    db.commit()
    db.refresh(po)
    return po


@router.patch("/{po_id}/status", response_model=schemas.PurchaseOrderOut)
def update_po_status(
    po_id: int,
    payload: schemas.PurchaseOrderStatusUpdate,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_above),
):
    """Approve or reject a purchase order. Approving will update product stock."""
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")

    old_status = po.status
    po.status = payload.status

    # If approved, restock products
    if payload.status == models.PurchaseOrderStatus.APPROVED and old_status != models.PurchaseOrderStatus.APPROVED:
        items = db.query(models.PurchaseOrderItem).filter(
            models.PurchaseOrderItem.purchase_order_id == po.id
        ).all()
        for item in items:
            product = db.query(models.Product).filter(models.Product.id == item.product_id).first()
            if product:
                product.current_stock += item.quantity

    db.commit()
    db.refresh(po)
    return po


@router.delete("/{po_id}", status_code=204)
def delete_purchase_order(
    po_id: int,
    db: Session = Depends(get_db),
    _: models.User = Depends(require_manager_or_above),
):
    po = db.query(models.PurchaseOrder).filter(models.PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    if po.status == models.PurchaseOrderStatus.APPROVED:
        raise HTTPException(status_code=400, detail="Cannot delete an approved purchase order")
    db.delete(po)
    db.commit()
