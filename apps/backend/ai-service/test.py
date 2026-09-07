import os
import sys

def test_pricing_model():
    print("Testing XGBoost Pricing Model (CPU)...")
    from pricing_model import PricingModel

    model = PricingModel()
    data_path = os.path.join(os.path.dirname(__file__), "data", "pricing_training.csv")
    
    assert os.path.exists(data_path), f"Demo training data file not found at {data_path}"
    
    trained = model.load_and_train(data_path)
    assert trained is True, "Model failed to train on demo data"
    assert model.is_trained is True
    assert model.model_version == "xgboost-v1-demo"

    # Test prediction
    sample_features = {
        "category": "Pottery",
        "subCategory": "Vase",
        "craftType": "Clay Molding",
        "material": "Terracotta",
        "state": "Uttar Pradesh",
        "quantity": 1,
        "rawMaterialCost": 150,
        "labourCost": 200,
        "packagingCost": 50,
        "transportCost": 50,
        "otherCost": 20,
        "totalCost": 470
    }

    predicted_price = model.predict(sample_features)
    print(f"Predicted market price: {predicted_price}")
    assert isinstance(predicted_price, (int, float))
    assert predicted_price >= sample_features["totalCost"], "Price should be at least total cost"
    print("PricingModel unit test: PASSED")

def test_fastapi_endpoint():
    print("Testing FastAPI /api/ai/predict-price endpoint...")
    from fastapi.testclient import TestClient
    from main import app

    client = TestClient(app)
    payload = {
        "category": "Textiles",
        "subCategory": "Saree",
        "craftType": "Weaving",
        "material": "Silk",
        "state": "Gujarat",
        "quantity": 1,
        "rawMaterialCost": 1500,
        "labourCost": 800,
        "packagingCost": 100,
        "transportCost": 200,
        "otherCost": 50,
        "totalCost": 2650
    }

    response = client.post("/api/ai/predict-price", json=payload)
    assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    data = response.json()
    print(f"Response: {data}")
    assert "predictedMarketPrice" in data
    assert "confidenceLevel" in data
    assert "modelVersion" in data
    assert data["predictedMarketPrice"] >= payload["totalCost"]
    print("FastAPI endpoint test: PASSED")

if __name__ == "__main__":
    try:
        test_pricing_model()
        test_fastapi_endpoint()
        print("All Python AI pricing tests PASSED successfully!")
    except Exception as e:
        print(f"Test failed with error: {e}")
        sys.exit(1)
