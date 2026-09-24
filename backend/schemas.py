"""
Founded AI — Pydantic Schemas (request/response validation)
"""
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr, field_validator
from models import UserRole, PurchaseOrderStatus


# ─────────────────────────────────────────────
# Auth Schemas
# ─────────────────────────────────────────────

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    role: UserRole = UserRole.STAFF

    @field_validator("password")
    @classmethod
    def password_strength(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    name: str
    email: str
    role: UserRole
    created_at: datetime

    model_config = {"from_attributes": True}


class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserOut


# ─────────────────────────────────────────────
# Supplier Schemas
# ─────────────────────────────────────────────

class SupplierCreate(BaseModel):
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None


class SupplierOut(BaseModel):
    id: int
    name: str
    email: Optional[str]
    phone: Optional[str]
    address: Optional[str]

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Product Schemas
# ─────────────────────────────────────────────

class ProductCreate(BaseModel):
    name: str
    sku: str
    category: Optional[str] = None
    price: float
    cost_price: float
    current_stock: int = 0
    minimum_stock: int = 10
    supplier_id: Optional[int] = None

    @field_validator("price", "cost_price")
    @classmethod
    def positive_price(cls, v):
        if v < 0:
            raise ValueError("Price must be non-negative")
        return v


class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    category: Optional[str] = None
    price: Optional[float] = None
    cost_price: Optional[float] = None
    current_stock: Optional[int] = None
    minimum_stock: Optional[int] = None
    supplier_id: Optional[int] = None


class ProductOut(BaseModel):
    id: int
    name: str
    sku: str
    category: Optional[str]
    price: float
    cost_price: float
    current_stock: int
    minimum_stock: int
    supplier_id: Optional[int]
    created_at: datetime
    supplier: Optional[SupplierOut] = None

    model_config = {"from_attributes": True}


class StockUpdateRequest(BaseModel):
    quantity: int  # positive = add stock, negative = remove


# ─────────────────────────────────────────────
# Sale Schemas
# ─────────────────────────────────────────────

class SaleCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: float
    discount: float = 0.0
    sale_date: Optional[datetime] = None

    @field_validator("quantity")
    @classmethod
    def positive_quantity(cls, v):
        if v <= 0:
            raise ValueError("Quantity must be positive")
        return v

    @field_validator("discount")
    @classmethod
    def valid_discount(cls, v):
        if not (0 <= v <= 100):
            raise ValueError("Discount must be between 0 and 100")
        return v


class SaleOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    discount: float
    total_amount: float
    sale_date: datetime
    product: Optional[ProductOut] = None

    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────
# Forecast Schemas
# ─────────────────────────────────────────────

class ForecastOut(BaseModel):
    id: int
    product_id: int
    forecast_date: datetime
    predicted_demand: float
    confidence: float
    created_at: datetime

    model_config = {"from_attributes": True}


class ForecastResponse(BaseModel):
    product_id: int
    product_name: str
    historical_demand: List[dict]
    forecasts: List[ForecastOut]
    model_metrics: Optional[dict] = None


# ─────────────────────────────────────────────
# Inventory Intelligence Schemas
# ─────────────────────────────────────────────

class LowStockProduct(BaseModel):
    id: int
    name: str
    sku: str
    category: Optional[str]
    current_stock: int
    minimum_stock: int
    shortage: int

    model_config = {"from_attributes": True}


class StockoutRiskProduct(BaseModel):
    id: int
    name: str
    sku: str
    category: Optional[str]
    current_stock: int
    predicted_demand: float
    days_of_stock: float
    risk_level: str  # LOW | MEDIUM | HIGH

    model_config = {"from_attributes": True}


class ReorderRecommendation(BaseModel):
    product_id: int
    product_name: str
    sku: str
    current_stock: int
    minimum_stock: int
    predicted_demand: float
    safety_stock: float
    reorder_point: float
    recommended_quantity: int
    supplier_id: Optional[int]
    supplier_name: Optional[str]
    estimated_cost: float


# ─────────────────────────────────────────────
# Purchase Order Schemas
# ─────────────────────────────────────────────

class PurchaseOrderItemCreate(BaseModel):
    product_id: int
    quantity: int
    unit_price: float


class PurchaseOrderCreate(BaseModel):
    supplier_id: int
    notes: Optional[str] = None
    items: List[PurchaseOrderItemCreate]


class PurchaseOrderItemOut(BaseModel):
    id: int
    product_id: int
    quantity: int
    unit_price: float
    product: Optional[ProductOut] = None

    model_config = {"from_attributes": True}


class PurchaseOrderOut(BaseModel):
    id: int
    supplier_id: int
    status: PurchaseOrderStatus
    total_amount: float
    notes: Optional[str]
    created_at: datetime
    supplier: Optional[SupplierOut] = None
    items: List[PurchaseOrderItemOut] = []

    model_config = {"from_attributes": True}


class PurchaseOrderStatusUpdate(BaseModel):
    status: PurchaseOrderStatus


# ─────────────────────────────────────────────
# Analytics Schemas
# ─────────────────────────────────────────────

class RevenueStats(BaseModel):
    total_revenue: float
    total_sales: int
    average_order_value: float
    total_products: int
    total_inventory_value: float
    low_stock_count: int
    high_risk_count: int


class CategoryRevenue(BaseModel):
    category: str
    revenue: float
    units_sold: int


class TopProduct(BaseModel):
    product_id: int
    product_name: str
    sku: str
    total_revenue: float
    units_sold: int


class DailyRevenue(BaseModel):
    date: str
    revenue: float
    units_sold: int


# ─────────────────────────────────────────────
# Copilot / AI Schemas
# ─────────────────────────────────────────────

class CopilotMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class CopilotRequest(BaseModel):
    message: str
    history: List[CopilotMessage] = []


class CopilotResponse(BaseModel):
    message: str
    tool_used: Optional[str] = None
    data: Optional[dict] = None


# ─────────────────────────────────────────────
# Alert Schemas
# ─────────────────────────────────────────────

class Alert(BaseModel):
    id: str
    type: str   # "low_stock" | "stockout_risk" | "sales_anomaly"
    severity: str  # "info" | "warning" | "critical"
    title: str
    message: str
    product_id: Optional[int] = None
    product_name: Optional[str] = None
    created_at: datetime
