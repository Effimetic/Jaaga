# 🚀 Deployment Guide

This document provides step-by-step instructions for deploying the Boat Ticketing Platform to production.

## 📋 Pre-Deployment Checklist

### 1. Environment Setup
- [ ] Production Supabase project created
- [ ] Database schema deployed
- [ ] RLS policies configured
- [ ] Authentication providers set up
- [ ] SMS provider configured
- [ ] Payment gateway credentials obtained
- [ ] File storage buckets created
- [ ] Environment variables configured

### 2. Code Preparation
- [ ] All features tested in staging
- [ ] Performance optimizations applied
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Version bumped in package.json
- [ ] Build configurations set

## 🗄️ Database Deployment

### 1. Supabase Production Setup

#### Create Production Project
```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase
supabase login

# Create new project (or use dashboard)
supabase projects create boat-ticketing-prod
```

#### Deploy Schema
```bash
# Run the database schema
psql -h your-host -U postgres -d your-db -f supabase-schema.sql
```

#### Configure Authentication
1. **Enable Phone Authentication**
   - Go to Authentication > Settings
   - Enable Phone authentication
   - Configure SMS provider (Twilio recommended)

2. **Set Custom SMS Templates**
   ```
   Verification Code: Your verification code is {{ .Code }}
   
   Magic Link: Sign in to Boat Ticketing: {{ .ConfirmationURL }}
   ```

3. **Configure Rate Limiting**
   - Set SMS rate limits (e.g., 5 per hour per phone)
   - Configure session timeouts

#### Set Up Storage
```bash
# Create storage buckets
supabase storage create boat-images --public
supabase storage create logos --public  
supabase storage create payment-receipts --private
supabase storage create transfer-slips --private
```

#### RLS Policies
```sql
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
-- ... (see supabase-schema.sql for complete policies)

-- Create policies for production
CREATE POLICY "Users can view own data" ON users 
FOR SELECT USING (auth.uid() = id);
```

### 2. Database Performance

#### Indexes
```sql
-- Critical indexes for performance
CREATE INDEX CONCURRENTLY idx_bookings_schedule_date 
ON bookings(schedule_id, created_at);

CREATE INDEX CONCURRENTLY idx_tickets_booking_status 
ON tickets(booking_id, status);

-- Composite indexes for search
CREATE INDEX CONCURRENTLY idx_schedules_search 
ON schedules(start_at, status) WHERE status = 'ACTIVE';
```

#### Connection Pooling
```typescript
// Configure connection pooling
const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    headers: {
      'x-my-custom-header': 'boat-ticketing',
    },
  },
});
```

## 📱 Mobile App Deployment

### 1. Expo Application Services (EAS) Setup

#### Install EAS CLI
```bash
npm install -g eas-cli
eas login
```

#### Configure EAS
```bash
# Initialize EAS in your project
eas build:configure
```

#### EAS Configuration (eas.json)
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_SUPABASE_URL": "https://your-prod-project.supabase.co",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "your-prod-anon-key"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

### 2. Build Process

#### Production Build
```bash
# Build for both platforms
eas build --platform all --profile production

# Build specific platform
eas build --platform ios --profile production
eas build --platform android --profile production
```

#### Environment Variables
```bash
# Set production environment variables
eas secret:create --scope project --name SUPABASE_SERVICE_ROLE_KEY --value your-service-role-key
eas secret:create --scope project --name BML_API_KEY --value your-bml-key
```

### 3. App Store Submission

#### iOS App Store
```bash
# Submit to App Store
eas submit --platform ios

# Or manual submission
# Download .ipa from EAS dashboard
# Upload to App Store Connect via Xcode or Transporter
```

#### Google Play Store
```bash
# Submit to Google Play
eas submit --platform android

# Or manual submission  
# Download .aab from EAS dashboard
# Upload to Google Play Console
```

### 4. App Store Metadata

#### iOS App Store Connect
- App Name: Boat Ticketing Maldives
- Description: Ferry ticket booking platform for Maldives
- Keywords: ferry, boat, tickets, maldives, booking
- Category: Travel
- Age Rating: 4+ (suitable for all ages)
- Screenshots: 6.5", 5.5", iPad Pro required

#### Google Play Console
- Short Description: Book ferry tickets across Maldives
- Full Description: Comprehensive ferry booking system...
- App Category: Travel & Local
- Content Rating: Everyone
- Target Audience: 13+
- Screenshots: Phone and tablet required

## 🌐 Web Deployment (Optional)

### 1. Expo Web Build
```bash
# Build for web
npx expo export:web

# Deploy to Vercel/Netlify
npm run build:web
```

### 2. Static Hosting
```bash
# Deploy to Netlify
netlify deploy --prod --dir dist

# Deploy to Vercel
vercel --prod
```

## 🔧 Infrastructure Setup

