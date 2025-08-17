# Nashath Booking Mobile App

A React Native mobile application for speed boat ticketing in the Maldives, built with Expo and TypeScript.

## 🚀 Features

- **User Authentication**: SMS-based login with token verification
- **User Registration**: Support for different user roles (Public, Agent, Boat Owner)
- **Boat Management**: For boat owners to manage their fleet
- **Schedule Management**: View and manage trip schedules
- **Ticket Booking**: Book tickets for available schedules
- **Role-based Access**: Different features based on user role
- **Modern UI/UX**: Clean, mobile-first design

## 📱 Application Flow

### 1. Authentication Flow
```
Login Screen → SMS Verification → Main App
     ↓
Register Screen → Account Creation → Login
```

### 2. Main Navigation Structure
```
MainTabs (Bottom Tab Navigator)
├── Home (Search & Browse)
├── Schedules (View Available Schedules)
└── Profile (User Profile & Settings)

Stack Navigator (Modal Screens)
├── Dashboard (Owner Dashboard)
├── MyBoats (Boat Management)
├── BookTickets (Ticket Booking)
├── AddBoat (Add New Boat)
├── EditBoat (Edit Boat Details)
├── ViewBoat (View Boat Details)
├── Settings (App Settings)
└── MyBookings (Booking History)
```

### 3. User Role Features

#### Public User
- Search for boat schedules
- Book tickets
- View booking history
- Manage profile

#### Agent User
- All public user features
- Book tickets on credit
- Manage client bookings

#### Boat Owner
- All agent user features
- Manage boat fleet
- Create/edit schedules
- View booking analytics
- Configure ticket types

## 🏗️ Project Structure

```
src/
├── contexts/
│   └── AuthContext.tsx          # Authentication state management
├── navigation/
│   └── AppNavigator.tsx         # Main navigation structure
├── screens/
│   ├── LoginScreen.tsx          # User login
│   ├── RegisterScreen.tsx       # User registration
│   ├── HomeScreen.tsx           # Main search interface
│   ├── DashboardScreen.tsx      # Owner dashboard
│   ├── MyBoatsScreen.tsx        # Boat management
│   ├── BookTicketsScreen.tsx    # Ticket booking
│   ├── SchedulesScreen.tsx      # Schedule listing
│   └── ProfileScreen.tsx        # User profile
├── services/
│   ├── apiService.ts            # Backend API integration
│   └── userService.ts           # User session management
└── types/                       # TypeScript type definitions
```

## 🔧 Setup & Installation

### Prerequisites
- Node.js (v16 or higher)
- Expo CLI
- iOS Simulator or Android Emulator

### Installation Steps

1. **Install dependencies**
   ```bash
   cd mobile_app
   npm install
   ```

2. **Install additional packages** (if needed)
   ```bash
   npm install @react-native-picker/picker @react-native-community/datetimepicker
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Run on device/simulator**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   ```

## 🌐 Backend Integration

The app connects to the Nashath Booking backend API. Key endpoints:

- **Authentication**: `/login`, `/verify_token`, `/register`
- **Schedules**: `/schedules/list`, `/schedules/{id}`
- **Boats**: `/boats/`, `/boats/{id}`
- **Bookings**: `/api/bookings`
- **User Profile**: `/api/auth/profile`

## 📱 Screen Details

### LoginScreen
- Phone number input
- SMS token verification
- Navigation to registration

### RegisterScreen
- User information form
- Role selection (Public/Agent/Owner)
- Account creation

### HomeScreen
- Search interface for boat schedules
- Popular routes display
- Available boats showcase
- Feature highlights

### DashboardScreen
- User profile overview
- Role-specific statistics
- Quick action buttons
- Recent activity

### MyBoatsScreen
- Boat fleet listing
- Boat status management
- Add/edit/delete boats
- Boat statistics

### BookTicketsScreen
- Schedule information
- Ticket type selection
- Passenger details
- Booking confirmation

### SchedulesScreen
- Available schedules list
- Search results display
- Schedule details
- Navigation to booking

### ProfileScreen
- User information
- Role display
- Quick actions
- App settings

## 🎨 Design System

### Colors
- **Primary**: #007AFF (iOS Blue)
- **Success**: #10B981 (Green)
- **Warning**: #F59E0B (Amber)
- **Error**: #EF4444 (Red)
- **Background**: #F8F9FA (Light Gray)
- **Surface**: #FFFFFF (White)
- **Text Primary**: #111827 (Dark Gray)
- **Text Secondary**: #6B7280 (Medium Gray)

### Typography
- **Headers**: 20-24px, Bold (700)
- **Section Titles**: 18px, Bold (700)
- **Body Text**: 14-16px, Regular (400-600)
- **Captions**: 12-13px, Regular (400)

### Components
- **Cards**: Rounded corners (12px), subtle shadows
- **Buttons**: Rounded corners (8px), consistent padding
- **Inputs**: Bordered style, focus states
- **Icons**: FontAwesome5, consistent sizing

## 🔐 Security Features

- SMS-based authentication
- Secure token storage
- Role-based access control
- API request authentication
- Session management

## 📱 Platform Support

- **iOS**: 13.0+
- **Android**: API level 21+
- **Web**: Modern browsers (Chrome, Safari, Firefox)

## 🚀 Performance Optimizations

- Lazy loading of screens
- Efficient list rendering with FlatList
- Optimized image loading
- Minimal re-renders with proper state management

## 🧪 Testing

The app includes:
- TypeScript for type safety
- Error boundaries for crash prevention
- Loading states for better UX
- Input validation
- Error handling

## 📄 License

This project is part of the Nashath Booking system.

## 🤝 Contributing

1. Follow the existing code style
2. Add proper TypeScript types
3. Include error handling
4. Test on both iOS and Android
5. Update documentation as needed

## 📞 Support

For technical support or questions, please contact the development team.
