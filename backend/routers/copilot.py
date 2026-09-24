"""
Founded AI — Copilot Router
LLM-powered business assistant with controlled tool calling.
The LLM NEVER executes arbitrary SQL — it selects from pre-defined tools.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

import models, schemas
from database import get_db
from auth import get_current_user
from services.copilot_service import run_copilot, run_inventory_analysis_agent

router = APIRouter(prefix="/api/copilot", tags=["copilot"])


@router.post("/chat", response_model=schemas.CopilotResponse)
async def chat(
    payload: schemas.CopilotRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """
    Main chat endpoint for Founded Copilot.
    The LLM selects the appropriate business tool and returns a natural-language response.
    """
    try:
        result = await run_copilot(
            message=payload.message,
            history=payload.history,
            db=db,
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Copilot error: {str(e)}")


@router.post("/analyze-inventory")
async def analyze_inventory(
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    """
    AI Agent workflow: Analyze inventory and prepare restocking recommendation.
    Step 1: Retrieve inventory
    Step 2: Retrieve recent sales
    Step 3: Retrieve demand forecasts
    Step 4: Calculate stockout risk
    Step 5: Calculate reorder quantities
    Step 6: Generate recommendation (requires human approval before PO)
    """
    try:
        result = await run_inventory_analysis_agent(db)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent error: {str(e)}")