### 1. Monitoring & Analytics

#### Supabase Monitoring
- Enable database monitoring
- Set up alerting for critical metrics
- Configure log retention

#### Mobile App Analytics
```typescript
// Add analytics tracking
import Analytics from 'appcenter-analytics';

// Track key events
Analytics.trackEvent('booking_completed', {
  amount: booking.total,
  currency: booking.currency,
  route: booking.route,
});
```

### 2. Error Tracking

#### Sentry Setup
```bash
npm install @sentry/react-native
```

```typescript
// Configure Sentry
import * as Sentry from '@sentry/react-native';

Sentry.init({
  dsn: 'your-sentry-dsn',
  environment: __DEV__ ? 'development' : 'production',
});
```

### 3. Push Notifications

#### Expo Push Notifications
```typescript
// Set up push notifications
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});
```

## 🔒 Security Configuration

### 1. API Security
- Configure CORS policies
- Set up API rate limiting
- Enable request/response logging
- Implement API key rotation

### 2. Data Protection
```sql
-- Encrypt sensitive data
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Example: Encrypt payment data
UPDATE payment_configs 
SET bml_keys_masked = pgp_sym_encrypt(
  bml_keys_masked::text, 
  'your-encryption-key'
);
```

### 3. Authentication Security
- Configure session timeouts
- Enable multi-factor authentication
- Set up IP whitelisting for admin
- Implement device tracking

## 📊 Performance Optimization

### 1. Database Optimization
```sql
-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM bookings 
WHERE schedule_id = 'uuid' AND status = 'CONFIRMED';

-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_bookings_performance 
ON bookings(schedule_id, status, created_at);
```

### 2. Mobile App Performance
```typescript
// Optimize bundle size
import { lazy, Suspense } from 'react';

// Lazy load screens
const BookingScreen = lazy(() => import('./screens/BookingScreen'));

// Use memo for expensive components
const ExpensiveComponent = React.memo(({ data }) => {
  return <ComplexVisualization data={data} />;
});
```

### 3. Caching Strategy
```typescript
// Implement caching for API responses
const cacheConfig = {
  searchResults: { ttl: 300 }, // 5 minutes
  userProfile: { ttl: 3600 }, // 1 hour
  schedules: { ttl: 1800 }, // 30 minutes
};
```

## 🚦 Health Checks & Monitoring

### 1. Application Health
```typescript
// Health check endpoint
const healthCheck = {
  status: 'healthy',
  timestamp: new Date().toISOString(),
  services: {
    database: await checkDatabase(),
    sms: await checkSMSService(),
    payment: await checkPaymentGateway(),
  },
};
```

### 2. Alerting Rules
- Database connection failures
- API error rates > 5%
- Payment gateway downtime
- SMS delivery failures
- High response times (>2s)

### 3. Backup Strategy
```bash
# Automated database backups
pg_dump -h host -U user -d database > backup-$(date +%Y%m%d).sql

# Schedule backups
0 2 * * * /path/to/backup-script.sh
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions
```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Build with EAS
        run: eas build --platform all --non-interactive

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Submit to stores
        run: eas submit --platform all --non-interactive
```

### 2. Staging Environment
- Automated deployment to staging
- Integration testing
- Performance testing
- Security scanning

## 📝 Post-Deployment

### 1. Launch Checklist
- [ ] App stores approved and live
- [ ] Database performance validated
- [ ] Payment processing tested
- [ ] SMS notifications working
- [ ] Monitoring alerts configured
- [ ] Backup procedures tested
- [ ] Documentation updated
- [ ] Team training completed

### 2. Go-Live Process
1. **Pre-launch** (T-1 week)
   - Final testing in staging
   - Performance load testing
   - Security audit
   - Backup procedures verified

2. **Launch Day** (T-0)
   - Deploy database changes
   - Release mobile apps
   - Monitor key metrics
   - Support team ready

3. **Post-launch** (T+1 week)
   - Monitor performance
   - Collect user feedback
   - Address any issues
   - Plan next iteration

### 3. Rollback Plan
```bash
# Database rollback
psql -h host -U user -d database < backup-previous.sql

# App rollback
eas build:cancel
# Submit previous version to stores
```

## 📞 Support & Maintenance

### 1. Support Channels
- 24/7 technical support
- User documentation
- FAQ and troubleshooting
- Community forum

### 2. Maintenance Schedule
- **Daily**: Health checks, backup verification
- **Weekly**: Performance review, security updates
- **Monthly**: Feature updates, optimization
- **Quarterly**: Major releases, infrastructure review

### 3. Update Process
- Staged rollouts (10% → 50% → 100%)
- A/B testing for major features
- Gradual migration for database changes
- Automated rollback triggers

---

**🚀 Ready for Production!**

For questions or issues during deployment, contact the development team or refer to the troubleshooting guide.
