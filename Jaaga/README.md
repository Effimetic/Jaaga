# Nashath Booking - Speed Boat Ticketing System

A full-featured Speed Boat Ticketing Web App for the Maldives built with Python Flask and MySQL.

## Features

### User Management
- **SMS-based Authentication**: Users login with phone number and receive 6-digit token via SMS
- **Multiple User Roles**: Public Users, Entity/Agent Users, Boat Owners, and Administrators
- **Simple Registration**: Quick signup with role selection

### Core Functionality
- **Boat Management**: Boat owners can configure boats with seating (total count or visual chart)
- **Trip Scheduling**: Create and manage speed boat schedules
- **Ticket Booking**: Search and book available trips
- **Payment Integration**: BML (Bank of Maldives) payment support
- **QR Code Tickets**: Digital tickets with QR codes for validation
- **Multi-Currency**: Support for MVR and USD

### Business Logic
- **Public Users**: Must pay 24 hours before departure or booking is auto-cancelled
- **Agent Users**: Can book on credit without upfront payment
- **Boat Owners**: Manage boats, schedules, and receive payments
- **Admin**: Manage payouts, reimbursements, and platform settings

## Technology Stack

- **Backend**: Python Flask
- **Database**: MySQL (Amazon RDS)
- **Frontend**: HTML, CSS, JavaScript, Bootstrap 5
- **Deployment**: AWS App Runner
- **Authentication**: SMS-based token system
- **Payments**: BML API integration
- **QR Codes**: QR code generation and scanning

## Demo Mode

The application includes a demo mode that allows you to test the functionality without a database connection. In demo mode:

- SMS tokens are simulated (any 6-digit number will work)
- User sessions are stored in memory
- All features work except persistent data storage
- Uses SQLite database for local development

This is perfect for testing the UI and user flows locally.

### Environment Modes

- **Demo Mode** (`DEMO_MODE=true`): Uses SQLite database, perfect for local development
- **Production Mode** (`DEMO_MODE=false`): Uses MySQL database with Amazon RDS

## Setup Instructions

### Local Development

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd nashath.booking
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   Run the setup script to create the `.env` file:
   ```bash
   ./setup.sh
   ```
   
   This will create a `.env` file with the correct configuration. For demo mode (no database required), the script will automatically set `DEMO_MODE=true`.

4. **Run the application**
   ```bash
   python3 app.py
   ```
   
   **Note**: The application will run in demo mode if the database connection fails. This is normal for local development.

5. **Access the application**
   Open your browser and go to `http://localhost:8080`

### AWS App Runner Deployment

1. **Push code to Git repository**
   ```bash
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Deploy to AWS App Runner**
   - Go to AWS App Runner console
   - Create new service
   - Connect your Git repository
   - Use the `apprunner.yaml` configuration
   - Deploy the service

## Database Schema

### Core Tables
- **User**: User accounts with roles and credit balances
- **LoginToken**: SMS tokens for authentication
- **Boat**: Boat information and seating configuration
- **Schedule**: Trip schedules with departure times
- **Booking**: Ticket bookings with payment status
- **Ticket**: QR code tickets for validation
- **Reimbursement**: Refund management

## API Endpoints

### Authentication
- `POST /login` - Send SMS token
- `POST /verify_token` - Verify SMS token and login
- `GET /logout` - Logout user

### User Management
- `GET /register` - Registration page
- `POST /register` - Create new user account
- `GET /dashboard` - User dashboard

## User Roles

### Public User
- Book tickets for personal travel
- Pay with MVR or USD
- Payment required 24 hours before departure
- Receive QR code tickets

### Entity/Agent User
- Book tickets on credit for clients
- No upfront payment required
- Manage client bookings
- Credit-based system

### Boat Owner
- Manage boats and seating configuration
- Create trip schedules
- Hold seats for specific schedules
- Receive payments from platform

### Administrator
- Manage platform payouts
- Handle reimbursements
- Trigger BML API transfers
- View system statistics

## Payment Integration

### BML Integration
- Hosted checkout for public users
- API integration for direct transfers
- Support for MVR and USD currencies
- Automated payout system

### Payment Flow
1. Public user books ticket
2. Payment processed via BML
3. Platform deducts app fee
4. Remaining amount goes to boat owner
5. Admin manages payouts

## Security Features

- SMS-based authentication
- Token expiration (10 minutes)
- Secure password hashing
- Session management
- CSRF protection

## Future Enhancements

- Real-time SMS integration
- Advanced seat selection
- Mobile app development
- Analytics dashboard
- Multi-language support
- Advanced reporting

## Support

For technical support or questions, please contact the development team.

## License

This project is proprietary software for Nashath Booking. 