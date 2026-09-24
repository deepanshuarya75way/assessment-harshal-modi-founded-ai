# Founded AI

### AI-Powered Business Operations & Intelligence Platform

> **Predict. Analyze. Decide. Act.**

Founded AI is an AI-powered business operations platform that combines inventory management, sales analytics, machine-learning demand forecasting, predictive inventory intelligence, and an LLM-powered business copilot — all in a single, production-grade application.

---

## 1. Project Overview

Founded AI gives small and medium businesses a unified intelligence layer over their operations. Instead of managing spreadsheets across disparate tools, operators get a single dashboard that shows what's happening, predicts what's coming, and recommends what to do next.

## 2. Problem Statement

SMBs typically lack:
- Real-time visibility into inventory health
- Predictive insight into demand and stock-out risk
- AI-assisted decision support for procurement

Founded AI solves all three problems in a single, affordable platform.

## 3. Solution

| Capability | How It Works |
|------------|-------------|
| Inventory Management | Full CRUD, stock level tracking, low-stock detection |
| Sales Tracking | Record sales, auto-reduce inventory, date-filtered history |
| ML Demand Forecasting | RandomForestRegressor with lag/rolling features, 14-day horizon |
| Stockout Risk | Days-of-stock calculation → LOW / MEDIUM / HIGH classification |
| Reorder Intelligence | Safety stock formula, reorder point, recommended quantity |
| Anomaly Detection | Z-score method on daily sales per product |
| AI Copilot | LLM with controlled function calling (no raw SQL exposure) |
| Purchase Orders | Full workflow: create → review → approve/reject |

## 4. Features

- 🔐 **JWT Authentication** with role-based access (ADMIN / MANAGER / STAFF)
- 📦 **Inventory Management** — add, edit, delete, search, filter products
- 🛒 **Sales Management** — record sales, auto-update stock, history + filters
- 🚚 **Suppliers** — manage supplier contact info and relationships
- 📋 **Purchase Orders** — create, review, approve (restocking on approval)
- 📈 **ML Demand Forecasting** — 14-day forward forecast per product
- ⚠️ **Stockout Risk** — algorithmic HIGH/MEDIUM/LOW risk classification
- 📊 **Analytics** — revenue trends, category breakdown, top products
- 🤖 **Founded Copilot** — ChatGPT-style business assistant with tool calling
- 🔔 **Alerts** — unified alert feed for stock, risk, and anomalies
- 🌙 **Dark Mode SaaS UI** — glassmorphism design with animated components

## 5. Architecture

```
Founded/
├── frontend/          React + Vite + Tailwind + Recharts
│   └── src/
│       ├── api/       Axios HTTP client with JWT interceptor
│       ├── components/ Layout, Sidebar, KPICard, Modal, etc.
│       ├── context/   AuthContext
│       └── pages/     All 12 application pages
├── backend/           FastAPI + SQLAlchemy
│   ├── routers/       One router per domain
│   ├── services/      Business logic layer
│   └── ml_models/     Trained model + metrics (auto-generated)
├── ml/                ML training script
├── docs/              Additional documentation
├── .env.example       Environment variable reference
└── README.md
```

## 6. Technology Stack

### Frontend
| Tech | Version | Purpose |
|------|---------|---------|
| React | 18.x | UI framework |
| Vite | 5.x | Build tool |
| Tailwind CSS | 3.x | Styling |
| React Router | 6.x | Client-side routing |
| Axios | 1.x | HTTP client |
| Recharts | 2.x | Charts and visualizations |
| Lucide React | 0.39x | Icon system |

### Backend
| Tech | Version | Purpose |
|------|---------|---------|
| FastAPI | 0.111 | REST API framework |
| SQLAlchemy | 2.x | ORM |
| Pydantic | 2.x | Schema validation |
| python-jose | 3.3 | JWT tokens |
| passlib[bcrypt] | 1.7 | Password hashing |

### Machine Learning
| Tech | Purpose |
|------|---------|
| scikit-learn | RandomForestRegressor |
| pandas | Data manipulation |
| NumPy | Numerical operations |
| joblib | Model serialization |

### Database
- **SQLite** (default, zero configuration)
- **PostgreSQL** (production, configured via `DATABASE_URL`)

## 7. Database Schema

```
users           id, name, email, password_hash, role, created_at
suppliers       id, name, email, phone, address
products        id, name, sku, category, price, cost_price,
                current_stock, minimum_stock, supplier_id, created_at
sales           id, product_id, quantity, unit_price, discount,
                total_amount, sale_date
forecasts       id, product_id, forecast_date, predicted_demand,
                confidence, created_at
purchase_orders id, supplier_id, status, total_amount, notes, created_at
purchase_order_items  id, purchase_order_id, product_id, quantity, unit_price
```

## 8. API Documentation

Interactive docs available at `http://localhost:8000/docs`

### Key Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register new user |
| POST | /api/auth/login | Login, get JWT |
| GET  | /api/auth/me | Current user |
| GET  | /api/products | List products (search, filter) |
| POST | /api/products | Create product |
| POST | /api/sales | Record a sale (auto-reduces stock) |
| GET  | /api/inventory/low-stock | Low-stock products |
| GET  | /api/inventory/stockout-risk | Risk classification |
| GET  | /api/inventory/recommendations | Reorder recommendations |
| GET  | /api/forecast/{product_id} | ML demand forecast |
| GET  | /api/analytics/dashboard | KPI stats |
| GET  | /api/analytics/revenue | Revenue trend |
| GET  | /api/analytics/anomalies | Sales anomaly detection |
| POST | /api/copilot/chat | AI Copilot chat |
| POST | /api/copilot/analyze-inventory | Inventory analysis agent |
| GET  | /api/alerts | All system alerts |

