from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_heroku import Heroku
from flask_cors import CORS
from stats_functions import lowess_k
import iso8601
import numpy as np
import pandas as pd

app = Flask(__name__)
CORS(app)
heroku = Heroku(app)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)
ma = Marshmallow(app)

class Measurement(db.Model):
    __tablename__ = "measurements"
    id = db.Column(db.Integer, primary_key=True)
    weight_lb = db.Column(db.Float)
    weight_kg = db.Column(db.Float)
    lean_mass_lb = db.Column(db.Float)
    lean_mass_kg = db.Column(db.Float)
    fat_percent = db.Column(db.Float)
    fat_mass_lb = db.Column(db.Float)
    fat_mass_kg = db.Column(db.Float)
    measured_at = db.Column(db.DateTime)

class MeasurementSchema(ma.Schema):
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

measurements_schema = MeasurementSchema(many=True)

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
    measurement=Measurement(
        weight_lb=weight_lb,
        weight_kg=weight_kg,
        lean_mass_kg=lean_mass_kg,
        lean_mass_lb=lean_mass_lb,
        fat_mass_kg=fat_mass_kg,
        fat_mass_lb=fat_mass_lb,
        fat_percent=fat_percent,
        measured_at=measured_at
    )
    db.session.add(measurement)
    db.session.commit()
    return "measurement added"
    # except Exception as e:
    #     return(str(e))

@app.route('/measurements')
def get_measurements():
    measurements = Measurement.query.all()
    result = measurements_schema.dump(measurements)
    return jsonify(result.data)

@app.route('/smooth_measurements')
def get_smooth_measurements():
    k = 5
    measurements = Measurement.query.all()
    result = measurements_schema.dump(measurements)
    result.data.sort(key=lambda x: x['measured_at'])
    df = pd.DataFrame(result)   
    df = df.groupby(df['measured_at'].dt.round('1d')).mean().reset_index()
    df = df.merge(df.rolling(2*k+1, center=True).mean(), left_index=True, right_index=True, suffixes=['','_ma'])
    df['smooth_weight_lb'] = df['weight_lb_ma'].iloc[:10]
    df['smooth_lean_mass_lb'] = df['lean_mass_lb'].iloc[:10]
    df['smooth_fat_percent'] = df['fat_percent'].iloc[:10]
    reg = LinearRegression()
    for i in range(2*k, len(df)):
        X = df.iloc[i-k:i]['measured_at'] - df.iloc[i]['measured_at']

        y = df.iloc[i-k:i]['smooth_weight_lb']
        reg.fit(X.values.reshape(-1,1), y)
        df['smooth_weight_lb'].iloc[i] = 0.7 * reg.intercept_ + 0.3 * df['weight_lb'].iloc[i]

        y = df.iloc[i-k:i]['smooth_lean_mass_lb']
        reg.fit(X.values.reshape(-1,1), y)
        df['smooth_lean_mass_lb'].iloc[i] = 0.7 * reg.intercept_ + 0.3 * df['lean_mass_lb'].iloc[i]

        y = df.iloc[i-k:i]['smooth_fat_percent']
        reg.fit(X.values.reshape(-1,1), y)
        df['smooth_fat_percent'].iloc[i] = 0.7 * reg.intercept_ + 0.3 * df['fat_percent'].iloc[i]

    for i in range(len(result.data)):
        result.data[i]['smooth_weight_lb'] = df.iloc[i]['smooth_weight_lb']
        result.data[i]['smooth_lean_mass_lb'] = df.iloc[i]['smooth_lean_mass_lb']
        result.data[i]['smooth_fat_percent'] = df.iloc[i]['smooth_fat_percent']
    return jsonify(result.data)

if __name__ == '__main__':
    app.run(debug=True)
    