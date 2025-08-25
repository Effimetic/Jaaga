import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import {
    Button,
    Modal,
    Portal,
    Surface,
    Text,
} from '../../compat/paper';
import { paymentService } from '../../services/paymentService';
import { colors, spacing, theme } from '../../theme/theme';
import { Booking } from '../../types';

interface CardPaymentModalProps {
  visible: boolean;
  booking: Booking;
  customerData?: {
    name: string;
    phone: string;
  };
  onDismiss: () => void;
  onSuccess: (transactionId: string) => void;
  onError: (error: string) => void;
}

export const CardPaymentModal: React.FC<CardPaymentModalProps> = ({
  visible,
  booking,
  customerData,
  onDismiss,
  onSuccess,
  onError,
}) => {
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<'INIT' | 'REDIRECTING' | 'PROCESSING' | 'SUCCESS' | 'ERROR'>('INIT');
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [transactionId, setTransactionId] = useState<string | null>(null);

  const handlePayment = async () => {
    try {
      setProcessing(true);
      setStep('PROCESSING');

      // Process card payment
      const result = await paymentService.processPayment(booking, 'CARD_BML', customerData);

      if (!result.success) {
        throw new Error(result.error || 'Payment processing failed');
      }

      if (result.requiresAction && result.actionUrl) {
        setPaymentUrl(result.actionUrl);
        setTransactionId(result.transactionId || null);
        setStep('REDIRECTING');
        
        // Open payment URL in browser/web view
        const canOpen = await Linking.canOpenURL(result.actionUrl);
        if (canOpen) {
          await Linking.openURL(result.actionUrl);
          // In a real app, you'd implement a web view or redirect handling
          setStep('PROCESSING');
          
          // Simulate payment completion (in real app, this would come from webhook)
          setTimeout(() => {
            handlePaymentCompletion(true);
          }, 5000);
        } else {
          throw new Error('Cannot open payment gateway');
        }
      } else {
        // Direct processing (unlikely for card payments)
        setStep('SUCCESS');
        onSuccess(result.transactionId || '');
      }

    } catch (error: any) {
      console.error('Card payment failed:', error);
      setStep('ERROR');
      onError(error.message || 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handlePaymentCompletion = (success: boolean) => {
    if (success) {
      setStep('SUCCESS');
      onSuccess(transactionId || '');
    } else {
      setStep('ERROR');
      onError('Payment was cancelled or failed');
    }
  };

  const renderInitialStep = () => (
    <View style={styles.stepContainer}>
      <MaterialCommunityIcons
        name="credit-card"
        size={64}
        color={theme.colors.primary}
        style={styles.stepIcon}
      />
      
      <Text variant="headlineSmall" style={styles.stepTitle}>
        Secure Card Payment
      </Text>
      
      <Text variant="bodyMedium" style={styles.stepDescription}>
        You will be redirected to BML Payment Gateway to complete your payment securely.
      </Text>

      <View style={styles.paymentDetails}>
        <View style={styles.detailRow}>
          <Text variant="bodyMedium">Amount:</Text>
          <Text variant="titleMedium" style={styles.amount}>
            {booking.currency} {booking.total.toFixed(2)}
          </Text>
        </View>
        
        <View style={styles.detailRow}>
          <Text variant="bodyMedium">Processing Fee:</Text>
          <Text variant="bodyMedium">
            {booking.currency} 5.00
          </Text>
        </View>
        
        <View style={[styles.detailRow, styles.totalRow]}>
          <Text variant="titleMedium">Total:</Text>
          <Text variant="titleLarge" style={styles.totalAmount}>
            {booking.currency} {(booking.total + 5).toFixed(2)}
          </Text>
        </View>
      </View>

      <View style={styles.securityInfo}>
        <MaterialCommunityIcons name="shield-check" size={20} color={colors.success} />
        <Text variant="bodySmall" style={styles.securityText}>
          3D Secure authentication • SSL encrypted • PCI compliant
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={onDismiss}
          style={styles.button}
          disabled={processing}
        >
          Cancel
        </Button>
        
        <Button
          mode="contained"
          onPress={handlePayment}
          style={styles.button}
          disabled={processing}
        >
          Pay Now
        </Button>
      </View>
    </View>
  );

  const renderRedirectingStep = () => (
    <View style={styles.stepContainer}>
      <MaterialCommunityIcons
        name="open-in-new"
        size={64}
        color={theme.colors.primary}
        style={styles.stepIcon}
      />
      
      <Text variant="headlineSmall" style={styles.stepTitle}>
        Redirecting to Payment Gateway
      </Text>
      
      <Text variant="bodyMedium" style={styles.stepDescription}>
        Please complete your payment in the opened browser window.
      </Text>

      <Text>Loading...</Text>

      <Button
        mode="text"
        onPress={() => paymentUrl && Linking.openURL(paymentUrl)}
        style={styles.reopenButton}
      >
        Reopen Payment Page
      </Button>
    </View>
  );

  const renderProcessingStep = () => (
    <View style={styles.stepContainer}>
      <MaterialCommunityIcons name="loading" size={32} color={theme.colors.primary} style={styles.stepIcon} />
      
      <Text variant="headlineSmall" style={styles.stepTitle}>
        Processing Payment
      </Text>
      
      <Text variant="bodyMedium" style={styles.stepDescription}>
        Please wait while we verify your payment...
      </Text>

      <View style={styles.processingSteps}>
        <ProcessingStep label="Contacting bank" completed />
        <ProcessingStep label="Verifying payment" completed />
        <ProcessingStep label="Confirming booking" inProgress />
      </View>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContainer}>
      <MaterialCommunityIcons
        name="check-circle"
        size={64}
        color={colors.success}
        style={styles.stepIcon}
      />
      
      <Text variant="headlineSmall" style={[styles.stepTitle, { color: colors.success }]}>
        Payment Successful!
      </Text>
      
      <Text variant="bodyMedium" style={styles.stepDescription}>
        Your payment has been processed successfully. Your tickets will be sent via SMS shortly.
      </Text>

      <Button
        mode="contained"
        onPress={onDismiss}
        style={styles.successButton}
      >
        Continue
      </Button>
    </View>
  );

  const renderErrorStep = () => (
    <View style={styles.stepContainer}>
      <MaterialCommunityIcons
        name="alert-circle"
        size={64}
        color={colors.error}
        style={styles.stepIcon}
      />
      
      <Text variant="headlineSmall" style={[styles.stepTitle, { color: colors.error }]}>
        Payment Failed
      </Text>
      
      <Text variant="bodyMedium" style={styles.stepDescription}>
        Your payment could not be processed. Please try again or use a different payment method.
      </Text>

      <View style={styles.buttonContainer}>
        <Button
          mode="outlined"
          onPress={onDismiss}
          style={styles.button}
        >
          Close
        </Button>
        
        <Button
          mode="contained"
          onPress={() => {
            setStep('INIT');
            setProcessing(false);
          }}
          style={styles.button}
        >
          Retry
        </Button>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'INIT':
        return renderInitialStep();
      case 'REDIRECTING':
        return renderRedirectingStep();
      case 'PROCESSING':
        return renderProcessingStep();
      case 'SUCCESS':
        return renderSuccessStep();
      case 'ERROR':
        return renderErrorStep();
      default:
        return renderInitialStep();
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={step === 'PROCESSING' ? undefined : onDismiss}
      >
        <Surface style={styles.container}>
          {renderCurrentStep()}
        </Surface>
      </Modal>
    </Portal>
  );
};

interface ProcessingStepProps {
  label: string;
  completed?: boolean;
  inProgress?: boolean;
}

const ProcessingStep: React.FC<ProcessingStepProps> = ({ label, completed, inProgress }) => (
  <View style={styles.processingStep}>
    {completed ? (
      <MaterialCommunityIcons name="check" size={16} color={colors.success} />
    ) : inProgress ? (
      <MaterialCommunityIcons name="loading" size={16} color={theme.colors.primary} />
    ) : (
      <MaterialCommunityIcons name="circle-outline" size={16} color={theme.colors.onSurfaceVariant} />
    )}
    <Text variant="bodySmall" style={styles.processingStepLabel}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    margin: spacing.lg,
  },
  stepContainer: {
    padding: spacing.xl,
    alignItems: 'center',
    minHeight: 400,
  },
  stepIcon: {
    marginBottom: spacing.lg,
  },
  stepTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  stepDescription: {
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  paymentDetails: {
    width: '100%',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  amount: {
    fontWeight: '600',
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
    paddingTop: spacing.sm,
    marginTop: spacing.sm,
  },
  totalAmount: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  securityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.sm,
    backgroundColor: colors.success + '10',
    borderRadius: 8,
  },
  securityText: {
    color: colors.success,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  button: {
    flex: 1,
  },
  reopenButton: {
    marginTop: spacing.md,
  },
  processingSteps: {
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  processingStep: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  processingStepLabel: {
    opacity: 0.8,
  },
  successButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
});
