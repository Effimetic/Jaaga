# 🚀 Deployment Guide

This folder contains all deployment-related scripts for the Boat Ticketing App.

## 📁 Files

- **`deploy-all.sh`** - Complete deployment script for all Edge Functions
- **`check-status.sh`** - Check deployment status of Edge Functions
- **`README.md`** - This file

## 🚀 Quick Start

### 1. Install Supabase CLI
```bash
npm install -g supabase
```

### 2. Login to Supabase
```bash
supabase login
```

### 3. Deploy Everything
```bash
./deployment/deploy-all.sh
```

### 4. Check Status
```bash
./deployment/check-status.sh
```

## 📱 Current Edge Functions

### `send-sms-otp`
- **Purpose**: Custom SMS verification service
- **Status**: Ready for deployment
- **Location**: `supabase/functions/send-sms-otp/`

## 🔧 What Gets Deployed

1. **SMS Edge Function** - Custom SMS verification service
2. **Function URLs** - Automatically generated and displayed
3. **Status Updates** - Real-time deployment feedback

## 🧪 Testing After Deployment

1. **Start your app**: `npm start`
2. **Navigate to Login**: Enter phone number (e.g., `777-9186`)
3. **Click "Send OTP"**: Should call your Edge Function
4. **Check Console**: See generated verification code
5. **Enter Code**: Any 6-digit number works for testing

## 🚨 Troubleshooting

### Function Not Deployed
```bash
./deployment/check-status.sh
```

### Redeploy Everything
```bash
./deployment/deploy-all.sh
```

### Check Supabase Status
```bash
supabase status
```

## 🔮 Future Enhancements

- **SMS Service Integration**: Connect your SMS provider
- **Code Storage**: Store verification codes in database
- **Rate Limiting**: Add security measures
- **Monitoring**: Add deployment monitoring

## 📞 Support

If you encounter issues:
1. Check the status: `./deployment/check-status.sh`
2. Verify Supabase login: `supabase status`
3. Check function logs in Supabase dashboard
