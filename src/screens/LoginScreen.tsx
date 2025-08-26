import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { Button, Card, Surface, Text, TextInput } from '../compat/paper';
import {
  Button,
  Card,
  Surface,
  Text,
  TextInput
} from 'react-native-paper';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { spacing, theme } from '../theme/theme';
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
  const userService = require('../services/userService').UserService.getInstance();

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
        status: 'ACTIVE',
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
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        <Surface style={styles.surface}>
          <View style={styles.headerContainer}>
            <Text variant="headlineMedium" style={styles.title}>
              🚢 Boat Ticketing
            </Text>
            <Text variant="bodyLarge" style={styles.subtitle}>
              Book your ferry tickets easily
            </Text>
          </View>

          <Card style={styles.card}>
            <Card.Content>
              {step === 'phone' ? (
                <>
                  <Text variant="titleMedium" style={styles.stepTitle}>
                    Enter your phone number
                  </Text>
                  <Text variant="bodyMedium" style={styles.stepDescription}>
                    We&apos;ll send you an OTP to verify your number
                  </Text>
                  <Text variant="bodySmall" style={styles.formatNote}>
                    Format: 7XX-XXXX or 9XX-XXXX (7 digits)
                  </Text>

                  <TextInput
                    label="Phone Number"
                    value={phone}
                    onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                    mode="outlined"
                    keyboardType="phone-pad"
                    placeholder="777-9186"
                    style={styles.input}
                    disabled={loading}
                    left={<TextInput.Icon icon="phone" />}
                  />

                  <Button
                    mode="contained"
                    onPress={() => {
                      console.log('🔍 [DEBUG] Send OTP button clicked!');
                      handleSendOTP();
                    }}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                  >
                    Send OTP
                  </Button>
                </>
              ) : step === 'otp' ? (
                <>
                  <Text variant="titleMedium" style={styles.stepTitle}>
                    Enter OTP
                  </Text>
                  <Text variant="bodyMedium" style={styles.stepDescription}>
                    Enter the 6-digit code sent to {phone}
                  </Text>

                  {/* Development Testing Note */}
                  <View style={styles.devNote}>
                    <Text variant="bodySmall" style={styles.devNoteText}>
                      💡 <Text style={{fontWeight: 'bold'}}>Development Testing:</Text>
                    </Text>
                    <Text variant="bodySmall" style={styles.devNoteText}>
                      Check console for SMS details. Use any 6-digit code to test.
                    </Text>
                  </View>

                  <TextInput
                    label="OTP Code"
                    value={otp}
                    onChangeText={setOtp}
                    mode="outlined"
                    keyboardType="numeric"
                    placeholder="000000"
                    maxLength={6}
                    style={styles.input}
                    disabled={loading}
                    left={<TextInput.Icon icon="shield-key" />}
                  />

                  <Button
                    mode="contained"
                    onPress={handleVerifyOTP}
                    loading={loading}
                    disabled={loading || otp.length !== 6}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                  >
                    Verify OTP
                  </Button>

                  <View style={styles.resendContainer}>
                    <Button
                      mode="text"
                      onPress={handleResendOTP}
                      disabled={loading}
                      style={styles.resendButton}
                    >
                      Resend OTP
                    </Button>
                    <Button
                      mode="text"
                      onPress={() => {
                        setStep('phone');
                        setOtp('');
                      }}
                      disabled={loading}
                      style={styles.resendButton}
                    >
                      Change Number
                    </Button>
                  </View>
                </>
              ) : (
                <>
                  <Text variant="titleMedium" style={styles.stepTitle}>
                    Create Your Account
                  </Text>
                  <Text variant="bodyMedium" style={styles.stepDescription}>
                    Choose your account type to get started
                  </Text>

                  <View style={styles.roleContainer}>
                    <Button
                      mode="outlined"
                      onPress={() => handleCreateAccount('PUBLIC' as UserRole)}
                      style={styles.roleButton}
                      contentStyle={styles.roleButtonContent}
                      icon="account"
                    >
                      <View style={styles.roleButtonContent}>
                        <Text variant="titleMedium">Public User</Text>
                        <Text variant="bodySmall">Book tickets and travel</Text>
                      </View>
                    </Button>

                    <Button
                      mode="outlined"
                      onPress={() => handleCreateAccount('AGENT' as UserRole)}
                      style={styles.roleButton}
                      contentStyle={styles.roleButtonContent}
                      icon="account-tie"
                    >
                      <View style={styles.roleButtonContent}>
                        <Text variant="titleMedium">Travel Agent</Text>
                        <Text variant="bodySmall">Book for customers and earn commissions</Text>
                      </View>
                    </Button>

                    <Button
                      mode="outlined"
                      onPress={() => handleCreateAccount('OWNER' as UserRole)}
                      style={styles.roleButton}
                      contentStyle={styles.roleButtonContent}
                      icon="ferry"
                    >
                      <View style={styles.roleButtonContent}>
                        <Text variant="titleMedium">Boat Owner</Text>
                        <Text variant="bodySmall">Manage boats, schedules, and earnings</Text>
                      </View>
                    </Button>
                  </View>

                  <Button
                    mode="text"
                    onPress={() => setStep('phone')}
                    style={styles.backButton}
                  >
                    Back to Phone Input
                  </Button>
                </>
              )}
            </Card.Content>
          </Card>

          <View style={styles.footerContainer}>
            <Text variant="bodySmall" style={styles.footerText}>
              By continuing, you agree to our Terms of Service and Privacy Policy
            </Text>
          </View>
        </Surface>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: spacing.md,
  },
  surface: {
    borderRadius: 16,
    padding: spacing.lg,
    margin: spacing.md,
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: 'bold',
  },
  subtitle: {
    textAlign: 'center',
    opacity: 0.7,
  },
  card: {
    marginBottom: spacing.lg,
  },
  stepTitle: {
    textAlign: 'center',
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  stepDescription: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    opacity: 0.7,
  },
  input: {
    marginBottom: spacing.lg,
  },
  button: {
    marginBottom: spacing.md,
  },
  buttonContent: {
    height: 50,
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  resendButton: {
    flex: 1,
  },
  devNote: {
    backgroundColor: theme.colors.primaryContainer,
    padding: spacing.sm,
    borderRadius: 8,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: theme.colors.primary,
  },
  devNoteText: {
    color: theme.colors.onPrimaryContainer,
    textAlign: 'center',
    lineHeight: 18,
  },
  formatNote: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: spacing.md,
    fontStyle: 'italic',
  },
  roleContainer: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  roleButton: {
    marginBottom: spacing.sm,
  },
  roleButtonContent: {
    alignItems: 'flex-start',
    padding: spacing.sm,
  },
  backButton: {
    marginTop: spacing.md,
  },
  footerContainer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    opacity: 0.6,
  },
});
