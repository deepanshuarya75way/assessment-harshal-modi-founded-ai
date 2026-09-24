"""
Founded AI — Full System Integration & Verification Test Suite
Tests all endpoints, auth, roles, inventory deduction, ML forecasting, and Copilot.
"""
import sys
import os
from pathlib import Path

# Add backend and root to sys.path
backend_dir = Path(__file__).resolve().parent.parent / "backend"
root_dir = Path(__file__).resolve().parent.parent
os.chdir(str(backend_dir))
sys.path.insert(0, str(backend_dir))
sys.path.insert(0, str(root_dir))

from fastapi.testclient import TestClient
from main import app

def test_system_flow():
    with TestClient(app) as client:
        print("\n--- 1. Testing Health & API Root ---")
        res = client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        print("  [PASS] /health returned 200 OK")

        res = client.get("/")
        assert res.status_code == 200
        print("  [PASS] / returned 200 OK")

        print("\n--- 2. Testing Authentication ---")
        # Admin login
        res = client.post("/api/auth/login", json={"email": "admin@founded.ai", "password": "founded2024"})
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        admin_token = res.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print("  [PASS] Admin login succeeded, JWT acquired")

        # Current user /me
        res = client.get("/api/auth/me", headers=admin_headers)
        assert res.status_code == 200
        me_data = res.json()
        assert me_data["role"] == "ADMIN"
        print(f"  [PASS] /api/auth/me returned role: {me_data['role']}")

        # Staff login
        res = client.post("/api/auth/login", json={"email": "staff@founded.ai", "password": "founded2024"})
        assert res.status_code == 200
        staff_token = res.json()["access_token"]
        staff_headers = {"Authorization": f"Bearer {staff_token}"}
        print("  [PASS] Staff login succeeded")

        # Manager login
        res = client.post("/api/auth/login", json={"email": "manager@founded.ai", "password": "founded2024"})
        assert res.status_code == 200
        print("  [PASS] Manager login succeeded")

        # New user registration
        import uuid
        test_email = f"test_{uuid.uuid4().hex[:6]}@founded.ai"
        res = client.post("/api/auth/register", json={
            "name": "Test User",
            "email": test_email,
            "password": "Password123!",
            "role": "STAFF"
        })
        assert res.status_code in (200, 201), f"Register failed: {res.text}"
        print(f"  [PASS] New user registration succeeded ({test_email})")

        print("\n--- 3. Testing Products & Suppliers ---")
        res = client.get("/api/products", headers=admin_headers)
        assert res.status_code == 200
        products = res.json()
        assert len(products) > 0, "No products found in DB"
        test_prod = products[0]
        initial_stock = test_prod["current_stock"]
        print(f"  [PASS] {len(products)} products retrieved. Sample: '{test_prod['name']}' (Stock: {initial_stock})")

        res = client.get("/api/suppliers", headers=admin_headers)
        assert res.status_code == 200
        suppliers = res.json()
        assert len(suppliers) > 0
        print(f"  [PASS] {len(suppliers)} suppliers retrieved")

        print("\n--- 4. Testing Sales & Stock Update ---")
        res = client.post("/api/sales", json={
            "product_id": test_prod["id"],
            "quantity": 2,
            "unit_price": test_prod["price"],
            "discount": 0.0
        }, headers=admin_headers)
        assert res.status_code in (200, 201), f"Sale creation failed: {res.text}"
        sale_data = res.json()
        print(f"  [PASS] Sale recorded: ID={sale_data.get('id')}, Total=${sale_data.get('total_amount')}")

        # Verify inventory was decremented
        res = client.get(f"/api/products/{test_prod['id']}", headers=admin_headers)
        assert res.status_code == 200
        updated_prod = res.json()
        assert updated_prod["current_stock"] == initial_stock - 2, f"Expected stock {initial_stock - 2}, got {updated_prod['current_stock']}"
        print(f"  [PASS] Stock correctly decremented from {initial_stock} to {updated_prod['current_stock']}")

        print("\n--- 5. Testing Dashboard & Analytics ---")
        res = client.get("/api/analytics/dashboard", headers=admin_headers)
        assert res.status_code == 200
        dash = res.json()
        print(f"  [PASS] Dashboard metrics: Revenue=${dash.get('total_revenue')}, Sales={dash.get('total_sales')}, Low Stock={dash.get('low_stock_count')}")

        res = client.get("/api/analytics/revenue?days=30", headers=admin_headers)
        assert res.status_code == 200
        print(f"  [PASS] Revenue trend: {len(res.json())} daily data points")

        res = client.get("/api/analytics/categories", headers=admin_headers)
        assert res.status_code == 200
        print(f"  [PASS] Categories breakdown: {len(res.json())} categories")

        res = client.get("/api/analytics/top-products", headers=admin_headers)
        assert res.status_code == 200
        print(f"  [PASS] Top products: {len(res.json())} top products")

        print("\n--- 6. Testing ML Demand Forecasting ---")
        res = client.get(f"/api/forecast/{test_prod['id']}", headers=admin_headers)
        assert res.status_code == 200
        fc = res.json()
        assert "forecasts" in fc
        assert "model_metrics" in fc
        print(f"  [PASS] ML forecast generated with {len(fc['forecasts'])} forecast periods, model MAE: {fc['model_metrics'].get('evaluation', {}).get('MAE')}")

        res = client.get("/api/forecast", headers=admin_headers)
        assert res.status_code == 200
        print(f"  [PASS] /api/forecast returned {len(res.json())} latest forecasts across products")

        print("\n--- 7. Testing Inventory Intelligence & Alerts ---")
        res = client.get("/api/inventory/recommendations", headers=admin_headers)
        assert res.status_code == 200
        print(f"  [PASS] Reorder recommendations: {len(res.json())} items analyzed")

        res = client.get("/api/alerts", headers=admin_headers)
        assert res.status_code == 200
        print(f"  [PASS] Alerts: {len(res.json())} system alerts active")

        res = client.get("/api/purchase-orders", headers=admin_headers)
        assert res.status_code == 200
        print(f"  [PASS] Purchase orders: {len(res.json())} POs listed")

        print("\n--- 8. Testing Founded Copilot (AI Business Assistant) ---")
        # Test Chat with Tool Calling (works with OpenAI key or built-in rule-based fallback!)
        res = client.post("/api/copilot/chat", json={
            "message": "Which products should I reorder?",
            "history": []
        }, headers=admin_headers)
        assert res.status_code == 200, f"Copilot chat failed: {res.text}"
        copilot_reply = res.json()
        assert "message" in copilot_reply
        print(f"  [PASS] Copilot replied (Tool used: '{copilot_reply.get('tool_used')}'): {copilot_reply['message'][:80]}...")

        # Test Agent Restocking Workflow
        res = client.post("/api/copilot/analyze-inventory", headers=admin_headers)
        assert res.status_code == 200, f"Copilot agent workflow failed: {res.text}"
        agent_data = res.json()
        print(f"  [PASS] Copilot Agent Workflow succeeded: Status={agent_data.get('status')}, Items evaluated={len(agent_data.get('items', []))}")

        print("\n========================================================")
        print("ALL FOUNDED AI BACKEND INTEGRATION TESTS PASSED 100%!")
        print("========================================================")

if __name__ == "__main__":
    test_system_flow()
