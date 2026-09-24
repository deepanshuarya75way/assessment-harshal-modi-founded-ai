"""
Founded AI — Copilot Service
LLM-powered business assistant with controlled function/tool calling.
The LLM cannot execute arbitrary SQL; it calls pre-approved business tools only.
"""
import os
import json
import logging
from typing import List, Dict, Any, Optional

from sqlalchemy.orm import Session
from dotenv import load_dotenv

from services.inventory_service import (
    get_low_stock_products,
    get_stockout_risk_products,
    get_reorder_recommendations,
)
from services.analytics_service import (
    get_dashboard_stats,
    get_top_products,
    get_category_revenue,
    get_revenue_over_time,
)
import models

load_dotenv()
logger = logging.getLogger(__name__)

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")


# ─────────────────────────────────────────────
# Controlled Business Tools (no raw SQL)
# ─────────────────────────────────────────────

def _tool_get_inventory(db: Session, **kwargs) -> Dict:
    products = db.query(models.Product).limit(50).all()
    return {
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "sku": p.sku,
                "category": p.category,
                "current_stock": p.current_stock,
                "minimum_stock": p.minimum_stock,
                "price": p.price,
            }
            for p in products
        ],
        "total": len(products),
    }


def _tool_get_product(db: Session, product_id: int = None, name: str = None, **kwargs) -> Dict:
    q = db.query(models.Product)
    if product_id:
        product = q.filter(models.Product.id == product_id).first()
    elif name:
        product = q.filter(models.Product.name.ilike(f"%{name}%")).first()
    else:
        return {"error": "Provide product_id or name"}
    if not product:
        return {"error": "Product not found"}
    return {
        "id": product.id,
        "name": product.name,
        "sku": product.sku,
        "category": product.category,
        "current_stock": product.current_stock,
        "minimum_stock": product.minimum_stock,
        "price": product.price,
        "cost_price": product.cost_price,
    }


def _tool_get_sales(db: Session, limit: int = 20, **kwargs) -> Dict:
    from datetime import datetime, timedelta
    since = datetime.utcnow() - timedelta(days=30)
    sales = (
        db.query(models.Sale)
        .filter(models.Sale.sale_date >= since)
        .order_by(models.Sale.sale_date.desc())
        .limit(limit)
        .all()
    )
    return {
        "sales": [
            {
                "id": s.id,
                "product_id": s.product_id,
                "product_name": s.product.name if s.product else None,
                "quantity": s.quantity,
                "total_amount": s.total_amount,
                "sale_date": s.sale_date.isoformat(),
            }
            for s in sales
        ],
        "period": "last 30 days",
    }


def _tool_get_revenue(db: Session, days: int = 30, **kwargs) -> Dict:
    stats = get_dashboard_stats(db)
    trend = get_revenue_over_time(db, days=days)
    return {
        "total_revenue": stats["total_revenue"],
        "period_days": days,
        "average_daily_revenue": round(stats["total_revenue"] / max(days, 1), 2),
        "trend": trend[-7:],  # last 7 data points
    }


def _tool_get_top_products(db: Session, limit: int = 5, **kwargs) -> Dict:
    return {"top_products": get_top_products(db, limit=limit)}


def _tool_get_low_stock(db: Session, **kwargs) -> Dict:
    items = get_low_stock_products(db)
    return {"low_stock_products": items, "count": len(items)}


def _tool_get_forecast(db: Session, product_id: int = None, **kwargs) -> Dict:
    if not product_id:
        return {"error": "product_id is required"}
    from services.forecast_service import generate_forecasts_for_product
    result = generate_forecasts_for_product(db, product_id, horizon_days=7)
    avg_demand = (
        sum(f["predicted_demand"] for f in result["forecasts"]) / len(result["forecasts"])
        if result["forecasts"] else 0
    )
    return {
        "product_id": product_id,
        "average_daily_demand_next_7_days": round(avg_demand, 2),
        "forecasts": result["forecasts"][:7],
    }


