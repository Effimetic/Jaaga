import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import {
    Button,
    Card,
    Chip,
    Surface,
    Switch,
    Text,
    TextInput,
} from 'react-native-paper';
import { useAuth } from '../../contexts/AuthContext';
import { useBookingStore } from '../../stores/bookingStore';
import { spacing, theme } from '../../theme/theme';
import { PassengerInfo } from '../../types';

export const PassengerInfoStep: React.FC = () => {
  const { user } = useAuth();
  const {
    passengerCount,
    passengers,
    selectedSeats,
    schedule,
    updatePassenger,
    setPassengers,
  } = useBookingStore();

  const [useAccountInfo, setUseAccountInfo] = React.useState(false);

  useEffect(() => {
    // Initialize passengers array if empty
    if (passengers.length !== passengerCount) {
      const newPassengers: PassengerInfo[] = Array.from({ length: passengerCount }, (_, index) => ({
        name: '',
        phone: '',
        seat_id: selectedSeats[index] || undefined,
      }));
      setPassengers(newPassengers);
    }
  }, [passengerCount, passengers.length, selectedSeats, setPassengers]);

  useEffect(() => {
    // Update seat assignments when seats change
    const updatedPassengers = passengers.map((passenger, index) => ({
      ...passenger,
      seat_id: selectedSeats[index] || undefined,
    }));
    setPassengers(updatedPassengers);
  }, [selectedSeats]);

  const handleUseAccountInfo = (value: boolean) => {
    setUseAccountInfo(value);
    
    if (value && user && passengers.length > 0) {
      // Fill first passenger with user's info
      const updatedPassenger: PassengerInfo = {
        name: 'Account Holder', // Would typically come from user profile
        phone: user.phone,
        seat_id: passengers[0].seat_id,
      };
      updatePassenger(0, updatedPassenger);
    }
  };

  const validatePhoneNumber = (phone: string): boolean => {
    if (!phone) return true; // Phone is optional
    
    // Maldives phone number validation
    const phoneRegex = /^(\+960|960)?[79]\d{6}$/;
    return phoneRegex.test(phone.replace(/\s+/g, ''));
  };

  const formatPhoneNumber = (phone: string): string => {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, '');
    
    // Format as +960 XXX-XXXX
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

  const renderPassengerForm = (passenger: PassengerInfo, index: number) => {
    const isFirstPassenger = index === 0;
    const hasAssignedSeat = schedule?.boat.seat_mode === 'SEATMAP' && passenger.seat_id;
    
    return (
      <Card key={index} style={styles.passengerCard}>
        <Card.Content>
          <View style={styles.passengerHeader}>
            <View style={styles.passengerTitle}>
              <MaterialCommunityIcons 
                name="account" 
                size={20} 
                color={theme.colors.primary} 
              />
              <Text variant="titleMedium" style={styles.passengerLabel}>
                Passenger {index + 1}
                {isFirstPassenger && ' (Main Contact)'}
              </Text>
            </View>
            
            {hasAssignedSeat && (
              <Chip mode="outlined" compact icon="seat">
                Seat {passenger.seat_id}
              </Chip>
            )}
          </View>

          <View style={styles.formFields}>
            <TextInput
              label="Full Name *"
              value={passenger.name}
              onChangeText={(text) => updatePassenger(index, { ...passenger, name: text })}
              mode="outlined"
              placeholder="Enter passenger's full name"
              style={styles.input}
              error={!passenger.name.trim()}
              left={<TextInput.Icon icon="account-outline" />}
            />

            <TextInput
              label={`Phone Number ${isFirstPassenger ? '(Required)' : '(Optional)'}`}
              value={passenger.phone || ''}
              onChangeText={(text) => {
                const formatted = formatPhoneNumber(text);
                updatePassenger(index, { ...passenger, phone: formatted });
              }}
              mode="outlined"
              placeholder="+960 XXX-XXXX"
              keyboardType="phone-pad"
              style={styles.input}
              error={passenger.phone ? !validatePhoneNumber(passenger.phone) : false}
              left={<TextInput.Icon icon="phone-outline" />}
              helperText={
                passenger.phone && !validatePhoneNumber(passenger.phone) 
                  ? "Please enter a valid Maldives phone number" 
                  : undefined
              }
            />
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderAccountInfoOption = () => {
    if (!user) return null;

    return (
      <Surface style={styles.accountInfoSection} elevation={1}>
        <View style={styles.accountInfoHeader}>
          <View style={styles.accountInfoContent}>
            <MaterialCommunityIcons 
              name="account-circle" 
              size={24} 
              color={theme.colors.primary} 
            />
            <View style={styles.accountInfoText}>
              <Text variant="titleSmall">Use Account Information</Text>
              <Text variant="bodySmall" style={styles.accountInfoSubtext}>
                Fill first passenger with your account details
              </Text>
            </View>
          </View>
          <Switch
            value={useAccountInfo}
            onValueChange={handleUseAccountInfo}
          />
        </View>
        
        {useAccountInfo && (
          <View style={styles.accountInfoDetails}>
            <Text variant="bodySmall" style={styles.accountInfoNote}>
              Phone: {user.phone}
            </Text>
          </View>
        )}
      </Surface>
    );
  };

  const renderContactInfo = () => (
    <Surface style={styles.contactInfoSection} elevation={1}>
      <View style={styles.contactInfoHeader}>
        <MaterialCommunityIcons 
          name="information" 
          size={20} 
          color={theme.colors.primary} 
        />
        <Text variant="titleSmall">Important Information</Text>
      </View>
      
      <View style={styles.contactInfoContent}>
        <Text variant="bodySmall" style={styles.contactInfoText}>
          • The main contact (Passenger 1) must provide a phone number for ticket delivery
        </Text>
        <Text variant="bodySmall" style={styles.contactInfoText}>
          • All passengers must bring valid ID for boarding verification
        </Text>
        <Text variant="bodySmall" style={styles.contactInfoText}>
          • Phone numbers for other passengers are optional but recommended
        </Text>
        <Text variant="bodySmall" style={styles.contactInfoText}>
          • Tickets will be sent via SMS to the main contact's phone number
        </Text>
      </View>
    </Surface>
  );

  const renderQuickFill = () => (
    <Surface style={styles.quickFillSection} elevation={1}>
      <Text variant="titleSmall" style={styles.quickFillTitle}>
        Quick Fill Options
      </Text>
      
      <View style={styles.quickFillButtons}>
        <Button
          mode="outlined"
          onPress={() => {
            // Fill all passengers with generic names
            const updatedPassengers = passengers.map((passenger, index) => ({
              ...passenger,
              name: passenger.name || `Passenger ${index + 1}`,
            }));
            setPassengers(updatedPassengers);
          }}
          style={styles.quickFillButton}
          compact
        >
          Fill Names
        </Button>
        
        <Button
          mode="outlined"
          onPress={() => {
            // Clear all passenger info
            const clearedPassengers = passengers.map(passenger => ({
              ...passenger,
              name: '',
              phone: '',
            }));
            setPassengers(clearedPassengers);
          }}
          style={styles.quickFillButton}
          compact
        >
          Clear All
        </Button>
      </View>
    </Surface>
  );

  const mainContactHasPhone = passengers[0]?.phone && validatePhoneNumber(passengers[0].phone);
  const allNamesProvided = passengers.every(p => p.name.trim());

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderAccountInfoOption()}
      {renderQuickFill()}
      
      <View style={styles.passengersContainer}>
        {passengers.map((passenger, index) => renderPassengerForm(passenger, index))}
      </View>
      
      {renderContactInfo()}
      
      {/* Validation Summary */}
      <Surface style={styles.validationSection} elevation={1}>
        <Text variant="titleSmall" style={styles.validationTitle}>
          Completion Status
        </Text>
        
        <View style={styles.validationItems}>
          <View style={styles.validationItem}>
            <MaterialCommunityIcons 
              name={allNamesProvided ? "check-circle" : "clock-outline"} 
              size={16} 
              color={allNamesProvided ? theme.colors.primary : theme.colors.onSurfaceVariant} 
            />
            <Text variant="bodySmall" style={styles.validationText}>
              All passenger names provided
            </Text>
          </View>
          
          <View style={styles.validationItem}>
            <MaterialCommunityIcons 
              name={mainContactHasPhone ? "check-circle" : "clock-outline"} 
              size={16} 
              color={mainContactHasPhone ? theme.colors.primary : theme.colors.onSurfaceVariant} 
            />
            <Text variant="bodySmall" style={styles.validationText}>
              Main contact phone number provided
            </Text>
          </View>
        </View>
      </Surface>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.md,
  },
  accountInfoSection: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  accountInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  accountInfoText: {
    flex: 1,
  },
  accountInfoSubtext: {
    opacity: 0.7,
  },
  accountInfoDetails: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  accountInfoNote: {
    opacity: 0.7,
  },
  quickFillSection: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  quickFillTitle: {
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  quickFillButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  quickFillButton: {
    flex: 1,
  },
  passengersContainer: {
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  passengerCard: {
    borderRadius: 12,
  },
  passengerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  passengerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  passengerLabel: {
    fontWeight: '600',
  },
  formFields: {
    gap: spacing.md,
  },
  input: {
    backgroundColor: theme.colors.surface,
  },
  contactInfoSection: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.md,
    backgroundColor: theme.colors.primaryContainer,
  },
  contactInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  contactInfoContent: {
    gap: spacing.xs,
  },
  contactInfoText: {
    color: theme.colors.onPrimaryContainer,
    lineHeight: 16,
  },
  validationSection: {
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.xl,
  },
  validationTitle: {
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  validationItems: {
    gap: spacing.sm,
  },
  validationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  validationText: {
    flex: 1,
  },
});