## 9. ML Methodology

### Training Data
- Synthetic: 2 years × 20 products × daily sales = ~14,600 samples
- Realistic: seasonality, weekday/weekend effects, holiday boost, price sensitivity, random discounts

### Feature Engineering
| Feature | Description |
|---------|-------------|
| day, month, day_of_week | Temporal features |
| is_weekend | Weekend indicator |
| week_of_year | Annual seasonality |
| price, discount | Product features |
| lag_1, lag_3, lag_7, lag_14 | Autoregressive lags |
| rolling_mean_7/14/30 | Moving averages |
| rolling_std_7/14/30 | Rolling volatility |

### Model
- **Algorithm**: RandomForestRegressor (n_estimators=150, max_depth=12)
- **Split**: Temporal 80/20 (not random — maintains time-series integrity)
- **Evaluation**: MAE, RMSE, R² on held-out test set
- **Persistence**: Saved via joblib, trained once on startup

### Prediction
- 14-day rolling horizon forecast per product
- Confidence decays with distance (from ~0.95 → ~0.70 at day 14)
- Fallback to 14-day moving average if model not available

## 10. AI Copilot Architecture

```
User Message
    │
    ▼
FastAPI /api/copilot/chat
    │
    ▼
LLM (OpenAI GPT-4o-mini)
    │ ← System Prompt (business context)
    │ ← Conversation history
    │ ← Tool schemas (NOT raw SQL)
    │
    ▼
Tool Selection (function calling)
    │
    ▼
Controlled Tools:
  get_inventory()          → Product list
  get_sales()              → Recent 30-day sales
  get_revenue()            → Revenue stats
  get_top_products()       → Top products by revenue
  get_low_stock_products() → Below minimum stock
  get_forecast()           → ML demand forecast
  get_stockout_risk()      → Risk classification
  get_reorder_recommendations() → Reorder calc
    │
    ▼
Tool Result (JSON)
    │
    ▼
LLM Second Pass → Natural Language Response
    │
    ▼
User
```

**Security**: The LLM selects from a fixed set of pre-approved tools. It cannot execute arbitrary SQL, access the database directly, or call any code outside the tool registry.

## 11. Agent Workflow

The **Inventory Analysis Agent** (`POST /api/copilot/analyze-inventory`) runs a controlled multi-step workflow:

```
Step 1: Retrieve inventory
Step 2: Retrieve recent sales (30 days)
Step 3: Generate demand forecasts (top products)
Step 4: Calculate stockout risk (all products)
Step 5: Calculate reorder quantities
Step 6: Generate recommendation report
          │
          ▼
      ⚠️  HUMAN APPROVAL REQUIRED
          │
          ▼
    (User clicks Approve in Purchase Orders UI)
          │
          ▼
    Purchase Order Created → Stock Restocked
```

The agent **never automatically creates a purchase order**. Human approval is mandatory.

## 12. Installation

### Prerequisites
- Python 3.10+
- Node.js 18+
- npm 9+

### Quick Start

```bash
# 1. Clone the repository
git clone https://github.com/your-username/founded-ai.git
cd founded-ai

# 2. Set up environment variables
cp .env.example .env
# Edit .env — at minimum, change SECRET_KEY

# 3. Set up the backend
cd backend
python -m venv venv

# Windows:
venv\Scripts\activate
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt

# 4. Start the backend (auto-seeds DB and trains ML model on first run)
uvicorn main:app --reload --port 8000

# 5. In a new terminal, set up and start the frontend
cd frontend
npm install
npm run dev

# App is running at http://localhost:5173
# API docs at http://localhost:8000/docs
```

### Demo Login
| Role | Email | Password |
|------|-------|----------|
| Admin | admin@founded.ai | founded2024 |
| Manager | manager@founded.ai | founded2024 |
| Staff | staff@founded.ai | founded2024 |

## 13. Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | No | `sqlite:///./founded.db` | Database connection URL |
| `SECRET_KEY` | **Yes** | ❌ | JWT signing secret (generate a strong random value) |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | No | `60` | JWT token lifetime |
| `FRONTEND_URL` | No | `http://localhost:5173` | CORS allowed origin |
| `OPENAI_API_KEY` | No | — | LLM API key (Copilot falls back to rule-based without it) |
| `OPENAI_BASE_URL` | No | `https://api.openai.com/v1` | Compatible with Groq, Together, etc. |
| `OPENAI_MODEL` | No | `gpt-4o-mini` | LLM model to use |

Generate a strong `SECRET_KEY`:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

## 14. Testing

### Backend
```bash
# Verify backend starts
cd backend && uvicorn main:app --reload

# Check API docs
open http://localhost:8000/docs

# Run seed data manually
python seed_data.py

# Train ML model manually
python -m ml.train
```

### Frontend
```bash
cd frontend
npm run build  # Verify production build
npm run dev    # Start dev server
```

## 15. Future Scope

- **Multi-tenant SaaS** — separate data per organization
- **Email notifications** — alerts via email (SendGrid/Mailgun)
- **Mobile app** — React Native companion
- **Supplier API integration** — auto-fetch catalog prices
- **Advanced forecasting** — LSTM/Prophet for time-series
- **Role-based UI** — hide admin features from staff
- **Audit logs** — track all inventory changes with user attribution
- **Export** — CSV/PDF export for reports and purchase orders
- **Integrations** — Shopify, WooCommerce, QuickBooks connectors

---

Built with ❤️ by the Founded AI team.
