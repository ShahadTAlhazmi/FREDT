# FREDT — Fire Risk and Evacuation Decision Technology

FREDT is a Flask-based graduation project for fire risk monitoring, corridor congestion tracking, SMS alert logging, and safe evacuation path support.

## Project structure

```text
FREDT_Render_GitHub/
├── app.py
├── config.py
├── database.py
├── ml_utils.py
├── pathfinding.py
├── sms_utils.py
├── requirements.txt
├── Procfile
├── render.yaml
├── templates/
├── static/
│   ├── css/style.css
│   ├── js/
│   ├── audio/
│   └── images/
├── videos/
├── yolo_models/
└── notebooks/
```

## Run locally

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

Then open:

```text
http://127.0.0.1:5000
```

## Demo login accounts

```text
Admin   : 4440099 / s123
Manager : 4440095 / s123
Safety  : 4440055 / s123
```

## Render deployment

This project includes both `Procfile` and `render.yaml`. Render can use:

```bash
gunicorn app:app
```

## Required media files

Place the alarm file here if it is used by the dashboard:

```text
static/audio/alarm.mp3
```

Place the camera demo video here:

```text
videos/vid1.vi
```

## Notes

- Do not upload `.venv` to GitHub.
- Keep model files in the paths expected by the code.
- SQLite works for the graduation demo, but Render storage can reset unless persistent storage is configured.

## Training Data

The `data/` folder contains the CSV datasets used for model training and notebook documentation. The Flask app does not need these CSV files during normal runtime because it loads the trained `.pkl` models directly. Keep them in the repository if you want the graduation project submission to include reproducible model-training material.
