# FREDT: Fire Risk Evaluation and Decision Support System

FREDT is a Flask-based graduation project designed to support fire risk monitoring, corridor congestion tracking, SMS alert logging, and safe evacuation route decision-making through an AI-powered emergency management system.

## Live Demo

The project is deployed on Render and can be accessed from the following link:

```text
https://fredt.onrender.com
Demo Login Accounts

Use one of the following accounts to access the system:

Role	User ID	Password
Admin	4440099	s123
Manager	4440095	s123
Safety	4440055	s123
Main Features
Real-time fire risk monitoring.
Corridor congestion tracking.
AI-based fire and smoke risk prediction.
Safe evacuation path support.
SMS alert logging for responsible supervisors.
Role-based access for Admin, Manager, and Safety users.
Incident reports and daily report details.
Dashboard alarm sound support.
Render deployment support.
Project Structure
FREDT/
├── app.py
├── config.py
├── database.py
├── ml_utils.py
├── pathfinding.py
├── sms_utils.py
├── camera_feed.py
├── fix_daily_sms.py
├── requirements.txt
├── Procfile
├── render.yaml
├── .env.example
├── .gitignore
├── README.md
├── templates/
│   ├── login.html
│   ├── index.html
│   ├── admin.html
│   ├── reports.html
│   └── report_details.html
├── static/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   ├── main.js
│   │   ├── script.js
│   │   ├── admin.js
│   │   ├── reports.js
│   │   └── report_details.js
│   ├── audio/
│   │   └── alarm.wav
│   └── images/
├── data/
│   ├── final_training_data.csv
│   └── smoke_detection_iot.csv
├── videos/
│   └── vid1.avi
├── yolo_models/
│   └── yolov8n.pt
├── notebooks/
│   ├── smoke_xgboost_model.ipynb
│   ├── fire_risk_xgb.ipynb
│   └── Generate_Dataset.ipynb
├── smoke_xgboost_model.pkl
├── fire_risk_xgb.pkl
├── model_features.pkl
└── users.db
Run Locally

Create and activate a virtual environment:

python -m venv .venv
.venv\Scripts\activate

Install the required packages:

pip install -r requirements.txt

Run the Flask application:

python app.py

Then open the local URL:

http://127.0.0.1:5000
Render Deployment

This project includes both Procfile and render.yaml for deployment.

Render can run the project using:

gunicorn app:app

Recommended Render settings:

Build Command:
pip install -r requirements.txt

Start Command:
gunicorn app:app

Required environment variable:

SECRET_KEY=your_secret_key_here
Required Model Files

The Flask application loads trained model files directly during runtime.

Keep these files in the root project directory unless the code paths are updated:

smoke_xgboost_model.pkl
fire_risk_xgb.pkl
model_features.pkl

The YOLO model should be placed here:

yolo_models/yolov8n.pt
Required Media Files

The dashboard alarm sound should be placed here:

static/audio/alarm.wav

The camera demo video should be placed here:

videos/vid1.avi
Training Data

The data/ folder contains the CSV datasets used for model training and notebook documentation.

data/
├── final_training_data.csv
└── smoke_detection_iot.csv

The Flask application does not need these CSV files during normal runtime because it loads the trained .pkl models directly.

Keep the datasets in the repository if the graduation project submission needs to include reproducible model-training material.

Notebooks

The notebooks/ folder contains the model training and dataset generation notebooks:

notebooks/
├── smoke_xgboost_model.ipynb
├── fire_risk_xgb.ipynb
└── Generate_Dataset.ipynb

These notebooks are used for training documentation and are not required to run the Flask web application.

Important Notes
Do not upload .venv to GitHub.
Do not upload __pycache__ folders.
Keep model files in the paths expected by the code.
SQLite is suitable for the graduation demo.
Render storage can reset unless persistent storage is configured.
Large files such as videos and model files may require Git LFS if their size increases.
The SMS feature currently works in simulation mode unless real Twilio credentials are configured.
