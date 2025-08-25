import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, Pressable } from 'react-native';
import {
    Button,
    Card,
    Divider,
    Surface,
    Text,
    TextInput
} from '../../compat/paper';
import { paymentService } from '../../services/paymentService';
import { useBookingStore } from '../../stores/bookingStore';
import { colors, spacing, theme } from '../../theme/theme';
import { OwnerBankAccount, PaymentMethod } from '../../types';
import { BankTransferModal } from '../payment/BankTransferModal';
import { CardPaymentModal } from '../payment/CardPaymentModal';

export const PaymentStep: React.FC = () => {
  const {
    selectedPaymentMethod,
    pricing,
    schedule,
    passengers,
    setPaymentMethod,
  } = useBookingStore();

  const [bankTransferDetails, setBankTransferDetails] = useState({
    selectedAccount: '',
    reference: '',
  });

  // Payment modal states
  const [showCardModal, setShowCardModal] = useState(false);
  const [showBankTransferModal, setShowBankTransferModal] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<OwnerBankAccount[]>([]);
  const [loading, setLoading] = useState(false);

  const loadBankAccounts = useCallback(async () => {
    if (!schedule) return;
    
    try {
      setLoading(true);
      const result = await paymentService.getBankAccounts(schedule.owner_id);
      if (result.success) {
        setBankAccounts(result.data || []);
      }
    } catch (error) {
      console.error('Failed to load bank accounts:', error);
    } finally {
      setLoading(false);
    }
  }, [schedule]);

  // Load bank accounts when bank transfer is selected
  useEffect(() => {
    if (selectedPaymentMethod === 'BANK_TRANSFER' && schedule) {
      loadBankAccounts();
    }
  }, [selectedPaymentMethod, schedule, loadBankAccounts]);

  const handlePaymentMethodSelect = (method: PaymentMethod) => {
    setPaymentMethod(method);
    
    // Show appropriate modal for certain payment methods
    if (method === 'CARD_BML') {
      setShowCardModal(true);
    } else if (method === 'BANK_TRANSFER') {
      setShowBankTransferModal(true);
    }
  };

  const paymentMethods: {
    method: PaymentMethod;
    title: string;
    description: string;
    icon: string;
    available: boolean;
    processingFee?: number;
  }[] = [
    {
      method: 'CASH',
      title: 'Cash at Counter',
      description: 'Pay in cash when you collect your tickets',
      icon: 'cash',
      available: true,
    },
    {
      method: 'CARD_BML',
      title: 'Credit/Debit Card',
      description: 'Pay securely with BML Payment Gateway',
      icon: 'credit-card',
      available: true,
      processingFee: 5.00,
    },
    {
      method: 'BANK_TRANSFER',
      title: 'Bank Transfer',
      description: 'Transfer to our bank account and upload receipt',
      icon: 'bank-transfer',
      available: true,
    },
  ];

  const calculateTotal = (method: PaymentMethod) => {
    if (!pricing) return 0;
    
    const baseTotal = pricing.total;
    const processingFee = paymentMethods.find(pm => pm.method === method)?.processingFee || 0;
    
    return baseTotal + processingFee;
  };

  const renderPaymentMethodOption = (paymentOption: typeof paymentMethods[0]) => {
    const isSelected = selectedPaymentMethod === paymentOption.method;
    const total = calculateTotal(paymentOption.method);
    
    return (
      <Card 
        key={paymentOption.method}
        style={[
          styles.paymentCard,
          isSelected && styles.selectedPaymentCard
        ]}
        onPress={() => handlePaymentMethodSelect(paymentOption.method)}
      >
        <Card.Content style={styles.paymentContent}>
          <View style={styles.paymentHeader}>
            <View style={styles.paymentInfo}>
              <MaterialCommunityIcons 
                name={paymentOption.icon as any}
                size={24} 
                color={isSelected ? theme.colors.primary : theme.colors.onSurface}
              />
              <View style={styles.paymentText}>
                <Text 
                  variant="titleSmall" 
                  style={[
                    styles.paymentTitle,
                    isSelected && { color: theme.colors.primary }
                  ]}
                >
                  {paymentOption.title}
                </Text>
                <Text variant="bodySmall" style={styles.paymentDescription}>
                  {paymentOption.description}
                </Text>
              </View>
            </View>
            
            <View style={styles.paymentRight}>
              {paymentOption.processingFee && (
                <Text variant="bodySmall" style={styles.processingFee}>
                  +{pricing?.currency} {paymentOption.processingFee.toFixed(2)} fee
                </Text>
              )}
              <Text variant="titleMedium" style={styles.paymentTotal}>
                {pricing?.currency} {total.toFixed(2)}
              </Text>
              <Pressable onPress={() => handlePaymentMethodSelect(paymentOption.method)}>
                <MaterialCommunityIcons
                  name={isSelected ? 'radiobox-marked' : 'radiobox-blank'}
                  size={20}
                  color={isSelected ? theme.colors.primary : theme.colors.onSurfaceVariant}
                />
              </Pressable>
            </View>
          </View>
          
          {/* Action Buttons for Special Payment Methods */}
          {isSelected && (paymentOption.method === 'CARD_BML' || paymentOption.method === 'BANK_TRANSFER') && (
            <View style={styles.paymentActions}>
              <Divider style={styles.actionDivider} />
              {paymentOption.method === 'CARD_BML' && (
                <Button
                  mode="contained"
                  onPress={() => setShowCardModal(true)}
                  style={styles.actionButton}
                >
                  Pay with Card
                </Button>
              )}
              {paymentOption.method === 'BANK_TRANSFER' && (
                <Button
                  mode="contained"
                  onPress={() => setShowBankTransferModal(true)}
                  style={styles.actionButton}
                  disabled={loading}
                >
                  Upload Receipt
                </Button>
              )}
            </View>
          )}
          
          {isSelected && renderPaymentDetails(paymentOption.method)}
        </Card.Content>
      </Card>
    );
  };

  const renderPaymentDetails = (method: PaymentMethod) => {
    switch (method) {
      case 'CASH':
        return renderCashDetails();
      case 'CARD_BML':
        return renderCardDetails();
      case 'BANK_TRANSFER':
        return renderBankTransferDetails();
      default:
        return null;
    }
  };

  const renderCashDetails = () => (
    <View style={styles.paymentDetails}>
      <Divider style={styles.detailsDivider} />
      <View style={styles.cashDetails}>
        <View style={styles.cashInfo}>
          <MaterialCommunityIcons 
            name="information" 
            size={16} 
            color={theme.colors.primary} 
          />
          <Text variant="bodySmall" style={styles.cashText}>
            Your booking will be held for 2 hours. Please visit our counter to complete payment.
          </Text>
        </View>
        
        <View style={styles.cashInstructions}>
          <Text variant="bodySmall" style={styles.instructionText}>
            • Bring exact change if possible
          </Text>
          <Text variant="bodySmall" style={styles.instructionText}>
            • Counter opens 30 minutes before departure
          </Text>
          <Text variant="bodySmall" style={styles.instructionText}>
            • Booking reference will be sent via SMS
          </Text>
        </View>
      </View>
    </View>
  );

  const renderCardDetails = () => (
    <View style={styles.paymentDetails}>
      <Divider style={styles.detailsDivider} />
      <View style={styles.cardDetails}>
        <View style={styles.cardSecurity}>
          <MaterialCommunityIcons 
            name="shield-check" 
            size={16} 
            color={colors.success} 
          />
          <Text variant="bodySmall" style={styles.securityText}>
            Secure payment powered by BML Payment Gateway
          </Text>
        </View>
        
        <View style={styles.cardFeatures}>
          <Text variant="bodySmall" style={styles.featureText}>
            • 3D Secure authentication
          </Text>
          <Text variant="bodySmall" style={styles.featureText}>
            • Instant confirmation
          </Text>
          <Text variant="bodySmall" style={styles.featureText}>
            • Tickets sent immediately via SMS
          </Text>
        </View>
        
        <Text variant="bodySmall" style={styles.processingNote}>
          Processing fee: {pricing?.currency} 5.00
        </Text>
      </View>
    </View>
  );

  const renderBankTransferDetails = () => (
    <View style={styles.paymentDetails}>
      <Divider style={styles.detailsDivider} />
      <View style={styles.bankTransferDetails}>
        <Text variant="titleSmall" style={styles.bankTransferTitle}>
          Select Bank Account
        </Text>
        
        {bankAccounts.map((account) => (
          <Pressable key={account.id} style={styles.bankAccountOption} onPress={() => setBankTransferDetails({ ...bankTransferDetails, selectedAccount: account.id })}>
            <View style={styles.bankAccountInfo}>
              <Text variant="bodyMedium" style={styles.bankName}>
                {account.bank_name}
              </Text>
              <Text variant="bodySmall" style={styles.accountDetails}>
                {account.account_name}
              </Text>
              <Text variant="bodySmall" style={styles.accountNumber}>
                Account: {account.account_no}
              </Text>
            </View>
            <MaterialCommunityIcons
              name={bankTransferDetails.selectedAccount === account.id ? 'radiobox-marked' : 'radiobox-blank'}
              size={20}
              color={bankTransferDetails.selectedAccount === account.id ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
          </Pressable>
        ))}
        
        <TextInput
          label="Transfer Reference (Optional)"
          value={bankTransferDetails.reference}
          onChangeText={(text) => setBankTransferDetails({
            ...bankTransferDetails,
            reference: text
          })}
          mode="outlined"
          placeholder="Enter any reference from your transfer"
          style={styles.referenceInput}
        />
        
        <View style={styles.transferInstructions}>
          <Text variant="bodySmall" style={styles.instructionTitle}>
            Transfer Instructions:
          </Text>
          <Text variant="bodySmall" style={styles.instructionText}>
            1. Transfer the exact amount to the selected account
          </Text>
          <Text variant="bodySmall" style={styles.instructionText}>
            2. Upload your transfer receipt in the next step
          </Text>
          <Text variant="bodySmall" style={styles.instructionText}>
            3. Your booking will be confirmed after verification
          </Text>
        </View>
      </View>
    </View>
  );

  const renderPricingBreakdown = () => {
    if (!pricing || !selectedPaymentMethod) return null;
    
    const processingFee = paymentMethods.find(pm => pm.method === selectedPaymentMethod)?.processingFee || 0;
    const finalTotal = pricing.total + processingFee;
    
    return (
      <Surface style={styles.pricingBreakdown} elevation={1}>
        <Text variant="titleMedium" style={styles.breakdownTitle}>
          Payment Summary
        </Text>
        
        <View style={styles.breakdownDetails}>
          <View style={styles.breakdownRow}>
            <Text variant="bodyMedium">Subtotal</Text>
            <Text variant="bodyMedium">
              {pricing.currency} {pricing.subtotal.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.breakdownRow}>
            <Text variant="bodyMedium">Tax</Text>
            <Text variant="bodyMedium">
              {pricing.currency} {pricing.tax.toFixed(2)}
            </Text>
          </View>
          
          {processingFee > 0 && (
            <View style={styles.breakdownRow}>
              <Text variant="bodyMedium">Processing Fee</Text>
              <Text variant="bodyMedium">
                {pricing.currency} {processingFee.toFixed(2)}
              </Text>
            </View>
          )}
          
          <Divider style={styles.breakdownDivider} />
          
          <View style={[styles.breakdownRow, styles.totalRow]}>
            <Text variant="titleMedium" style={styles.totalLabel}>
              Total Amount
            </Text>
            <Text variant="titleLarge" style={styles.totalAmount}>
              {pricing.currency} {finalTotal.toFixed(2)}
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <Text variant="titleLarge" style={styles.title}>
          Choose Payment Method
        </Text>
        
        <View style={styles.paymentMethods}>
          {paymentMethods.filter(pm => pm.available).map(renderPaymentMethodOption)}
        </View>
        
        {renderPricingBreakdown()}
        
        <View style={styles.bottomSpacing} />
      </ScrollView>
      
      {/* Payment Modals */}
      {schedule && (
        <>
          <CardPaymentModal
            visible={showCardModal}
            booking={{
              id: 'temp-booking-id',
              total: pricing?.total || 0,
              currency: pricing?.currency || 'MVR',
              owner_id: schedule.owner_id,
            } as any}
            customerData={{
              name: passengers[0]?.name || '',
              phone: passengers[0]?.phone || '',
            }}
            onDismiss={() => setShowCardModal(false)}
            onSuccess={() => setShowCardModal(false)}
            onError={() => setShowCardModal(false)}
          />
          
          <BankTransferModal
            visible={showBankTransferModal}
            booking={{
              id: 'temp-booking-id',
              total: pricing?.total || 0,
              currency: pricing?.currency || 'MVR',
              owner_id: schedule.owner_id,
            } as any}
            bankAccounts={bankAccounts}
            onDismiss={() => setShowBankTransferModal(false)}
            onSuccess={() => setShowBankTransferModal(false)}
            onError={() => setShowBankTransferModal(false)}
          />
        </>
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  paymentMethods: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  paymentCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedPaymentCard: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryContainer,
  },
  paymentContent: {
    padding: spacing.sm,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  paymentText: {
    flex: 1,
  },
  paymentTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  paymentDescription: {
    opacity: 0.7,
    lineHeight: 16,
  },
  paymentRight: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  processingFee: {
    color: theme.colors.primary,
    fontSize: 10,
  },
  paymentTotal: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  paymentDetails: {
    marginTop: spacing.md,
  },
  detailsDivider: {
    marginBottom: spacing.md,
  },
  cashDetails: {
    gap: spacing.sm,
  },
  cashInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
  },
  cashText: {
    flex: 1,
    lineHeight: 16,
  },
  cashInstructions: {
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  instructionText: {
    opacity: 0.8,
    lineHeight: 16,
  },
  cardDetails: {
    gap: spacing.sm,
  },
  cardSecurity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  securityText: {
    color: colors.success,
    fontWeight: '500',
  },
  cardFeatures: {
    gap: spacing.xs,
    paddingLeft: spacing.sm,
  },
  featureText: {
    opacity: 0.8,
    lineHeight: 16,
  },
  processingNote: {
    fontStyle: 'italic',
    opacity: 0.7,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  bankTransferDetails: {
    gap: spacing.md,
  },
  bankTransferTitle: {
    fontWeight: '600',
  },
  bankAccountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  bankAccountInfo: {
    flex: 1,
  },
  bankName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  accountDetails: {
    opacity: 0.8,
  },
  accountNumber: {
    opacity: 0.6,
    fontFamily: 'monospace',
  },
  referenceInput: {
    backgroundColor: theme.colors.surface,
  },
  transferInstructions: {
    gap: spacing.xs,
    padding: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
  },
  instructionTitle: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  pricingBreakdown: {
    borderRadius: 12,
    padding: spacing.md,
  },
  breakdownTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  breakdownDetails: {
    gap: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  breakdownDivider: {
    marginVertical: spacing.sm,
  },
  totalRow: {
    paddingTop: spacing.sm,
  },
  totalLabel: {
    fontWeight: 'bold',
  },
  totalAmount: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  bottomSpacing: {
    height: spacing.xl,
  },
  // New styles for payment actions
  paymentActions: {
    marginTop: spacing.md,
  },
  actionDivider: {
    marginBottom: spacing.md,
  },
  actionButton: {
    borderRadius: 8,
  },
});
