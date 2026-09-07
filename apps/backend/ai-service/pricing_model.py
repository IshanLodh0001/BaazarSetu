import pandas as pd
import numpy as np
from xgboost import XGBRegressor
from sklearn.preprocessing import OneHotEncoder
import os

class PricingModel:
    def __init__(self):
        self.model = None
        self.encoder = None
        self.is_trained = False
        self.model_version = "xgboost-v1-demo"
        
        # Categorical features that need encoding
        self.categorical_features = ['category', 'subCategory', 'craftType', 'material', 'state']
        
    def load_and_train(self, data_path: str):
        """Loads demo training data and trains the model for prototype purposes."""
        if not os.path.exists(data_path):
            print(f"Warning: Training data not found at {data_path}. Model will not be trained.")
            return False
            
        df = pd.read_csv(data_path)
        
        # Prepare target
        y = df['marketAveragePrice'].values
        
        # Prepare features
        # 1. Numerical features
        numerical_features = ['quantity', 'rawMaterialCost', 'labourCost', 'packagingCost', 'transportCost', 'otherCost', 'totalCost']
        X_num = df[numerical_features].values
        
        # 2. Categorical features
        X_cat = df[self.categorical_features].fillna('Unknown')
        self.encoder = OneHotEncoder(handle_unknown='ignore', sparse_output=False)
        X_cat_encoded = self.encoder.fit_transform(X_cat)
        
        # Combine
        X = np.hstack((X_num, X_cat_encoded))
        
        # Train XGBoost CPU model
        self.model = XGBRegressor(n_estimators=100, max_depth=3, learning_rate=0.1, n_jobs=-1, random_state=42)
        self.model.fit(X, y)
        self.is_trained = True
        print("PricingModel trained successfully on demo dataset.")
        return True

    def predict(self, features: dict) -> float:
        """Predicts the market price based on input features."""
        if not self.is_trained:
            # Fallback heuristic if no model is trained
            return features.get('totalCost', 0) * 1.5

        # Numerical features
        num_vals = [
            features.get('quantity', 1),
            features.get('rawMaterialCost', 0),
            features.get('labourCost', 0),
            features.get('packagingCost', 0),
            features.get('transportCost', 0),
            features.get('otherCost', 0),
            features.get('totalCost', 0)
        ]
        X_num = np.array([num_vals])
        
        # Categorical features
        cat_df = pd.DataFrame([{
            'category': features.get('category') or 'Unknown',
            'subCategory': features.get('subCategory') or 'Unknown',
            'craftType': features.get('craftType') or 'Unknown',
            'material': features.get('material') or 'Unknown',
            'state': features.get('state') or 'Unknown'
        }])
        
        X_cat_encoded = self.encoder.transform(cat_df)
        
        # Combine
        X = np.hstack((X_num, X_cat_encoded))
        
        prediction = self.model.predict(X)[0]
        # Return at least the cost
        return max(float(prediction), features.get('totalCost', 0))

pricing_model_instance = PricingModel()
