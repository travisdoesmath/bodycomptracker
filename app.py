from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_heroku import Heroku
from flask_cors import CORS
from stats_functions import lowess_k
from sklearn.linear_model import LinearRegression
import iso8601
import numpy as np
import pandas as pd

app = Flask(__name__)
CORS(app)
heroku = Heroku(app)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
ma = Marshmallow(app)

class RawMeasurement(db.Model):
    __tablename__ = "raw_measurements"
    id = db.Column(db.Integer, primary_key=True)
    weight_lb = db.Column(db.Float)
    weight_kg = db.Column(db.Float)
    lean_mass_lb = db.Column(db.Float)
    lean_mass_kg = db.Column(db.Float)
    fat_percent = db.Column(db.Float)
    fat_mass_lb = db.Column(db.Float)
    fat_mass_kg = db.Column(db.Float)
    measured_at = db.Column(db.DateTime)

class RawMeasurementSchema(ma.Schema):
    class Meta:
        fields = ('weight_lb', 
            'weight_kg',
            'lean_mass_lb',
            'lean_mass_kg',
            'fat_percent',
            'fat_mass_lb',
            'fat_mass_kg',
            'measured_at'
            )

raw_measurements_schema = RawMeasurementSchema(many=True)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/add', methods=['GET'])
def add_measurement():
    weight_lb = request.args.get('weight_lb')
    weight_kg = request.args.get('weight_kg')
    lean_mass_lb = request.args.get('lean_mass_lb')
    lean_mass_kg = request.args.get('lean_mass_kg')
    fat_mass_lb = request.args.get('fat_mass_lb')
    fat_mass_kg = request.args.get('fat_mass_kg')
    fat_percent = request.args.get('fat_percent')
    measured_at = request.args.get('measured_at')
    # try:
    raw_measurement=RawMeasurement(
        weight_lb=weight_lb,
        weight_kg=weight_kg,
        lean_mass_kg=lean_mass_kg,
        lean_mass_lb=lean_mass_lb,
        fat_mass_kg=fat_mass_kg,
        fat_mass_lb=fat_mass_lb,
        fat_percent=fat_percent,
        measured_at=measured_at
    )
    db.session.add(raw_measurement)
    db.session.commit()
    return "measurement added"
    # except Exception as e:
    #     return(str(e))

@app.route('/raw_measurements')
def get_raw_measurements():
    raw_measurements = RawMeasurement.query.all()
    result = raw_measurements_schema.dump(raw_measurements)
    return jsonify(result.data)

@app.route('/smooth_measurements')
def get_smooth_measurements():
    k_weight = 10
    k_bfp = 50
    raw_measurements = RawMeasurement.query.all()
    result = raw_measurements_schema.dump(raw_measurements)
    result.data.sort(key=lambda x: x['measured_at'])
    df = pd.DataFrame(result.data)
    df['measured_at'] = pd.to_datetime(df['measured_at'])
    df = df.groupby(df['measured_at'].dt.date).mean().reset_index()
    df = df.merge(df.rolling(2*k_weight+1, center=True).mean()['weight_lb'], left_index=True, right_index=True, suffixes=['','_ma'])
    df = df.merge(df.rolling(2*k_bfp+1, center=True).mean()['fat_percent'], left_index=True, right_index=True, suffixes=['','_ma'])
    df['smooth_weight_lb'] = df['weight_lb_ma'].iloc[:2*k_weight]
    df['smooth_fat_percent'] = df['fat_percent_ma'].iloc[:2*k_bfp]
    reg = LinearRegression()
    for i in range(2*k_weight, len(df)):
        today = df.iloc[i]['measured_at']
        X = (today - df.iloc[i-k_weight:i+1]['measured_at']).dt.total_seconds().values.reshape(-1, 1)
        y = df.iloc[i-k_weight:i+1]['smooth_weight_lb']
        reg.fit(X, y)
        df.at[i, 'smooth_weight_lb'] = 0.7 * reg.intercept_ + 0.3 * df.at[i, 'weight_lb']

    for i in range(2*k_bfp, len(df)):
        today = df.iloc[i]['measured_at']
        X = (today - df.iloc[i-k_bfp:i+1]['measured_at']).dt.total_seconds().values.reshape(-1, 1)
        y = df.iloc[i-k_bfp:i+1]['smooth_fat_percent']
        reg.fit(X, y)
        df.at[i, 'smooth_fat_percent'] = 0.95 * reg.intercept_ + 0.05 * df.at[i,'fat_percent']
        
    df['smooth_lean_mass_lb'] = df['smooth_weight_lb'] * (1 - df['smooth_fat_percent']/100)
    
    return df.to_json(orient='records')

if __name__ == '__main__':
    app.run(debug=True)
    