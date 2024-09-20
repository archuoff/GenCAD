from flask import Flask, request, jsonify, send_file, session, redirect, url_for, render_template
from flask_cors import CORS
import pandas as pd
import numpy as np
import joblib
from tensorflow.keras.models import load_model
from OCC.Core.STEPControl import STEPControl_Writer, STEPControl_AsIs
from OCC.Core.BRepPrimAPI import BRepPrimAPI_MakeCylinder
import sqlite3

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Ensure this is secure

# Initialize CORS
CORS(app, resources={r"/*": {"origins": "*"}})

# Load scalers and model
input_scaler = joblib.load('models/input_scaler.pkl')
output_scaler = joblib.load('models/output_scaler.pkl')
label_encoder = joblib.load('models/label_encoder.pkl')
model = load_model('models/shaft_model.keras')

# SQLite connection function
def get_db_connection():
    conn = sqlite3.connect('db.sqlite')
    conn.row_factory = sqlite3.Row
    return conn

# Routes
@app.route('/')
def home():
    if 'username' in session:
        return render_template('home.html')
    return render_template('login.html')

@app.route('/login', methods=['POST'])
def login():
    username = request.form['username']
    password = request.form['password']

    conn = get_db_connection()
    user = conn.execute('SELECT * FROM users WHERE username = ? AND password = ?', (username, password)).fetchone()
    conn.close()

    if user:
        session['username'] = username
        return jsonify({'success': True, 'message': 'Login successful'})
    return jsonify({'success': False, 'message': 'Invalid username or password'})

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('home'))

@app.route('/recommend', methods=['POST'])
def recommend():
    if 'username' not in session:
        return redirect(url_for('home'))

    # Ensure the content type is application/json
    if request.content_type != 'application/json':
        return jsonify({'error': 'Content-Type must be application/json'}), 415

    # Get features from the request
    features = request.json.get('features')
    
    if not features:
        return jsonify({'error': 'No features provided'}), 400
    
    # Prepare the feature set for prediction
    data = {
        'diameter': [features.get('diameter')],
        'length': [features.get('length')],
        'FOS': [features.get('FOS')],
        'material': [label_encoder.transform([features.get('material')])[0]],
        'bending_moment_left': [features.get('bending_moment_left')],
        'bending_moment_right': [features.get('bending_moment_right')],
        'torque': [features.get('torque')],
        'fatigue_life': [features.get('fatigue_life')],
        'stress_max': [features.get('stress_max')],
        'stress_min': [features.get('stress_min')],
        'strain_max': [features.get('strain_max')],
        'strain_min': [features.get('strain_min')],
        'deformation_max': [features.get('deformation_max')],
        'deformation_min': [features.get('deformation_min')]
    }

    df = pd.DataFrame(data)

    # Preprocess input
    X_scaled = input_scaler.transform(df)

    # Predict
    y_pred_scaled = model.predict(X_scaled)
    y_pred = output_scaler.inverse_transform(y_pred_scaled)

    # Extract the predicted diameter and length
    predicted_diameter_m = y_pred[0][0]
    predicted_length_m = y_pred[0][1]

    # Create the 3D shaft model
    def create_shaft(diameter_m, length_m):
        diameter_mm = diameter_m * 1000
        length_mm = length_m * 1000
        cylinder = BRepPrimAPI_MakeCylinder(diameter_mm / 2, length_mm).Shape()
        return cylinder

    shaft_shape = create_shaft(predicted_diameter_m, predicted_length_m)

    # Save to STEP file
    step_file_path = 'shaft_model.step'
    step_writer = STEPControl_Writer()
    step_writer.Transfer(shaft_shape, STEPControl_AsIs)
    step_writer.Write(step_file_path)

    # Send the STEP file as a response
    return send_file(step_file_path, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)