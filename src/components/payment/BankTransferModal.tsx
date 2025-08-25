import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import React, { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import {
    ActivityIndicator,
    Button,
    Card,
    Chip,
    Modal,
    Portal,
    Surface,
    Text,
    TextInput,
} from 'react-native-paper';
import { paymentService } from '../../services/paymentService';
import { colors, spacing, theme } from '../../theme/theme';
import { Booking, OwnerBankAccount } from '../../types';

interface BankTransferModalProps {
  visible: boolean;
  booking: Booking;
  bankAccounts: OwnerBankAccount[];
  onDismiss: () => void;
  onSuccess: (receiptId: string) => void;
  onError: (error: string) => void;
}

export const BankTransferModal: React.FC<BankTransferModalProps> = ({
  visible,
  booking,
  bankAccounts,
  onDismiss,
  onSuccess,
  onError,
}) => {
  const [step, setStep] = useState<'SELECT_ACCOUNT' | 'UPLOAD_RECEIPT' | 'PROCESSING' | 'SUCCESS'>('SELECT_ACCOUNT');
  const [selectedAccount, setSelectedAccount] = useState<OwnerBankAccount | null>(null);
  const [reference, setReference] = useState('');
  const [selectedFile, setSelectedFile] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [processing, setProcessing] = useState(false);
  const [, setReceiptId] = useState<string | null>(null);

  const handleAccountSelect = (account: OwnerBankAccount) => {
    setSelectedAccount(account);
    setStep('UPLOAD_RECEIPT');
  };

  const handleFileSelect = async () => {
    try {
      const file = await paymentService.pickDocument();
      if (file) {
        setSelectedFile(file);
      }
    } catch {
      Alert.alert('Error', 'Failed to select file');
    }
  };

  const handleUpload = async () => {
    if (!selectedAccount || !selectedFile) {
      Alert.alert('Error', 'Please select account and upload receipt');
      return;
    }

    try {
      setProcessing(true);
      setStep('PROCESSING');

      // First create the bank transfer payment
      const paymentResult = await paymentService.processPayment(booking, 'BANK_TRANSFER', {
        selectedAccountId: selectedAccount.id,
        reference: reference.trim(),
      });

      if (!paymentResult.success || !paymentResult.receipt) {
        throw new Error(paymentResult.error || 'Failed to create payment record');
      }

      // Upload the receipt
      const uploadResult = await paymentService.uploadTransferReceipt(
        paymentResult.receipt.id,
        {
          file: selectedFile,
          accountId: selectedAccount.id,
          reference: reference.trim(),
          amount: booking.total,
          currency: booking.currency,
        }
      );

      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Failed to upload receipt');
      }

      setReceiptId(paymentResult.receipt.id);
      setStep('SUCCESS');
      onSuccess(paymentResult.receipt.id);

    } catch (err: any) {
      console.error('Bank transfer upload failed:', err);
      onError(err.message || 'Upload failed');
    } finally {
      setProcessing(false);
    }
  };

  const renderAccountSelection = () => (
    <View style={styles.stepContainer}>
      <Text variant="headlineSmall" style={styles.stepTitle}>
        Select Bank Account
      </Text>
      
      <Text variant="bodyMedium" style={styles.stepDescription}>
        Choose the bank account to transfer to:
      </Text>

      <View style={styles.accountsList}>
        {bankAccounts.map((account) => (
          <Card
            key={account.id}
            style={styles.accountCard}
            onPress={() => handleAccountSelect(account)}
          >
            <Card.Content style={styles.accountContent}>
              <View style={styles.accountHeader}>
                <MaterialCommunityIcons
                  name="bank"
                  size={24}
                  color={theme.colors.primary}
                />
                <View style={styles.accountInfo}>
                  <Text variant="titleMedium" style={styles.bankName}>
                    {account.bank_name}
                  </Text>
                  <Text variant="bodyMedium" style={styles.accountName}>
                    {account.account_name}
                  </Text>
                </View>
                <Chip mode="outlined" compact>
                  {account.currency}
                </Chip>
              </View>
              
              <View style={styles.accountDetails}>
                <Text variant="bodySmall" style={styles.accountLabel}>
                  Account Number:
                </Text>
                <Text variant="bodyMedium" style={styles.accountNumber}>
                  {account.account_no}
                </Text>
              </View>
              
              {account.iban && (
                <View style={styles.accountDetails}>
                  <Text variant="bodySmall" style={styles.accountLabel}>
                    IBAN:
                  </Text>
                  <Text variant="bodyMedium" style={styles.accountNumber}>
                    {account.iban}
                  </Text>
                </View>
              )}
            </Card.Content>
          </Card>
        ))}
      </View>

      <Button
        mode="outlined"
        onPress={onDismiss}
        style={styles.cancelButton}
      >
        Cancel
      </Button>
    </View>
  );

  const renderReceiptUpload = () => (
    <View style={styles.stepContainer}>
      <Text variant="headlineSmall" style={styles.stepTitle}>
        Upload Transfer Receipt
      </Text>
      
      <Text variant="bodyMedium" style={styles.stepDescription}>
        Please transfer the exact amount and upload your receipt:
      </Text>

      {/* Selected Account Info */}
      <Card style={styles.selectedAccountCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.selectedAccountTitle}>
            Transfer To:
          </Text>
          <View style={styles.selectedAccountInfo}>
            <Text variant="titleMedium">{selectedAccount?.bank_name}</Text>
            <Text variant="bodyMedium">{selectedAccount?.account_name}</Text>
            <Text variant="bodyMedium" style={styles.accountNumber}>
              {selectedAccount?.account_no}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Amount Info */}
      <Card style={styles.amountCard}>
        <Card.Content style={styles.amountContent}>
          <Text variant="titleSmall">Transfer Amount:</Text>
          <Text variant="headlineMedium" style={styles.transferAmount}>
            {booking.currency} {booking.total.toFixed(2)}
          </Text>
        </Card.Content>
      </Card>

      {/* Reference Input */}
      <TextInput
        label="Transfer Reference (Optional)"
        value={reference}
        onChangeText={setReference}
        mode="outlined"
        placeholder="Enter any reference from your transfer"
        style={styles.referenceInput}
      />

      {/* File Upload */}
      <View style={styles.uploadSection}>
        <Text variant="titleSmall" style={styles.uploadTitle}>
          Upload Receipt
        </Text>
        
        {selectedFile ? (
          <Card style={styles.fileCard}>
            <Card.Content style={styles.fileContent}>
              <View style={styles.fileInfo}>
                <MaterialCommunityIcons
                  name={selectedFile.mimeType?.startsWith('image/') ? 'file-image' : 'file-pdf-box'}
                  size={32}
                  color={theme.colors.primary}
                />
                <View style={styles.fileDetails}>
                  <Text variant="bodyMedium" style={styles.fileName}>
                    {selectedFile.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.fileSize}>
                    {Math.round((selectedFile.size || 0) / 1024)} KB
                  </Text>
                </View>
              </View>
              
              <Button
                mode="text"
                onPress={handleFileSelect}
                compact
              >
                Change
              </Button>
            </Card.Content>
          </Card>
        ) : (
          <Button
            mode="outlined"
            onPress={handleFileSelect}
            style={styles.uploadButton}
            icon="cloud-upload"
          >
            Select Receipt File
          </Button>
        )}
        
        <Text variant="bodySmall" style={styles.uploadHint}>
          Supported formats: PDF, JPG, PNG (Max 10MB)
        </Text>
      </View>

      {/* Instructions */}
      <Card style={styles.instructionsCard}>
        <Card.Content>
          <Text variant="titleSmall" style={styles.instructionsTitle}>
            Transfer Instructions:
          </Text>
          <View style={styles.instructionsList}>
            <Text variant="bodySmall" style={styles.instruction}>
              1. Transfer the exact amount to the selected account
            </Text>
            <Text variant="bodySmall" style={styles.instruction}>
              2. Take a photo or screenshot of your receipt
            </Text>
            <Text variant="bodySmall" style={styles.instruction}>
              3. Upload the receipt using the button above
            </Text>
            <Text variant="bodySmall" style={styles.instruction}>
              4. Your booking will be confirmed after verification
            </Text>
          </View>
        </Card.Content>
      </Card>

      <View style={styles.uploadActions}>
        <Button
          mode="outlined"
          onPress={() => setStep('SELECT_ACCOUNT')}
          style={styles.actionButton}
          disabled={processing}
        >
          Back
        </Button>
        
        <Button
          mode="contained"
          onPress={handleUpload}
          style={styles.actionButton}
          disabled={!selectedFile || processing}
          loading={processing}
        >
          Upload Receipt
        </Button>
      </View>
    </View>
  );

  const renderProcessing = () => (
    <View style={styles.stepContainer}>
      <ActivityIndicator size={64} color={theme.colors.primary} style={styles.stepIcon} />
      
      <Text variant="headlineSmall" style={styles.stepTitle}>
        Processing Receipt
      </Text>
      
      <Text variant="bodyMedium" style={styles.stepDescription}>
        We&apos;re processing your transfer receipt and verifying the details...
      </Text>

      <View style={styles.processingSteps}>
        <ProcessingStep label="Uploading receipt" completed />
        <ProcessingStep label="Extracting transfer details" inProgress />
        <ProcessingStep label="Verifying amount & account" />
        <ProcessingStep label="Confirming booking" />
      </View>
    </View>
  );

  const renderSuccess = () => (
    <View style={styles.stepContainer}>
      <MaterialCommunityIcons
        name="check-circle"
        size={64}
        color={colors.success}
        style={styles.stepIcon}
      />
      
      <Text variant="headlineSmall" style={[styles.stepTitle, { color: colors.success }]}>
        Receipt Uploaded Successfully!
      </Text>
      
      <Text variant="bodyMedium" style={styles.stepDescription}>
        Your transfer receipt has been uploaded and is being verified. You&apos;ll receive an SMS confirmation once the payment is verified.
      </Text>

      <Card style={styles.successCard}>
        <Card.Content>
          <Text variant="titleSmall">What&apos;s Next?</Text>
          <View style={styles.nextSteps}>
            <Text variant="bodySmall" style={styles.nextStep}>
              • We&apos;ll verify your transfer within 2-4 hours
            </Text>
            <Text variant="bodySmall" style={styles.nextStep}>
              • You&apos;ll receive SMS confirmation once verified
            </Text>
            <Text variant="bodySmall" style={styles.nextStep}>
              • Your tickets will be issued immediately after confirmation
            </Text>
          </View>
        </Card.Content>
      </Card>

      <Button
        mode="contained"
        onPress={onDismiss}
        style={styles.successButton}
      >
        Continue
      </Button>
    </View>
  );

  const renderCurrentStep = () => {
    switch (step) {
      case 'SELECT_ACCOUNT':
        return renderAccountSelection();
      case 'UPLOAD_RECEIPT':
        return renderReceiptUpload();
      case 'PROCESSING':
        return renderProcessing();
      case 'SUCCESS':
        return renderSuccess();
      default:
        return renderAccountSelection();
    }
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={step === 'PROCESSING' ? undefined : onDismiss}
        contentContainerStyle={styles.modal}
        dismissable={step !== 'PROCESSING'}
      >
        <Surface style={styles.container} elevation={3}>
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
      <ActivityIndicator size={16} color={theme.colors.primary} />
    ) : (
      <MaterialCommunityIcons name="circle-outline" size={16} color={theme.colors.onSurfaceVariant} />
    )}
    <Text variant="bodySmall" style={styles.processingStepLabel}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  modal: {
    margin: spacing.md,
  },
  container: {
    borderRadius: 16,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  stepContainer: {
    padding: spacing.lg,
  },
  stepIcon: {
    alignSelf: 'center',
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
  accountsList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  accountCard: {
    borderRadius: 12,
  },
  accountContent: {
    padding: spacing.md,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  accountInfo: {
    flex: 1,
  },
  bankName: {
    fontWeight: '600',
  },
  accountName: {
    opacity: 0.8,
  },
  accountDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  accountLabel: {
    opacity: 0.7,
  },
  accountNumber: {
    fontFamily: 'monospace',
  },
  cancelButton: {
    alignSelf: 'center',
  },
  selectedAccountCard: {
    borderRadius: 12,
    marginBottom: spacing.md,
    backgroundColor: theme.colors.primaryContainer,
  },
  selectedAccountTitle: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  selectedAccountInfo: {
    gap: spacing.xs,
  },
  amountCard: {
    borderRadius: 12,
    marginBottom: spacing.md,
    backgroundColor: theme.colors.tertiaryContainer,
  },
  amountContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  transferAmount: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  referenceInput: {
    marginBottom: spacing.lg,
  },
  uploadSection: {
    marginBottom: spacing.lg,
  },
  uploadTitle: {
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  fileCard: {
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  fileContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
  },
  fileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  fileDetails: {
    flex: 1,
  },
  fileName: {
    fontWeight: '500',
  },
  fileSize: {
    opacity: 0.7,
  },
  uploadButton: {
    marginBottom: spacing.sm,
  },
  uploadHint: {
    textAlign: 'center',
    opacity: 0.7,
  },
  instructionsCard: {
    borderRadius: 12,
    marginBottom: spacing.lg,
    backgroundColor: theme.colors.surfaceVariant,
  },
  instructionsTitle: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  instructionsList: {
    gap: spacing.xs,
  },
  instruction: {
    opacity: 0.8,
    lineHeight: 16,
  },
  uploadActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
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
  successCard: {
    borderRadius: 12,
    marginVertical: spacing.lg,
    backgroundColor: theme.colors.surfaceVariant,
  },
  nextSteps: {
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  nextStep: {
    opacity: 0.8,
    lineHeight: 16,
  },
  successButton: {
    alignSelf: 'center',
    paddingHorizontal: spacing.xl,
  },
});
