from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = 'mssql+pyodbc://sa:123456@EPPA-SERVER/EPPA?driver=ODBC+Driver+17+for+SQL+Server'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# User model
class UsersEPPA(db.Model):
    __tablename__ = 'UsersEPPA'
    UserId = db.Column(db.Integer, primary_key=True)
    fullName = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), nullable=False)
    password = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(50), nullable=False)

# ApplicationRequests model
class ApplicationRequests(db.Model):
    __tablename__ = 'ApplicationRequests'
    RequestId = db.Column(db.Integer, primary_key=True)
    Title = db.Column(db.String(MAX), nullable=False)
    Purpose = db.Column(db.String(MAX), nullable=False)
    ExpectedBenefits = db.Column(db.String(MAX), nullable=False)
    Status = db.Column(db.String(50), default='Pending')
    RequesterId = db.Column(db.Integer, db.ForeignKey('UsersEPPA.UserId'), nullable=False)
    ReceiverId = db.Column(db.Integer, db.ForeignKey('UsersEPPA.UserId'), nullable=False)
    CreatedAt = db.Column(db.Date, default=datetime.now)
    ReceivedDate = db.Column(db.Date, default=datetime.now)
    PIC = db.Column(db.Integer, nullable=True)
    ClosedAt = db.Column(db.Date, nullable=True)

    requester = db.relationship('UsersEPPA', foreign_keys=[RequesterId])
    receiver = db.relationship('UsersEPPA', foreign_keys=[ReceiverId])

# Login endpoint
@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')

    user = UsersEPPA.query.filter_by(email=email, password=password).first()
    if user:
        return jsonify({
            'UserId': user.UserId,
            'fullName': user.fullName,
            'email': user.email,
            'role': user.role
        })
    return jsonify({'error': 'Invalid credentials'}), 401

# Get all users endpoint
@app.route('/api/users', methods=['GET'])
def get_users():
    users = UsersEPPA.query.all()
    return jsonify([{
        'UserId': user.UserId,
        'fullName': user.fullName,
        'email': user.email,
        'role': user.role
    } for user in users])

# Create request endpoint
@app.route('/api/requests', methods=['POST'])
def create_request():
    data = request.get_json()
    
    # Convert string dates to datetime objects
    created_at = datetime.strptime(data.get('createdAt', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d')
    received_date = datetime.strptime(data.get('receivedDate', datetime.now().strftime('%Y-%m-%d')), '%Y-%m-%d')
    
    new_request = ApplicationRequests(
        Title=data['title'],
        Purpose=data['purpose'],
        ExpectedBenefits=data['expectedBenefits'],
        RequesterId=data['requesterId'],
        ReceiverId=data['receiverId'],
        CreatedAt=created_at,
        ReceivedDate=received_date,
        Status='Pending'
    )
    
    try:
        db.session.add(new_request)
        db.session.commit()
        return jsonify({'message': 'Request created successfully', 'requestId': new_request.RequestId})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True) 