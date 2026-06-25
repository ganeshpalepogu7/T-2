# AegisCard // AI Credit Card Fraud Screening & Model Benchmark

AegisCard is a machine learning dashboard designed to analyze and screen simulated credit card transactions for potential fraud using three predictive models: **Random Forest**, **Decision Tree**, and **Logistic Regression**.

---

## Live Static Deployment (GitHub Pages)

This project has been updated with **static fallback support**. If you deploy it statically on GitHub Pages or double-click `index.html` locally:
* Chart analytics are drawn using the precalculated [metrics.json](file:///C:/Users/neela/T-2/static/metrics.json) file.
* Predictions run instantly in the browser using a client-side heuristic simulation that mimics the scikit-learn models.

### To Enable GitHub Pages:
1. Go to your repository on GitHub: **`https://github.com/ganeshpalepogu7/T-2`**.
2. Click on **Settings** -> **Pages**.
3. Under **Build and deployment**, set the source to **Deploy from a branch**.
4. Select the **`main`** branch and the **`/ (root)`** folder, then click **Save**.
5. After a few minutes, GitHub will host your working live site!

---

## Local Setup & Development (Python Flask Server)

To run the full pipeline locally with active machine learning inference:

### 1. Install Dependencies
Ensure you have Python installed, then run:
```bash
pip install -r requirements.txt
```

### 2. Download the Dataset
The dataset from Kaggle needs to be downloaded before training the models:
```bash
python download_data.py
```
*(This downloads the dataset `kartik2112/fraud-detection` and extracts the CSV files into a local `data/` folder).*

### 3. Train the Models
Train the scikit-learn classifiers and generate the dashboard evaluation metrics:
```bash
python train_models.py
```
*(This generates the serialised model binaries and dashboard metrics inside the `models/` folder).*

### 4. Run the Flask Server
Start the local server:
```bash
python server.py
```
Open **[http://localhost:5000](http://localhost:5000)** in your browser to view and interact with the active model prediction dashboard.