def _tool_get_stockout_risk(db: Session, **kwargs) -> Dict:
    items = get_stockout_risk_products(db)
    high = [i for i in items if i["risk_level"] == "HIGH"]
    medium = [i for i in items if i["risk_level"] == "MEDIUM"]
    return {
        "high_risk": high,
        "medium_risk": medium,
        "high_risk_count": len(high),
        "medium_risk_count": len(medium),
    }


def _tool_get_reorder_recommendations(db: Session, **kwargs) -> Dict:
    recs = get_reorder_recommendations(db)
    return {"recommendations": recs, "count": len(recs)}


TOOLS: Dict[str, Any] = {
    "get_inventory": _tool_get_inventory,
    "get_product": _tool_get_product,
    "get_sales": _tool_get_sales,
    "get_revenue": _tool_get_revenue,
    "get_top_products": _tool_get_top_products,
    "get_low_stock_products": _tool_get_low_stock,
    "get_forecast": _tool_get_forecast,
    "get_stockout_risk": _tool_get_stockout_risk,
    "get_reorder_recommendations": _tool_get_reorder_recommendations,
}

TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_inventory",
            "description": "Get current inventory status for all products",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_product",
            "description": "Get details for a specific product by ID or name",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "integer", "description": "Product ID"},
                    "name": {"type": "string", "description": "Product name (partial match)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_sales",
            "description": "Get recent sales data from the last 30 days",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of sales to return (default 20)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_revenue",
            "description": "Get revenue statistics for a given period",
            "parameters": {
                "type": "object",
                "properties": {
                    "days": {"type": "integer", "description": "Number of days to look back (default 30)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_top_products",
            "description": "Get the top-selling products by revenue",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {"type": "integer", "description": "Number of products (default 5)"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_low_stock_products",
            "description": "Get products that are low in stock",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_forecast",
            "description": "Get ML demand forecast for a specific product",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_id": {"type": "integer", "description": "Product ID to forecast"},
                },
                "required": ["product_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_stockout_risk",
            "description": "Get products classified by stockout risk level (HIGH/MEDIUM/LOW)",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_reorder_recommendations",
            "description": "Get AI-calculated reorder recommendations for at-risk products",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
]

SYSTEM_PROMPT = """You are Founded Copilot, the AI-powered business intelligence assistant for Founded AI — 
a business operations platform. You help business owners and managers understand their inventory, sales, 
forecasts, and analytics.

You have access to structured business tools that query the real database. Always use these tools to 
answer data-driven questions. Never make up numbers.

Guidelines:
- Be concise, professional, and helpful
- Always use actual data from the tools
- Format numbers clearly (e.g., $1,234.56 for currency, 42 units for quantities)
- Proactively highlight risks or opportunities
- When you detect problems, suggest actionable next steps
- Do NOT execute arbitrary SQL or access data outside the provided tools
"""


async def run_copilot(message: str, history: List[Dict], db: Session) -> Dict:
    """
    Run the Founded Copilot with controlled tool calling.
    Falls back to a rule-based response if no LLM API key is configured.
    """
    if not OPENAI_API_KEY or OPENAI_API_KEY == "your-openai-api-key-here":
        return await _fallback_copilot(message, db)

    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(api_key=OPENAI_API_KEY, base_url=OPENAI_BASE_URL)

        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for h in history[-10:]:  # Last 10 turns for context
            messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})

        # First LLM call — may select a tool
        response = await client.chat.completions.create(
            model=OPENAI_MODEL,
            messages=messages,
            tools=TOOLS_SCHEMA,
            tool_choice="auto",
        )

        response_msg = response.choices[0].message
        tool_used = None

        # Handle tool calls
        if response_msg.tool_calls:
            tool_call = response_msg.tool_calls[0]
            tool_name = tool_call.function.name
            tool_args = json.loads(tool_call.function.arguments or "{}")

            if tool_name in TOOLS:
                tool_result = TOOLS[tool_name](db=db, **tool_args)
                tool_used = tool_name
            else:
                tool_result = {"error": f"Unknown tool: {tool_name}"}

            # Second LLM call — with tool result
            messages.append(response_msg)
            messages.append({
                "role": "tool",
                "tool_call_id": tool_call.id,
                "content": json.dumps(tool_result),
            })

            final_response = await client.chat.completions.create(
                model=OPENAI_MODEL,
                messages=messages,
            )
            final_content = final_response.choices[0].message.content
        else:
            final_content = response_msg.content
            tool_used = None

        return {
            "message": final_content,
            "tool_used": tool_used,
            "data": None,
        }

    except Exception as e:
        logger.error(f"LLM call failed: {e}")
        return await _fallback_copilot(message, db)


async def _fallback_copilot(message: str, db: Session) -> Dict:
    """
    Rule-based fallback when no LLM API key is available.
    Calls the appropriate tool based on keywords and returns structured data.
    """
    msg_lower = message.lower()
    tool_used = None
    data = None
    response_text = ""

    if any(k in msg_lower for k in ["reorder", "restocking", "recommendation"]):
        tool_used = "get_reorder_recommendations"
        data = _tool_get_reorder_recommendations(db)
        recs = data["recommendations"]
        if recs:
            names = ", ".join(r["product_name"] for r in recs[:5])
            response_text = (
                f"I found **{len(recs)} products** that need restocking. "
                f"The highest priority items are: **{names}**. "
                f"Would you like me to prepare a purchase order for these items?"
            )
        else:
            response_text = "✅ All products are currently well-stocked. No reorder needed at this time."

    elif any(k in msg_lower for k in ["stock out", "stockout", "risk", "run out"]):
        tool_used = "get_stockout_risk"
        data = _tool_get_stockout_risk(db)
        high = data["high_risk_count"]
        med = data["medium_risk_count"]
        response_text = (
            f"**Stockout Risk Analysis:** {high} products are at **HIGH risk** and "
            f"{med} products are at **MEDIUM risk** of running out of stock. "
            f"I recommend reviewing and restocking the high-risk items immediately."
        )

    elif any(k in msg_lower for k in ["low stock", "low-stock", "running low"]):
        tool_used = "get_low_stock_products"
        data = _tool_get_low_stock(db)
        count = data["count"]
        items = data["low_stock_products"][:5]
        if items:
            names = ", ".join(i["name"] for i in items)
            response_text = (
                f"There are **{count} products** below minimum stock levels: **{names}**"
                + (f" and {count - 5} more." if count > 5 else ".")
            )
        else:
            response_text = "✅ All products are above their minimum stock levels."

    elif any(k in msg_lower for k in ["revenue", "earning", "income", "sales total"]):
        tool_used = "get_revenue"
        data = _tool_get_revenue(db)
        response_text = (
            f"Your total revenue is **${data['total_revenue']:,.2f}** "
            f"with an average of **${data['average_daily_revenue']:,.2f}/day** "
            f"over the last {data['period_days']} days."
        )

    elif any(k in msg_lower for k in ["top", "best selling", "best-selling", "popular"]):
        tool_used = "get_top_products"
        data = _tool_get_top_products(db, limit=5)
        products = data["top_products"]
        if products:
            lines = "\n".join(
                f"{i+1}. **{p['product_name']}** — ${p['total_revenue']:,.2f} ({p['units_sold']} units)"
                for i, p in enumerate(products)
            )
            response_text = f"Here are your **top 5 products by revenue**:\n\n{lines}"
        else:
            response_text = "No sales data available yet."

    elif any(k in msg_lower for k in ["inventory", "stock", "products"]):
        tool_used = "get_inventory"
        data = _tool_get_inventory(db)
        response_text = (
            f"Your inventory has **{data['total']} products**. "
            f"Use the Inventory page to view details, search, and manage stock levels."
        )

    elif any(k in msg_lower for k in ["analyze", "analysis", "overview", "summary"]):
        tool_used = "get_stockout_risk"
        stats = get_dashboard_stats(db)
        recs = _tool_get_reorder_recommendations(db)
        risk = _tool_get_stockout_risk(db)
        response_text = (
            f"**Business Overview:**\n\n"
            f"- 💰 Total Revenue: **${stats['total_revenue']:,.2f}**\n"
            f"- 📦 Products: **{stats['total_products']}**\n"
            f"- ⚠️ Low Stock: **{stats['low_stock_count']} products**\n"
            f"- 🔴 High Stockout Risk: **{risk['high_risk_count']} products**\n"
            f"- 📋 Reorder Needed: **{recs['count']} products**\n\n"
            f"I recommend reviewing your high-risk products immediately."
        )

    else:
        response_text = (
            "Hello! I'm **Founded Copilot** — your AI-powered business intelligence assistant. "
            "I can help you with:\n\n"
            "- 📦 **Inventory status** — 'Show me low stock products'\n"
            "- 🔴 **Stockout risks** — 'Which products are at risk?'\n"
            "- 📋 **Reorder recommendations** — 'What should I reorder?'\n"
            "- 💰 **Revenue analysis** — 'What is my revenue this month?'\n"
            "- 🏆 **Top products** — 'Show me my best-selling products'\n\n"
            "**Tip:** Configure `OPENAI_API_KEY` in your `.env` file to unlock full AI capabilities."
        )

    return {"message": response_text, "tool_used": tool_used, "data": data}


async def run_inventory_analysis_agent(db: Session) -> Dict:
    """
    Multi-step AI agent that analyzes inventory and prepares a restocking recommendation.
    Requires human approval before generating a purchase order.
    """
    steps = []

    # Step 1: Retrieve inventory
    steps.append({"step": 1, "action": "Retrieving inventory...", "status": "completed"})
    inventory = _tool_get_inventory(db)

    # Step 2: Retrieve recent sales
    steps.append({"step": 2, "action": "Retrieving recent sales data...", "status": "completed"})
    sales = _tool_get_sales(db)

    # Step 3: Retrieve demand forecasts (top 5 products)
    steps.append({"step": 3, "action": "Generating demand forecasts...", "status": "completed"})
    from services.forecast_service import generate_forecasts_for_product
    forecast_summaries = []
    for p in inventory["products"][:5]:
        result = generate_forecasts_for_product(db, p["id"], horizon_days=7)
        if result["forecasts"]:
            avg = sum(f["predicted_demand"] for f in result["forecasts"]) / len(result["forecasts"])
            forecast_summaries.append({"product_id": p["id"], "product_name": p["name"], "avg_daily_demand": round(avg, 2)})

    # Step 4: Calculate stockout risk
    steps.append({"step": 4, "action": "Calculating stockout risk...", "status": "completed"})
    risk = _tool_get_stockout_risk(db)

    # Step 5: Calculate reorder quantities
    steps.append({"step": 5, "action": "Calculating reorder quantities...", "status": "completed"})
    recommendations = _tool_get_reorder_recommendations(db)

    # Step 6: Generate recommendation
    steps.append({"step": 6, "action": "Generating recommendation report...", "status": "completed"})

    high_risk = risk["high_risk"]
    medium_risk = risk["medium_risk"]
    recs = recommendations["recommendations"]

    summary = (
        f"Inventory analysis complete. Found {risk['high_risk_count']} high-risk and "
        f"{risk['medium_risk_count']} medium-risk products. "
        f"{len(recs)} products require restocking."
    )

    return {
        "agent": "Founded Inventory Analysis Agent",
        "status": "awaiting_approval",
        "summary": summary,
        "steps_completed": steps,
        "analysis": {
            "total_products": inventory["total"],
            "high_risk_products": high_risk[:10],
            "medium_risk_products": medium_risk[:10],
            "reorder_recommendations": recs[:20],
            "forecast_summaries": forecast_summaries,
        },
        "human_approval_required": True,
        "approval_message": (
            "⚠️ Human approval required before creating purchase orders. "
            "Review the recommendations above and approve to proceed."
        ),
    }
