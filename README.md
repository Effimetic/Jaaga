# Nashath Booking - New Architecture

This project has been restructured with a new architecture:

- **`old_app/`** - Original Flask web application (kept for reference)
- **`backend/`** - New Python Flask API server
- **`mobile_app/`** - New Expo React Native mobile application

## 🚀 Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- Expo CLI
- iOS Simulator or Android Emulator

## 🔧 Backend Setup

### 1. Install Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Environment Configuration
```bash
cp env.example .env
# Edit .env with your configuration
```

### 3. Run Backend Server
```bash
python app.py
```

The backend will run on `http://localhost:5000`

## 📱 Mobile App Setup

### 1. Install Dependencies
```bash
cd mobile_app
npm install
```

### 2. Run Mobile App
```bash
# For iOS
npm run ios

# For Android
npm run android

# For web (development)
npm run web
```

## 🧪 Testing the First Feature: SMS Authentication

### Backend Testing
Test the API endpoints using curl or Postman:

#### 1. Health Check
```bash
curl http://localhost:5000/api/health
```

#### 2. Send SMS
```bash
curl -X POST http://localhost:5000/api/auth/send-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "7910106"}'
```

#### 3. Verify SMS
```bash
curl -X POST http://localhost:5000/api/auth/verify-sms \
  -H "Content-Type: application/json" \
  -d '{"phone": "7910106", "code": "123456"}'
```

#### 4. Get Profile (with JWT)
```bash
curl http://localhost:5000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### Mobile App Testing
1. **Launch the app** - Should show login screen
2. **Enter phone number** - Use any valid format (e.g., 7910106)
3. **Send SMS** - Click "Send SMS Code"
4. **Check console** - Backend will print the verification code
5. **Enter code** - Use the code from backend console
6. **Verify** - Should login and show home screen
7. **Test logout** - Click logout button

## 📋 API Endpoints

### Authentication
- `POST /api/auth/send-sms` - Send verification code
- `POST /api/auth/verify-sms` - Verify code and get JWT
- `GET /api/auth/profile` - Get user profile (requires JWT)
- `POST /api/auth/logout` - Logout user

### Health
- `GET /api/health` - Health check

## 🔐 JWT Authentication

The system uses JWT tokens for authentication:

1. **Login Flow**: Phone → SMS → Code → JWT Token
2. **Token Usage**: Include in Authorization header: `Bearer <token>`
3. **Token Expiry**: 24 hours
4. **Storage**: Mobile app stores tokens in AsyncStorage

## 🚧 Next Steps

After testing SMS authentication successfully:

1. **Copy database models** from `old_app/models/` to `backend/models/`
2. **Implement user management** (create, update, delete users)
3. **Add boat and schedule endpoints**
4. **Implement booking system**
5. **Add payment integration**

## 🐛 Troubleshooting

### Backend Issues
- Check if port 5000 is available
- Verify Python dependencies are installed
- Check console for error messages

### Mobile App Issues
- Ensure backend is running on localhost:5000
- Check Expo CLI is installed globally
- Verify iOS Simulator/Android Emulator is running

### Network Issues
- Backend runs on `localhost:5000`
- Mobile app connects to `http://localhost:5000/api`
- For physical devices, use your computer's IP address

## 📁 Project Structure

```
nashath.booking/
├── old_app/                 # Original Flask web app
│   ├── app.py              # Main Flask app
│   ├── models/             # Database models
│   ├── routes/             # Web routes
│   ├── templates/          # Jinja2 templates
│   └── static/             # Static files
├── backend/                # New Flask API server
│   ├── app.py             # Main API app
│   ├── requirements.txt   # Python dependencies
│   └── env.example        # Environment variables
├── mobile_app/            # Expo React Native app
│   ├── src/
│   │   ├── contexts/      # React contexts
│   │   ├── screens/       # App screens
│   │   └── navigation/    # Navigation setup
│   ├── App.tsx            # Main app component
│   └── package.json       # Node dependencies
└── README.md              # This file
```

## 🤝 Contributing

1. Test each feature thoroughly before moving to the next
2. Keep the old app working for reference
3. Document any new endpoints or features
4. Follow the existing code style and patterns
