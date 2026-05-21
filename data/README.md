# Training Data

This folder contains datasets used for model training and documentation.

- `final_training_data.csv`: Dataset used for fire-risk / path-risk model training experiments.
- `smoke_detection_iot.csv`: IoT smoke-detection dataset used for smoke/fire classification experiments.

These files are not required for the Flask app runtime unless you retrain the models. The deployed app loads the trained `.pkl` model files directly.
