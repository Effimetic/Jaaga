import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Input } from '../components/catalyst';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { UserService } from '../services/userService';
import { UserRole } from '../types';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp' | 'role-selection'>('phone');
  const [loading, setLoading] = useState(false);
  
  const { signInWithSMS, verifySmSToken, setAuthState } = useAuth();
  const userService = UserService.getInstance();

  const handleSendOTP = async () => {
    console.log('🔍 [DEBUG] handleSendOTP called with phone:', phone);
    
    if (!phone.trim()) {
      console.log('❌ [DEBUG] Phone is empty');
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Clean phone number for validation (remove all non-digits)
    const cleanPhone = phone.replace(/\D/g, '');
    console.log('🔍 [DEBUG] Clean phone number:', cleanPhone);
    
    // Validate phone number format (should be 7 digits starting with 7 or 9)
    const phoneRegex = /^[79]\d{6}$/;
    const isValidPhone = phoneRegex.test(cleanPhone);
    console.log('🔍 [DEBUG] Phone validation result:', isValidPhone);
    
    if (!isValidPhone) {
      console.log('❌ [DEBUG] Invalid phone format. Expected 7 digits starting with 7 or 9');
      Alert.alert('Error', 'Please enter a valid Maldives phone number (7 digits starting with 7 or 9)');
      return;
    }

    console.log('🔍 [DEBUG] About to call signInWithSMS');
    setLoading(true);
    
    try {
      console.log('🔍 [DEBUG] Calling signInWithSMS...');
      const result = await signInWithSMS({ phone });
      console.log('🔍 [DEBUG] signInWithSMS result:', result);
      
      if (result.success) {
        console.log('✅ [DEBUG] SMS sent successfully');
        setStep('otp');
        Alert.alert('Success', 'OTP sent to your phone number');
        console.log('💡 [TESTING] Check the console for SMS verification details');
        console.log('💡 [TESTING] For development testing, you can use any 6-digit code');
      } else {
        console.log('❌ [DEBUG] SMS failed:', result.error);
        Alert.alert('Error', result.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      console.log('❌ [DEBUG] Exception in handleSendOTP:', error);
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
      console.log('🔍 [DEBUG] Setting loading to false');
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp.trim()) {
      Alert.alert('Error', 'Please enter the OTP');
      return;
    }

    if (otp.length !== 6) {
      Alert.alert('Error', 'OTP must be 6 digits');
      return;
    }

    console.log('🔐 [TESTING] Attempting to verify OTP:', otp);
    console.log('🔐 [TESTING] Phone number:', phone);

    setLoading(true);
    try {
      const result = await verifySmSToken({ phone, token: otp });
      
      if (result.success) {
        if (result.userExists) {
          // User exists, login successful
          console.log('✅ [TESTING] OTP verification successful! User exists.');
          Alert.alert('Success', 'Login successful!', [
            {
              text: 'OK',
              onPress: () => {
                onLoginSuccess?.();
                // Navigate to home/main screen
                // The AuthContext will handle the navigation automatically
              }
            }
          ]);
        } else {
          // User doesn't exist, show role selection
          console.log('✅ [TESTING] OTP verification successful! User needs account creation.');
          setStep('role-selection');
        }
      } else {
        console.log('❌ [TESTING] OTP verification failed:', result.error);
        Alert.alert('Error', result.error || 'Invalid OTP');
      }
    } catch (error: any) {
      console.log('❌ [TESTING] OTP verification error:', error.message);
      Alert.alert('Error', error.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setLoading(true);
    try {
      const result = await signInWithSMS({ phone });
      
      if (result.success) {
        Alert.alert('Success', 'OTP resent to your phone number');
      } else {
        Alert.alert('Error', result.error || 'Failed to resend OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAccount = async (role: UserRole) => {
    setLoading(true);
    try {
      console.log('🔐 [TESTING] Creating account for role:', role);
      console.log('🔐 [TESTING] Phone number:', phone);
      
      // Format phone number properly
      const formattedPhone = '+960' + phone.replace(/\D/g, '');
      console.log('🔐 [TESTING] Formatted phone:', formattedPhone);
      
      // Create user data for database
      const userData = {
        phone: formattedPhone,
        role: role,
        status: 'ACTIVE' as const,
        // Add other required fields based on your User table schema
        // These will be auto-generated by Supabase if not provided:
        // id, created_at, updated_at
      };
      
      console.log('🔐 [TESTING] Creating user in database with data:', userData);
      
      // Actually create the user in the database
      const createdUser = await userService.createUser(userData);
      
      if (!createdUser) {
        throw new Error('Failed to create user in database');
      }
      
      console.log('✅ [TESTING] User created successfully in database:', createdUser);
      
      // For AGENT and OWNER roles, create additional records
      if (role === 'AGENT') {
        console.log('🔐 [TESTING] Creating agent record...');
        const agentData = {
          user_id: createdUser.id,
          display_name: `Agent ${formattedPhone.slice(-4)}`, // Use last 4 digits as display name
          contact_info: { phone: formattedPhone }
        };
        
        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .insert([agentData])
          .select()
          .single();
          
        if (agentError) {
          console.error('❌ [TESTING] Failed to create agent record:', agentError);
          // Continue anyway, user is still created
        } else {
          console.log('✅ [TESTING] Agent record created:', agent);
        }
      } else if (role === 'OWNER') {
        console.log('🔐 [TESTING] Creating owner record...');
        const ownerData = {
          user_id: createdUser.id,
          brand_name: `Boat Owner ${formattedPhone.slice(-4)}`, // Use last 4 digits as brand name
          status: 'ACTIVE'
        };
        
        const { data: owner, error: ownerError } = await supabase
          .from('owners')
          .insert([ownerData])
          .select()
          .single();
          
        if (ownerError) {
          console.error('❌ [TESTING] Failed to create owner record:', ownerError);
          // Continue anyway, user is still created
        } else {
          console.log('✅ [TESTING] Owner record created:', owner);
        }
      }
      
      // Set the current user session
      await userService.setCurrentUserSession(createdUser, 'temp-token-' + Date.now());
      console.log('✅ [TESTING] User session set successfully');
      
      // Update the auth context to trigger navigation
      console.log('🔐 [TESTING] Setting auth state to authenticated...');
      setAuthState({
        user: createdUser,
        session: { user: { phone: createdUser.phone } } as any,
        isLoading: false,
        isAuthenticated: true,
      });
      
      console.log('✅ [TESTING] Auth state updated, should trigger navigation...');
      
      Alert.alert('Success', `Account created successfully as ${role}!`, [
        {
          text: 'OK',
          onPress: () => {
            // Navigation will happen automatically via AuthContext
            console.log('✅ [TESTING] Account created, navigating to main screen...');
          }
        }
      ]);
      
    } catch (error: any) {
      console.log('❌ [TESTING] Account creation error:', error.message);
      Alert.alert('Error', error.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const digits = text.replace(/\D/g, '');
    
    // Limit to 7 digits (Maldives local format)
    const limitedDigits = digits.slice(0, 7);
    
    // Format as XXX-XXXX
    if (limitedDigits.length <= 3) {
      return limitedDigits;
    } else {
      return `${limitedDigits.slice(0, 3)}-${limitedDigits.slice(3, 7)}`;
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ paddingHorizontal: 24, paddingVertical: 32 }}>
            {/* Header */}
            <View style={{ alignItems: 'center', marginBottom: 48 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 24 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  backgroundColor: '#18181b', 
                  borderRadius: 8, 
                  marginRight: 12, 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>🚢</Text>
                </View>
                <Text variant="h2" color="primary">
                  Catalyst
                </Text>
              </View>
              <Text variant="h4" color="secondary" style={{ textAlign: 'center' }}>
                Sign in to your account
              </Text>
            </View>

            {/* Main Form */}
            <View style={{ 
              marginHorizontal: 16, 
              backgroundColor: '#ffffff',
              borderRadius: 12,
              padding: 24,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 8,
              elevation: 4,
            }}>
              {step === 'phone' ? (
                <>
                  <Input
                    label="Phone Number"
                    value={phone}
                    onChangeText={(text: string) => setPhone(formatPhoneNumber(text))}
                    keyboardType="phone-pad"
                    placeholder="777-9186"
                    editable={!loading}
                    helperText="Format: 7XX-XXXX or 9XX-XXXX (7 digits)"
                  />

                  <TouchableOpacity
                    onPress={() => {
                      console.log('🔍 [DEBUG] Send OTP button clicked!');
                      handleSendOTP();
                    }}
                    disabled={loading}
                    style={{ 
                      width: '100%',
                      backgroundColor: '#18181b', // Force visible background
                      minHeight: 60, // Ensure minimum height
                      marginTop: 16, // Add some margin
                      borderWidth: 2, // Add border to make it more visible
                      borderColor: '#ff0000', // Red border for debugging
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: loading ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>
                      Send OTP
                    </Text>
                  </TouchableOpacity>
                </>
              ) : step === 'otp' ? (
                <>
                  <Text variant="h6" color="primary" style={{ marginBottom: 8 }}>
                    OTP Code
                  </Text>
                  <Text color="secondary" style={{ marginBottom: 24 }}>
                    Enter the 6-digit code sent to {phone}
                  </Text>

                  {/* Development Testing Note */}
                  <View style={{ 
                    backgroundColor: '#f3f4f6', 
                    borderLeftWidth: 4, 
                    borderLeftColor: '#6366f1', 
                    padding: 12, 
                    marginBottom: 24, 
                    borderRadius: 8 
                  }}>
                    <Text color="primary" style={{ fontWeight: '600', marginBottom: 4 }}>
                      💡 Development Testing:
                    </Text>
                    <Text color="secondary" style={{ fontSize: 14 }}>
                      Check console for SMS details. Use any 6-digit code to test.
                    </Text>
                  </View>

                  <Input
                    label="OTP Code"
                    value={otp}
                    onChangeText={setOtp}
                    keyboardType="numeric"
                    placeholder="000000"
                    maxLength={6}
                    editable={!loading}
                    inputStyle={{ textAlign: 'center', fontSize: 18, letterSpacing: 4 }}
                  />

                  <TouchableOpacity
                    onPress={handleVerifyOTP}
                    disabled={loading || otp.length !== 6}
                    style={{ 
                      width: '100%', 
                      marginBottom: 16,
                      backgroundColor: '#18181b',
                      minHeight: 52,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: (loading || otp.length !== 6) ? 0.5 : 1,
                    }}
                  >
                    <Text style={{ color: '#ffffff', fontSize: 16, fontWeight: '600' }}>
                      Verify OTP
                    </Text>
                  </TouchableOpacity>

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <TouchableOpacity
                      onPress={handleResendOTP}
                      disabled={loading}
                      style={{ 
                        flex: 1,
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: '#18181b',
                        minHeight: 44,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: '#18181b', fontSize: 14, fontWeight: '500' }}>
                        Resend OTP
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setStep('phone');
                        setOtp('');
                      }}
                      disabled={loading}
                      style={{ 
                        flex: 1,
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: '#18181b',
                        minHeight: 44,
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: loading ? 0.5 : 1,
                      }}
                    >
                      <Text style={{ color: '#18181b', fontSize: 14, fontWeight: '500' }}>
                        Change Number
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text variant="h5" color="primary" style={{ textAlign: 'center', marginBottom: 8 }}>
                    Create Your Account
                  </Text>
                  <Text color="secondary" style={{ textAlign: 'center', marginBottom: 32 }}>
                    Choose your account type to get started
                  </Text>

                  <View style={{ gap: 16, marginBottom: 32 }}>
                    <TouchableOpacity
                      onPress={() => handleCreateAccount('PUBLIC' as UserRole)}
                      style={{ 
                        width: '100%', 
                        paddingVertical: 16,
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: '#18181b',
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#18181b', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>👤 Public User</Text>
                        <Text style={{ color: '#6b7280', fontSize: 14 }}>Book tickets and travel</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCreateAccount('AGENT' as UserRole)}
                      style={{ 
                        width: '100%', 
                        paddingVertical: 16,
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: '#18181b',
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#18181b', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>🏢 Travel Agent</Text>
                        <Text style={{ color: '#6b7280', fontSize: 14 }}>Book for customers and earn commissions</Text>
                      </View>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => handleCreateAccount('OWNER' as UserRole)}
                      style={{ 
                        width: '100%', 
                        paddingVertical: 16,
                        backgroundColor: 'transparent',
                        borderWidth: 1,
                        borderColor: '#18181b',
                        borderRadius: 8,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <View style={{ alignItems: 'center' }}>
                        <Text style={{ color: '#18181b', fontSize: 16, fontWeight: '600', marginBottom: 4 }}>🚢 Boat Owner</Text>
                        <Text style={{ color: '#6b7280', fontSize: 14 }}>Manage boats, schedules, and earnings</Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={() => setStep('phone')}
                    style={{ 
                      width: '100%',
                      backgroundColor: 'transparent',
                      minHeight: 44,
                      borderRadius: 8,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Text style={{ color: '#18181b', fontSize: 14, fontWeight: '500' }}>
                      Back to Phone Input
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {/* Footer */}
            <View style={{ alignItems: 'center', marginTop: 48, paddingHorizontal: 16 }}>
              <Text color="muted" style={{ textAlign: 'center', fontSize: 14 }}>
                By continuing, you agree to our{' '}
                <Text color="primary" style={{ textDecorationLine: 'underline' }}>
                  Terms of Service
                </Text>
                {' '}and{' '}
                <Text color="primary" style={{ textDecorationLine: 'underline' }}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};
