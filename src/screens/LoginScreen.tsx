import React, { useState } from 'react';
import {
    Alert,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    Button,
    Card,
    Surface,
    Text,
    TextInput
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import { spacing, theme } from '../theme/theme';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  
  const { signInWithSMS, verifySmSToken } = useAuth();

  const handleSendOTP = async () => {
    if (!phone.trim()) {
      Alert.alert('Error', 'Please enter your phone number');
      return;
    }

    // Validate phone number format
    const phoneRegex = /^(\+960|960|0)?[79]\d{6}$/;
    if (!phoneRegex.test(phone.replace(/\s+/g, ''))) {
      Alert.alert('Error', 'Please enter a valid Maldives phone number');
      return;
    }

    setLoading(true);
    try {
      const result = await signInWithSMS({ phone });
      
      if (result.success) {
        setStep('otp');
        Alert.alert('Success', 'OTP sent to your phone number');
        console.log('💡 [TESTING] Check the console for SMS verification details');
        console.log('💡 [TESTING] For development testing, you can use any 6-digit code');
      } else {
        Alert.alert('Error', result.error || 'Failed to send OTP');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send OTP');
    } finally {
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
        console.log('✅ [TESTING] OTP verification successful!');
        Alert.alert('Success', 'Login successful!');
        onLoginSuccess?.();
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

  const formatPhoneNumber = (text: string) => {
    // Remove all non-digit characters
    const digits = text.replace(/\D/g, '');
    
    // Format as XXX-XXXX or +960 XXX-XXXX
    if (digits.startsWith('960')) {
      const number = digits.slice(3);
      if (number.length <= 3) {
        return `+960 ${number}`;
      } else {
        return `+960 ${number.slice(0, 3)}-${number.slice(3, 7)}`;
      }
    } else if (digits.length <= 3) {
      return digits;
    } else {
      return `${digits.slice(0, 3)}-${digits.slice(3, 7)}`;
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

                  <TextInput
                    label="Phone Number"
                    value={phone}
                    onChangeText={(text) => setPhone(formatPhoneNumber(text))}
                    mode="outlined"
                    keyboardType="phone-pad"
                    placeholder="+960 XXX-XXXX"
                    style={styles.input}
                    disabled={loading}
                    left={<TextInput.Icon icon="phone" />}
                  />

                  <Button
                    mode="contained"
                    onPress={handleSendOTP}
                    loading={loading}
                    disabled={loading}
                    style={styles.button}
                    contentStyle={styles.buttonContent}
                  >
                    Send OTP
                  </Button>
                </>
              ) : (
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
  footerContainer: {
    alignItems: 'center',
  },
  footerText: {
    textAlign: 'center',
    opacity: 0.6,
  },
});
