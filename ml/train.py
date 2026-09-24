"""
Founded AI — ML Demand Forecasting Model Trainer
Generates synthetic training data, engineers features, trains a RandomForestRegressor,
evaluates it honestly, and saves the model + metrics.

Run: python -m ml.train
Or automatically called on backend startup.
"""
import os
import sys
import json
import logging
import warnings

warnings.filterwarnings("ignore")
logger = logging.getLogger(__name__)

MODEL_DIR = os.path.join(os.path.dirname(__file__), "..", "backend", "ml_models")
MODEL_PATH = os.path.join(MODEL_DIR, "demand_forecaster.joblib")
METRICS_PATH = os.path.join(MODEL_DIR, "metrics.json")


def generate_synthetic_data():
    """
    Generate realistic synthetic sales data for model training.
    Features: date attributes, price, discount, lag values, rolling averages.
    """
    import numpy as np
    import pandas as pd

    np.random.seed(42)
    num_products = 20
    days = 365 * 2  # 2 years

    all_records = []
    for product_id in range(1, num_products + 1):
        base_demand = np.random.uniform(2, 15)
        price = np.random.uniform(8, 400)
        price_sensitivity = -0.002 * (price / 100)

        dates = pd.date_range(start="2023-01-01", periods=days, freq="D")

        for i, date in enumerate(dates):
            # Seasonal trend
            season = 1 + 0.3 * np.sin(2 * np.pi * date.dayofyear / 365)
            # Weekend boost
            weekend = 1.25 if date.dayofweek >= 5 else 1.0
            # Holiday spike (Nov, Dec)
            holiday = 1.4 if date.month in [11, 12] else 1.0
            # Random discount
            discount = np.random.choice([0, 5, 10, 15, 20], p=[0.6, 0.15, 0.1, 0.1, 0.05])
            discount_factor = 1 + (discount / 100) * 0.5  # Discount boosts demand a little

            demand = base_demand * season * weekend * holiday * discount_factor
            demand += np.random.normal(0, demand * 0.2)
            demand = max(0, round(demand))

            all_records.append({
                "product_id": product_id,
                "date": date,
                "quantity": demand,
                "price": round(price, 2),
                "discount": discount,
            })

    df = pd.DataFrame(all_records)
    df = df.sort_values(["product_id", "date"]).reset_index(drop=True)
    return df


def engineer_features(df):
    """Add temporal and lag features per product."""
    import pandas as pd

    df = df.copy()
    df["day"] = df["date"].dt.day
    df["month"] = df["date"].dt.month
    df["day_of_week"] = df["date"].dt.dayofweek
    df["week_of_year"] = df["date"].dt.isocalendar().week.astype(int)
    df["is_weekend"] = (df["day_of_week"] >= 5).astype(int)

    # Lag and rolling features per product
    df = df.sort_values(["product_id", "date"])

    grouped = df.groupby("product_id")["quantity"]
    for lag in [1, 3, 7, 14]:
        df[f"lag_{lag}"] = grouped.shift(lag)
    for window in [7, 14, 30]:
        df[f"rolling_mean_{window}"] = grouped.transform(
            lambda x: x.shift(1).rolling(window=window, min_periods=1).mean()
        )
        df[f"rolling_std_{window}"] = grouped.transform(
            lambda x: x.shift(1).rolling(window=window, min_periods=1).std().fillna(0)
        )

    df = df.dropna()
    return df


FEATURE_COLS = [
    "day", "month", "day_of_week", "week_of_year", "is_weekend",
    "price", "discount",
    "lag_1", "lag_3", "lag_7", "lag_14",
    "rolling_mean_7", "rolling_mean_14", "rolling_mean_30",
    "rolling_std_7", "rolling_std_14", "rolling_std_30",
]


def train_model():
    """Train the demand forecasting model and save it."""
    import numpy as np
    import pandas as pd
    import joblib
    from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
    from sklearn.model_selection import train_test_split
    from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
    from sklearn.preprocessing import StandardScaler
    from sklearn.pipeline import Pipeline

    os.makedirs(MODEL_DIR, exist_ok=True)
    logger.info("🤖 Generating synthetic training data...")
    df = generate_synthetic_data()

    logger.info("🔧 Engineering features...")
    df = engineer_features(df)

    available_cols = [c for c in FEATURE_COLS if c in df.columns]
    X = df[available_cols].fillna(0)
    y = df["quantity"]

    # Temporal split: train on first 80%, test on last 20%
    split_idx = int(len(df) * 0.8)
    X_train, X_test = X.iloc[:split_idx], X.iloc[split_idx:]
    y_train, y_test = y.iloc[:split_idx], y.iloc[split_idx:]

    logger.info(f"📦 Training set: {len(X_train)} samples | Test set: {len(X_test)} samples")

    model = RandomForestRegressor(
        n_estimators=150,
        max_depth=12,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=42,
        n_jobs=-1,
    )

    logger.info("🏋️ Training RandomForestRegressor...")
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    y_pred = np.maximum(y_pred, 0)  # Demand can't be negative

    mae = mean_absolute_error(y_test, y_pred)
    rmse = mean_squared_error(y_test, y_pred, squared=False)
    r2 = r2_score(y_test, y_pred)

    metrics = {
        "model": "RandomForestRegressor",
        "n_estimators": 150,
        "max_depth": 12,
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "features": available_cols,
        "evaluation": {
            "MAE": round(float(mae), 4),
            "RMSE": round(float(rmse), 4),
            "R2": round(float(r2), 4),
        },
        "trained_at": pd.Timestamp.now().isoformat(),
    }

    logger.info(f"📊 Model Evaluation → MAE: {mae:.4f}, RMSE: {rmse:.4f}, R²: {r2:.4f}")

    joblib.dump(model, MODEL_PATH)
    with open(METRICS_PATH, "w") as f:
        json.dump(metrics, f, indent=2)

    logger.info(f"✅ Model saved to {MODEL_PATH}")
    logger.info(f"✅ Metrics saved to {METRICS_PATH}")
    return metrics


def train_model_if_needed():
    """Only train if model doesn't exist yet."""
    if os.path.exists(MODEL_PATH):
        logger.info("🤖 ML model already trained. Skipping.")
        return
    logger.info("🤖 No ML model found. Training now...")
    train_model()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    metrics = train_model()
    print("\n📊 Training Results:")
    print(json.dumps(metrics["evaluation"], indent=2))
