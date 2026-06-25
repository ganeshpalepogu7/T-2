import os
import json
import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_curve, auc, precision_recall_curve, confusion_matrix

def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate the great circle distance between two points 
    on the earth (specified in decimal degrees)
    """
    # Convert decimal degrees to radians
    lat1, lon1, lat2, lon2 = map(np.radians, [lat1, lon1, lat2, lon2])
    
    # Haversine formula
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = np.sin(dlat/2.0)**2 + np.cos(lat1) * np.cos(lat2) * np.sin(dlon/2.0)**2
    c = 2 * np.arcsin(np.sqrt(a))
    km = 6371 * c
    return km

def downsample_curve_points(x, y, n_points=100):
    """Downsamples curve points to avoid writing massive JSON files."""
    if len(x) <= n_points:
        return x.tolist(), y.tolist()
    # Use linearly spaced indices
    indices = np.linspace(0, len(x) - 1, n_points, dtype=int)
    return x[indices].tolist(), y[indices].tolist()

def main():
    print("Starting Machine Learning Pipeline...")
    
    train_path = "data/fraudTrain.csv"
    test_path = "data/fraudTest.csv"
    
    if not os.path.exists(train_path) or not os.path.exists(test_path):
        print("ERROR: Dataset files not found. Please make sure download_data.py has run successfully.")
        return
        
    print("Loading datasets (this may take a few moments)...")
    train_df = pd.read_csv(train_path)
    test_df = pd.read_csv(test_path)
    
    # Clean column names (strip spaces or Unnamed index columns)
    if 'Unnamed: 0' in train_df.columns:
        train_df = train_df.drop(columns=['Unnamed: 0'])
    if 'Unnamed: 0' in test_df.columns:
        test_df = test_df.drop(columns=['Unnamed: 0'])
        
    print(f"Loaded Train set: {train_df.shape[0]} rows, Test set: {test_df.shape[0]} rows")
    
    # Calculate dataset stats for the dashboard before downsampling
    total_train_fraud = int(train_df['is_fraud'].sum())
    total_train_legit = len(train_df) - total_train_fraud
    total_test_fraud = int(test_df['is_fraud'].sum())
    total_test_legit = len(test_df) - total_test_fraud
    
    avg_amt_fraud = float(train_df[train_df['is_fraud'] == 1]['amt'].mean())
    avg_amt_legit = float(train_df[train_df['is_fraud'] == 0]['amt'].mean())
    
    print(f"Train Fraud Rate: {total_train_fraud / len(train_df) * 100:.3f}% ({total_train_fraud} fraud cases)")
    print(f"Test Fraud Rate: {total_test_fraud / len(test_df) * 100:.3f}% ({total_test_fraud} fraud cases)")
    
    # Resample training data (keep all fraud, and downsample legitimate transactions to 1:10 ratio)
    print("Resampling training data to handle class imbalance and accelerate training...")
    train_fraud_df = train_df[train_df['is_fraud'] == 1]
    train_legit_df = train_df[train_df['is_fraud'] == 0]
    
    # 1:10 ratio of fraud to legitimate transactions
    n_legit_samples = min(len(train_legit_df), len(train_fraud_df) * 10)
    train_legit_sampled = train_legit_df.sample(n=n_legit_samples, random_state=42)
    
    resampled_train_df = pd.concat([train_fraud_df, train_legit_sampled]).sample(frac=1.0, random_state=42)
    print(f"Resampled training set shape: {resampled_train_df.shape[0]} rows ({len(train_fraud_df)} fraud, {n_legit_samples} legitimate)")
    
    # Features preprocessing
    print("Engineering features...")
    
    # Get standard categories from the train set
    categories_list = sorted(resampled_train_df['category'].unique().tolist())
    
    def process_features(df, scaler=None, is_train=True):
        processed = pd.DataFrame()
        
        # Datetime processing
        times = pd.to_datetime(df['trans_date_trans_time'])
        dobs = pd.to_datetime(df['dob'])
        
        processed['amt'] = df['amt'].values
        processed['age'] = ((times - dobs).dt.days / 365.25).values
        processed['distance_km'] = haversine_distance(df['lat'], df['long'], df['merch_lat'], df['merch_long']).values
        processed['hour'] = times.dt.hour.values
        processed['day_of_week'] = times.dt.dayofweek.values
        processed['city_pop'] = df['city_pop'].values
        processed['gender_M'] = (df['gender'] == 'M').astype(int).values
        
        # Category one-hot encoding
        for cat in categories_list:
            processed[f'category_{cat}'] = (df['category'] == cat).astype(int).values
            
        # Numerical scaling
        numeric_cols = ['amt', 'age', 'distance_km', 'hour', 'day_of_week', 'city_pop']
        if is_train:
            scaler = StandardScaler()
            processed[numeric_cols] = scaler.fit_transform(processed[numeric_cols])
        else:
            processed[numeric_cols] = scaler.transform(processed[numeric_cols])
            
        return processed, scaler
    
    # Preprocess Train
    X_train, scaler = process_features(resampled_train_df, is_train=True)
    y_train = resampled_train_df['is_fraud'].values
    
    # Preprocess Test
    print("Preprocessing test data (full imbalanced test set)...")
    X_test, _ = process_features(test_df, scaler=scaler, is_train=False)
    y_test = test_df['is_fraud'].values
    
    # Make directories for models
    os.makedirs("models", exist_ok=True)
    
    # Save preprocessing artifacts
    joblib.dump(scaler, "models/scaler.joblib")
    with open("models/categories.json", "w") as f:
        json.dump(categories_list, f)
        
    # Fit Models
    models = {
        "Logistic Regression": LogisticRegression(max_iter=1000, random_state=42),
        "Decision Tree": DecisionTreeClassifier(max_depth=10, min_samples_split=20, random_state=42),
        "Random Forest": RandomForestClassifier(n_estimators=100, max_depth=12, random_state=42, n_jobs=-1)
    }
    
    dashboard_metrics = {}
    
    for name, model in models.items():
        print(f"Training {name}...")
        model.fit(X_train, y_train)
        
        # Save model
        model_filename = f"models/{name.lower().replace(' ', '_')}.joblib"
        joblib.dump(model, model_filename)
        print(f"Saved {name} to {model_filename}")
        
        # Predict
        print(f"Evaluating {name}...")
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        
        # Compute metrics
        acc = accuracy_score(y_test, y_pred)
        prec = precision_score(y_test, y_pred, zero_division=0)
        rec = recall_score(y_test, y_pred, zero_division=0)
        f1 = f1_score(y_test, y_pred, zero_division=0)
        
        # Confusion matrix
        tn, fp, fn, tp = confusion_matrix(y_test, y_pred).ravel()
        
        # ROC Curve
        fpr_arr, tpr_arr, _ = roc_curve(y_test, y_prob)
        auc_roc = auc(fpr_arr, tpr_arr)
        fpr_ds, tpr_ds = downsample_curve_points(fpr_arr, tpr_arr)
        
        # Precision-Recall Curve
        prec_arr, rec_arr, _ = precision_recall_curve(y_test, y_prob)
        auc_pr = auc(rec_arr, prec_arr)
        # Note: precision_recall_curve returns precision in index 0 and recall in index 1.
        # Plotting uses recall on X and precision on Y.
        rec_ds, prec_ds = downsample_curve_points(rec_arr, prec_arr)
        
        # Get feature importances / coefficients
        feature_importance = {}
        features = list(X_train.columns)
        
        if hasattr(model, 'feature_importances_'):
            importances = model.feature_importances_
            # Sort features by importance
            sorted_indices = np.argsort(importances)[::-1]
            for idx in sorted_indices[:10]: # Top 10
                feature_importance[features[idx]] = float(importances[idx])
        elif hasattr(model, 'coef_'):
            coefs = model.coef_[0]
            # Sort features by absolute coefficient magnitude
            sorted_indices = np.argsort(np.abs(coefs))[::-1]
            for idx in sorted_indices[:10]: # Top 10
                feature_importance[features[idx]] = float(coefs[idx])
                
        dashboard_metrics[name] = {
            "accuracy": float(acc),
            "precision": float(prec),
            "recall": float(rec),
            "f1_score": float(f1),
            "auc_roc": float(auc_roc),
            "auc_pr": float(auc_pr),
            "confusion_matrix": {
                "tn": int(tn),
                "fp": int(fp),
                "fn": int(fn),
                "tp": int(tp)
            },
            "roc_curve": {
                "fpr": fpr_ds,
                "tpr": tpr_ds
            },
            "pr_curve": {
                "recall": rec_ds,
                "precision": prec_ds
            },
            "feature_importance": feature_importance
        }
        
        print(f"{name} Results - F1: {f1:.4f}, Recall: {rec:.4f}, Precision: {prec:.4f}")
        
    # Save metadata and stats
    stats = {
        "train_size": len(train_df),
        "test_size": len(test_df),
        "train_fraud_count": total_train_fraud,
        "train_legit_count": total_train_legit,
        "test_fraud_count": total_test_fraud,
        "test_legit_count": total_test_legit,
        "avg_amt_fraud": avg_amt_fraud,
        "avg_amt_legit": avg_amt_legit,
        "categories": categories_list
    }
    
    with open("models/metrics.json", "w") as f:
        json.dump({
            "stats": stats,
            "metrics": dashboard_metrics
        }, f, indent=4)
        
    print("Machine learning pipeline finished! Models and metrics exported successfully.")

if __name__ == "__main__":
    main()
