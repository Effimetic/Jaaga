# 🚢 Boat Ticketing Platform

A comprehensive React Native mobile application for boat ticketing in the Maldives, built with Expo and Supabase. This platform supports multiple user roles including passengers, agents, boat owners, and platform administrators.

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Database Setup](#-database-setup)
- [Environment Configuration](#-environment-configuration)
- [User Roles & Permissions](#-user-roles--permissions)
- [Core Functionality](#-core-functionality)
- [Payment Integration](#-payment-integration)
- [API Documentation](#-api-documentation)
- [Development Guidelines](#-development-guidelines)
- [Deployment](#-deployment)
- [Contributing](#-contributing)

## 🌟 Features

### For Passengers (PUBLIC)
- 📱 SMS-only authentication
- 🔍 Search ferry trips by route and date
- 🎫 Book tickets with seat selection or capacity mode
- 💳 Multiple payment methods (Cash, Card, Bank Transfer)
- 📲 Receive tickets via SMS with QR codes
- 📚 View booking history and upcoming trips
- 🧾 Access receipts and invoices

### For Agents
- 🤝 Request connections to boat owners
- 💰 Book tickets on credit within approved limits
- 🎟️ Issue tickets for customers
- 💼 Manage customer bookings
- 📊 View account books and settlement history
- 💵 Upload settlement receipts
- ⚠️ Receive credit limit warnings

### For Boat Owners
- ✅ Approve/reject agent connections
- 🚤 Manage boat fleet (seatmap or capacity mode)
- 📅 Create and manage schedules
- 🎫 Configure ticket types and pricing
- 🏦 Set up payment methods and bank accounts
- 💳 Process payments and settlements
- 📈 View sales analytics and reports
- 🧾 Handle agent account books

### For Platform Administrators (APP_OWNER)
- 💰 Collect fixed fees per ticket
- 🏢 Monitor all owner activities
- 📊 Generate platform-wide reports
- ⚖️ Enforce compliance and policies
- 🔒 Manage global settings

## 🏗️ Architecture

### Tech Stack
- **Frontend**: React Native with Expo
- **Backend**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth with SMS
- **UI Framework**: React Native Paper
- **Navigation**: React Navigation v6
- **State Management**: Zustand
- **Payment**: BML Gateway integration
- **SMS**: Expo SMS / Third-party provider
- **File Storage**: Supabase Storage
- **OCR**: Third-party service for transfer slip processing

### Database Design
```
Users → Agents/Owners → Connections → Boats → Schedules → Bookings → Tickets
                    ↓
          Payment Configs → Bank Accounts → Receipts → OCR Processing
                    ↓
          Ledger Entries → Fee Tracking → Settlement Management
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Git
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd boat-ticketing-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp env.example .env.local
   ```
   Edit `.env.local` with your Supabase and other service credentials.

4. **Set up the database**
   - Create a new Supabase project
   - Run the schema from `supabase-schema.sql`
   - Configure RLS policies
   - Set up authentication

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run on device/simulator**
   ```bash
   # iOS
   npm run ios
   
   # Android
   npm run android
   
   # Web
   npm run web
   ```

## 🗄️ Database Setup

### 1. Create Supabase Project
1. Go to [supabase.com](https://supabase.com)
2. Create a new project
3. Note down your project URL and anon key

### 2. Run Database Schema
Execute the SQL in `supabase-schema.sql` in your Supabase SQL editor:

```sql
-- This will create all tables, indexes, triggers, and RLS policies
-- See supabase-schema.sql for the complete schema
```

### 3. Configure Authentication
1. Enable Phone authentication in Supabase Auth settings
2. Configure your SMS provider (Twilio recommended)
3. Set up custom SMS templates

### 4. Set up Storage
1. Create buckets for:
   - `boat-images`
   - `logos` 
   - `payment-receipts`
   - `transfer-slips`

## ⚙️ Environment Configuration

Create a `.env.local` file with the following variables:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# App Configuration
EXPO_PUBLIC_APP_ENV=development
EXPO_PUBLIC_APP_NAME=Boat Ticketing Platform

# Payment Gateway
EXPO_PUBLIC_BML_MERCHANT_ID=your-merchant-id
EXPO_PUBLIC_BML_API_KEY=your-api-key
EXPO_PUBLIC_BML_ENVIRONMENT=sandbox

# Default Settings
EXPO_PUBLIC_DEFAULT_CURRENCY=MVR
EXPO_PUBLIC_DEFAULT_APP_FEE_PER_TICKET=10.00
```

## 👥 User Roles & Permissions

### Public (Customers)
- Search and book tickets
- View personal bookings/tickets
- Make payments
- Receive SMS notifications

### Agent
- Book tickets on credit
- Issue tickets for customers
- Manage customer relationships  
- Settlement management
- Restricted by owner-defined permissions

### Owner
- Full boat/schedule management
- Agent relationship management
- Payment configuration
- Financial reporting
- Revenue collection

### App Owner
- Platform administration
- Fee collection
- System-wide monitoring
- Compliance oversight

## 🎯 Core Functionality

### Booking Flow
1. **Search**: Date, route, passenger count
2. **Selection**: Choose schedule and ticket type
3. **Seats**: Select specific seats (SEATMAP) or quantity (CAPACITY)
4. **Details**: Enter passenger information
5. **Payment**: Choose payment method and complete
6. **Confirmation**: Receive booking confirmation
7. **Tickets**: Get individual tickets via SMS

### Seat Management
- **SEATMAP Mode**: Visual seat selection with JSON layout
- **CAPACITY Mode**: Simple quantity selection
- **Inventory**: Real-time availability tracking
- **Hold System**: 15-minute reservation holds

### Payment Methods

#### Cash
- Walk-in payments at counters
- Instant confirmation
- Manual receipt entry

#### Card (BML Gateway)
- Real-time processing
- 3D Secure support
- Automatic confirmation
- Webhook integration

#### Bank Transfer
- Upload transfer slip
- OCR processing for verification
- Owner approval required
- Settlement tracking

## 💳 Payment Integration

### BML Gateway Integration
```typescript
// Payment processing flow
const processPayment = async (bookingData) => {
  const transaction = await bmlGateway.initiate({
    amount: bookingData.total,
    currency: bookingData.currency,
    merchantId: config.bmlMerchantId,
    bookingId: bookingData.id
  });
  
  // Handle 3D Secure redirect
  if (transaction.requires3DSecure) {
    // Redirect to 3DS page
  }
  
  // Process webhook response
  await handleBMLWebhook(transaction);
};
```

### Transfer Slip OCR
```typescript
// OCR processing for bank transfers
const processTransferSlip = async (imageFile) => {
  const ocrResult = await ocrService.extractData(imageFile);
  
  const validation = {
    amountMatch: ocrResult.amount === booking.total,
    currencyMatch: ocrResult.currency === booking.currency,
    accountMatch: verifyBankAccount(ocrResult.accountNumber),
    dateValid: isRecentTransfer(ocrResult.date)
  };
  
  return { ocrResult, validation };
};
```

## 📡 API Documentation

### Authentication
```typescript
// SMS login
POST /auth/sms
{
  "phone": "+9607777777"
}

// Verify OTP
POST /auth/verify
{
  "phone": "+9607777777",
  "token": "123456"
}
```

### Search & Booking
```typescript
// Search trips
GET /api/search?from=Male&to=Hulhumale&date=2024-08-25&passengers=2

// Create booking
POST /api/bookings
{
  "scheduleId": "uuid",
  "segmentKey": "male-hulhumale",
  "passengers": [...],
  "seats": ["A1", "A2"],
  "paymentMethod": "CARD_BML"
}
```

### Agent Operations
```typescript
// Request connection
POST /api/agent/connections
{
  "ownerId": "uuid"
}

// Book on credit
POST /api/agent/bookings
{
  "scheduleId": "uuid",
  "passengers": [...],
  "payOnCredit": true,
  "connectionId": "uuid"
}
```

## 🛠️ Development Guidelines

### Code Structure
```
src/
├── components/       # Reusable UI components
├── contexts/         # React contexts (Auth, Theme, etc.)
├── hooks/           # Custom hooks
├── navigation/      # Navigation structure
├── screens/         # Screen components
├── services/        # API and external services
├── types/           # TypeScript definitions
├── utils/           # Utility functions
└── theme/           # Theme configuration
```

### Naming Conventions
- **Components**: PascalCase (`BoatCard.tsx`)
- **Screens**: PascalCase with Screen suffix (`HomeScreen.tsx`)
- **Services**: camelCase (`apiService.ts`)
- **Types**: PascalCase (`BookingRequest`)
- **Constants**: SCREAMING_SNAKE_CASE (`DEFAULT_CURRENCY`)

### State Management
```typescript
// Use Zustand for global state
const useBookingStore = create<BookingState>((set, get) => ({
  currentBooking: null,
  setBooking: (booking) => set({ currentBooking: booking }),
  clearBooking: () => set({ currentBooking: null }),
}));
```

### Error Handling
```typescript
// Consistent error handling
const handleApiError = (error: any): AppError => {
  return {
    code: error.code || 'UNKNOWN_ERROR',
    message: error.message || 'An unexpected error occurred',
    details: error.details,
    timestamp: Date.now(),
  };
};
```

## 🚀 Deployment

### Mobile App Deployment

#### Build for Production
```bash
# Create production build
eas build --platform all

# Submit to app stores
eas submit --platform ios
eas submit --platform android
```

#### Environment Setup
```bash
# Set environment for build
eas build --platform all --profile production
```

### Database Deployment

#### Production Setup
1. Create production Supabase project
2. Run migrations
3. Set up backup schedules
4. Configure monitoring

#### Security Configuration
- Enable RLS on all tables
- Set up proper CORS policies
- Configure API rate limiting
- Enable audit logging

## 🤝 Contributing

### Development Process
1. Fork the repository
2. Create a feature branch
3. Make changes with tests
4. Update documentation
5. Submit pull request

### Code Quality
- TypeScript strict mode
- ESLint configuration
- Prettier formatting
- Unit tests with Jest
- E2E tests with Detox

### Pull Request Guidelines
- Clear description of changes
- Link to relevant issues
- Include tests
- Update documentation
- Follow commit conventions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.


## 📊 Project Status

Current Status: **🏗️ In Development**

### Completed ✅
- Project setup and architecture
- Database schema design
- Authentication system
- Core navigation structure
- Basic UI components
- TypeScript types and interfaces
- SMS integration setup

### In Progress 🚧
- Booking flow implementation
- Payment gateway integration
- Agent portal features
- Owner dashboard
- SMS notifications
- QR code generation

### Planned 📋
- Advanced reporting
- Mobile app optimization
- Performance monitoring
- Automated testing
- CI/CD pipeline
- App store deployment

---

**Built with ❤️ for the Maldives ferry system**