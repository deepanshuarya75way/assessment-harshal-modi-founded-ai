# Founded AI — Architecture Documentation

See the main [README.md](../README.md) for full documentation.

## Component Diagrams

### Request Flow

```
Browser (React)
    │ HTTP + JWT
    ▼
FastAPI (Port 8000)
    │
    ├── Auth Router     → JWT verify + bcrypt
    ├── Products Router → SQLAlchemy ORM
    ├── Sales Router    → ORM + auto-stock-reduce
    ├── Inventory Router → Inventory Service
    ├── Analytics Router → Analytics Service
    ├── Forecast Router  → Forecast Service + ML Model
    ├── Copilot Router   → Copilot Service + OpenAI
    └── Alerts Router    → Aggregated alerts
    │
    ▼
SQLite / PostgreSQL
```

### ML Pipeline

```
Synthetic Data (2yr × 20 products)
    │
    ▼
Feature Engineering
  - Lag features (1, 3, 7, 14 days)
  - Rolling means/std (7, 14, 30 days)
  - Temporal: day, month, dow, week, is_weekend
  - Product: price, discount
    │
    ▼
Train/Test Split (80/20 temporal)
    │
    ▼
RandomForestRegressor
  n_estimators=150, max_depth=12
    │
    ▼
Evaluation: MAE, RMSE, R²
    │
    ▼
joblib.dump → ml_models/demand_forecaster.joblib
              ml_models/metrics.json
```

### AI Copilot Tool Flow

```
User Message → LLM (GPT-4o-mini)
                  │
                  ▼ (function_calling)
              Tool Selection
                  │
        ┌─────────┴─────────┐
        ▼                   ▼
  get_inventory()     get_revenue()
  get_sales()         get_top_products()
  get_forecast()      get_stockout_risk()
  get_low_stock()     get_reorder_recs()
        │
        ▼ (JSON result)
      LLM Second Pass
        │
        ▼
  Natural Language Response → User
```
