import os
import json
import joblib
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify, send_from_directory

app = Flask(__name__, static_folder='static')

# Global variables for models and metadata
scaler = None
categories_list = []
models = {}

def load_models():
    global scaler, categories_list, models
    try:
        scaler_path = "models/scaler.joblib"
        categories_path = "models/categories.json"
        
        if os.path.exists(scaler_path) and os.path.exists(categories_path):
            scaler = joblib.load(scaler_path)
            with open(categories_path, "r") as f:
                categories_list = json.load(f)
            
            models = {
                "logistic_regression": joblib.load("models/logistic_regression.joblib"),
                "decision_tree": joblib.load("models/decision_tree.joblib"),
                "random_forest": joblib.load("models/random_forest.joblib")
            }
            print("Models and metadata loaded successfully.")
            return True
    except Exception as e:
        print(f"Error loading models: {e}")
    return False

# Haversine distance function
def haversine_distance(lat1, lon1, lat2, lon2):
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2.0)**2
    c = 2 * np.arcsin(np.sqrt(a))
    return 6371 * c

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    return send_from_directory('static', path)

@app.route('/api/metrics', methods=['GET'])
def get_metrics():
    metrics_file = "models/metrics.json"
    if os.path.exists(metrics_file):
        with open(metrics_file, "r") as f:
            return jsonify(json.load(f))
    else:
        return jsonify({"error": "Metrics file not found. Have you trained the models yet?"}), 404

@app.route('/api/predict', methods=['POST'])
def predict():
    global scaler, categories_list, models
    
    # Ensure models are loaded
    if not models or scaler is None:
        loaded = load_models()
        if not loaded:
            return jsonify({"error": "Models are not loaded or not trained yet."}), 503
            
    try:
        data = request.get_json()
        
        # Check inputs
        required_fields = ['amt', 'gender', 'dob', 'trans_date_trans_time', 'category', 'lat', 'long', 'merch_lat', 'merch_long', 'city_pop']
        for f in required_fields:
            if f not in data or data[f] is None:
                return jsonify({"error": f"Missing or null field: {f}"}), 400
                
        # Parse inputs
        amt = float(data['amt'])
        gender = data['gender']
        dob = pd.to_datetime(data['dob'])
        trans_time = pd.to_datetime(data['trans_date_trans_time'])
        category = data['category']
        lat = float(data['lat'])
        long = float(data['long'])
        merch_lat = float(data['merch_lat'])
        merch_long = float(data['merch_long'])
        city_pop = float(data['city_pop'])
        
        # Calculate features
        hour = trans_time.hour
        day_of_week = trans_time.dayofweek
        age = (trans_time - dob).days / 365.25
        distance_km = haversine_distance(lat, long, merch_lat, merch_long)
        gender_M = 1 if gender == 'M' else 0
        
        # Build features DataFrame
        feat_dict = {
            'amt': amt,
            'age': age,
            'distance_km': distance_km,
            'hour': hour,
            'day_of_week': day_of_week,
            'city_pop': city_pop,
            'gender_M': gender_M
        }
        
        for cat in categories_list:
            feat_dict[f'category_{cat}'] = 1 if category == cat else 0
            
        df_feat = pd.DataFrame([feat_dict])
        
        # Scale numeric features
        numeric_cols = ['amt', 'age', 'distance_km', 'hour', 'day_of_week', 'city_pop']
        df_feat[numeric_cols] = scaler.transform(df_feat[numeric_cols])
        
        # Perform predictions
        results = {}
        for name, model in models.items():
            prob = model.predict_proba(df_feat)[0, 1]
            pred = int(model.predict(df_feat)[0])
            results[name] = {
                "prediction": pred,
                "probability": float(prob)
            }
            
        # Return predictions and calculated features
        return jsonify({
            "features": {
                "calculated_age": round(age, 1),
                "calculated_distance_km": round(distance_km, 2),
                "hour": hour,
                "day_of_week": day_of_week
            },
            "predictions": results
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Try to load models on startup
    load_models()
    # Run application
    app.run(host='0.0.0.0', port=5000, debug=True)
