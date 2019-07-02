from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_marshmallow import Marshmallow
from flask_heroku import Heroku
from flask_cors import CORS
from stats_functions import lowess_n
import iso8601

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
    # measured_at = [iso8601.parse_date(x['measured_at']).timestamp()/10**15 for x in result.data]
    # weight_lb = [x['weight_lb'] for x in result.data]
    # lean_mass_lb = [x['lean_mass_lb'] for x in result.data]
    # fat_percent = [x['fat_percent'] for x in result.data]
    # smooth_weight_lb = lowess_n(x=measured_at, y=weight_lb, k=45)
    # smooth_lean_mass_lb = lowess_n(x=measured_at, y=lean_mass_lb, k=45)
    # smooth_fat_percent = lowess_n(x=measured_at, y=fat_percent, k=45)
    # for i in range(len(result.data)):
    #     result.data[i]['smooth_weight_lb'] = smooth_weight_lb[i]
    #     result.data[i]['smooth_lean_mass_lb'] = smooth_lean_mass_lb[i]
    #     result.data[i]['smooth_fat_percent'] = smooth_fat_percent[i]
    return jsonify(result.data)

if __name__ == '__main__':
    app.run(debug=True)
    