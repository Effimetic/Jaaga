import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import {
    Button,
    Card,
    Chip,
    RadioButton,
    Surface,
    Text,
} from 'react-native-paper';
import { useBookingStore } from '../../stores/bookingStore';
import { spacing, theme } from '../../theme/theme';

export const TripDetailsStep: React.FC = () => {
  const {
    schedule,
    segmentKey,
    ticketTypes,
    selectedTicketType,
    passengerCount,
    setTicketType,
    setPassengerCount,
    setPricing,
  } = useBookingStore();

  useEffect(() => {
    // Set default ticket type if not selected
    if (ticketTypes.length > 0 && !selectedTicketType) {
      setTicketType(ticketTypes[0]);
    }
  }, [ticketTypes, selectedTicketType, setTicketType]);

  useEffect(() => {
    // Calculate pricing when selections change
    if (selectedTicketType && passengerCount > 0) {
      calculatePricing();
    }
  }, [selectedTicketType, passengerCount]);

  const calculatePricing = () => {
    if (!selectedTicketType) return;

    const unitPrice = selectedTicketType.base_price;
    const subtotal = unitPrice * passengerCount;
    const taxRate = 0.10; // 10% tax rate (should come from tax config)
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    setPricing({
      subtotal,
      tax,
      total,
      currency: selectedTicketType.currency,
      items: [{
        ticket_type_id: selectedTicketType.id,
        quantity: passengerCount,
        unit_price: unitPrice,
        tax: tax,
        total: total,
      }],
    });
  };

  const renderTripInfo = () => {
    if (!schedule) return null;

    const departureTime = format(new Date(schedule.start_at), 'HH:mm');
    const departureDate = format(new Date(schedule.start_at), 'EEE, MMM d');

    return (
      <Card style={styles.tripCard}>
        <Card.Content>
          <View style={styles.tripHeader}>
            <View style={styles.tripRoute}>
              <MaterialCommunityIcons 
                name="ferry" 
                size={24} 
                color={theme.colors.primary} 
              />
              <Text variant="titleMedium" style={styles.boatName}>
                {schedule.boat.name}
              </Text>
            </View>
            <Chip mode="outlined" compact>
              {schedule.boat.seat_mode}
            </Chip>
          </View>

          <View style={styles.tripDetails}>
            <View style={styles.tripDetailRow}>
              <MaterialCommunityIcons 
                name="domain" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text variant="bodyMedium">{schedule.owner.brand_name}</Text>
            </View>

            <View style={styles.tripDetailRow}>
              <MaterialCommunityIcons 
                name="clock-outline" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text variant="bodyMedium">
                {departureTime} • {departureDate}
              </Text>
            </View>

            <View style={styles.tripDetailRow}>
              <MaterialCommunityIcons 
                name="seat" 
                size={16} 
                color={theme.colors.onSurfaceVariant} 
              />
              <Text variant="bodyMedium">
                {schedule.available_seats} seats available
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

  const renderTicketTypeSelection = () => {
    if (ticketTypes.length === 0) return null;

    return (
      <Surface style={styles.section} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Select Ticket Type
        </Text>
        
        <RadioButton.Group
          onValueChange={(value) => {
            const ticketType = ticketTypes.find(t => t.id === value);
            if (ticketType) setTicketType(ticketType);
          }}
          value={selectedTicketType?.id || ''}
        >
          {ticketTypes.map((ticketType) => (
            <View key={ticketType.id} style={styles.ticketTypeOption}>
              <View style={styles.ticketTypeContent}>
                <View style={styles.ticketTypeInfo}>
                  <Text variant="titleSmall" style={styles.ticketTypeName}>
                    {ticketType.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.ticketTypeCode}>
                    {ticketType.code}
                  </Text>
                </View>
                <View style={styles.ticketTypePrice}>
                  <Text variant="titleMedium" style={styles.priceText}>
                    {ticketType.currency} {ticketType.base_price.toFixed(2)}
                  </Text>
                  <Text variant="bodySmall" style={styles.priceLabel}>
                    per person
                  </Text>
                </View>
              </View>
              <RadioButton value={ticketType.id} />
            </View>
          ))}
        </RadioButton.Group>
      </Surface>
    );
  };

  const renderPassengerCountSelection = () => {
    const maxPassengers = Math.min(schedule?.available_seats || 10, 10);

    return (
      <Surface style={styles.section} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Number of Passengers
        </Text>
        
        <View style={styles.passengerCountContainer}>
          {Array.from({ length: maxPassengers }, (_, i) => i + 1).map((count) => (
            <Button
              key={count}
              mode={passengerCount === count ? 'contained' : 'outlined'}
              onPress={() => setPassengerCount(count)}
              style={styles.passengerCountButton}
              compact
            >
              {count}
            </Button>
          ))}
        </View>
      </Surface>
    );
  };

  const renderPricingSummary = () => {
    if (!selectedTicketType || passengerCount === 0) return null;

    const unitPrice = selectedTicketType.base_price;
    const subtotal = unitPrice * passengerCount;
    const taxRate = 0.10;
    const tax = subtotal * taxRate;
    const total = subtotal + tax;

    return (
      <Surface style={styles.section} elevation={1}>
        <Text variant="titleMedium" style={styles.sectionTitle}>
          Price Breakdown
        </Text>
        
        <View style={styles.pricingDetails}>
          <View style={styles.pricingRow}>
            <Text variant="bodyMedium">
              {selectedTicketType.name} × {passengerCount}
            </Text>
            <Text variant="bodyMedium">
              {selectedTicketType.currency} {subtotal.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.pricingRow}>
            <Text variant="bodyMedium">Tax (10%)</Text>
            <Text variant="bodyMedium">
              {selectedTicketType.currency} {tax.toFixed(2)}
            </Text>
          </View>
          
          <View style={styles.pricingDivider} />
          
          <View style={[styles.pricingRow, styles.totalRow]}>
            <Text variant="titleMedium" style={styles.totalLabel}>
              Total
            </Text>
            <Text variant="titleMedium" style={styles.totalAmount}>
              {selectedTicketType.currency} {total.toFixed(2)}
            </Text>
          </View>
        </View>
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      {renderTripInfo()}
      {renderTicketTypeSelection()}
      {renderPassengerCountSelection()}
      {renderPricingSummary()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  tripCard: {
    borderRadius: 12,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  tripRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  boatName: {
    fontWeight: '600',
    flex: 1,
  },
  tripDetails: {
    gap: spacing.sm,
  },
  tripDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  section: {
    borderRadius: 12,
    padding: spacing.md,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  ticketTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  ticketTypeContent: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketTypeInfo: {
    flex: 1,
  },
  ticketTypeName: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  ticketTypeCode: {
    opacity: 0.7,
  },
  ticketTypePrice: {
    alignItems: 'flex-end',
  },
  priceText: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  priceLabel: {
    opacity: 0.7,
  },
  passengerCountContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  passengerCountButton: {
    minWidth: 48,
  },
  pricingDetails: {
    gap: spacing.sm,
  },
  pricingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pricingDivider: {
    height: 1,
    backgroundColor: theme.colors.outline,
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
    fontSize: 18,
  },
});
