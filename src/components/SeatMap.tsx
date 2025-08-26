import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { Surface, Text } from '../compat/paper';
import { colors, spacing, theme } from '../theme/theme';
import { Seat, SeatMap as SeatMapType } from '../types';

interface SeatMapProps {
  seatMap: SeatMapType;
  selectedSeats: string[];
  onSeatSelect: (seatId: string) => void;
  maxSeats: number;
  occupiedSeats: string[];
}

export const SeatMapComponent: React.FC<SeatMapProps> = ({
  seatMap,
  selectedSeats,
  onSeatSelect,
  maxSeats,
  occupiedSeats,
}) => {
  const getSeatStatus = (seat: Seat): 'available' | 'selected' | 'occupied' | 'disabled' => {
    if (occupiedSeats.includes(seat.id)) return 'occupied';
    if (!seat.available || seat.type === 'disabled') return 'disabled';
    if (selectedSeats.includes(seat.id)) return 'selected';
    return 'available';
  };

  const getSeatColor = (status: string) => {
    switch (status) {
      case 'available':
        return colors.available;
      case 'selected':
        return colors.primary;
      case 'occupied':
        return colors.booked;
      case 'disabled':
        return colors.cancelled;
      default:
        return theme.colors.surfaceVariant;
    }
  };

  const getSeatIcon = (seat: Seat, status: string) => {
    if (status === 'occupied') return 'close';
    if (status === 'selected') return 'check';
    if (seat.type === 'walkway') return 'minus';
    if (seat.type === 'disabled') return 'close';
    return 'account';
  };

  const handleSeatPress = (seat: Seat) => {
    const status = getSeatStatus(seat);
    
    if (status === 'occupied' || status === 'disabled') return;
    
    if (status === 'selected') {
      // Deselect seat
      onSeatSelect(seat.id);
    } else if (selectedSeats.length < maxSeats) {
      // Select seat if under limit
      onSeatSelect(seat.id);
    }
  };

  const renderSeat = (seat: Seat) => {
    const status = getSeatStatus(seat);
    const color = getSeatColor(status);
    const icon = getSeatIcon(seat, status);
    const disabled = status === 'occupied' || status === 'disabled' || 
                    (status === 'available' && selectedSeats.length >= maxSeats);

    return (
      <TouchableOpacity
        key={seat.id}
        style={[
          styles.seat,
          { backgroundColor: color },
          disabled && styles.disabledSeat,
          seat.type === 'walkway' && styles.walkwaySeat,
        ]}
        onPress={() => handleSeatPress(seat)}
        disabled={disabled}
        accessibilityLabel={`Seat ${seat.id}, ${status}`}
        accessibilityRole="button"
      >
        <MaterialCommunityIcons
          name={icon}
          size={16}
          color={status === 'available' ? theme.colors.onSurface : '#ffffff'}
        />
        <Text 
          style={[
            styles.seatText,
            { color: status === 'available' ? theme.colors.onSurface : '#ffffff' }
          ]}
          variant="bodySmall"
        >
          {seat.id}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderRow = (rowIndex: number) => {
    const rowSeats = seatMap.seats.filter(seat => seat.row === rowIndex);
    
    return (
      <View key={rowIndex} style={styles.seatRow}>
        <Text style={styles.rowLabel} variant="bodySmall">
          {String.fromCharCode(65 + rowIndex)}
        </Text>
        <View style={styles.seatsContainer}>
          {rowSeats
            .sort((a, b) => a.column - b.column)
            .map(renderSeat)
          }
        </View>
      </View>
    );
  };

  return (
    <Surface style={styles.container} elevation={1}>
      <View style={styles.header}>
        <Text variant="titleMedium" style={styles.title}>
          Select Your Seats
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          {selectedSeats.length} of {maxSeats} selected
        </Text>
      </View>

      <View style={styles.legend}>
        <LegendItem color={colors.available} label="Available" icon="account" />
        <LegendItem color={colors.primary} label="Selected" icon="check" />
        <LegendItem color={colors.booked} label="Occupied" icon="close" />
        <LegendItem color="#FFD700" label="Premium" icon="star" />
      </View>

      <View style={styles.boat}>
        <View style={styles.boatFront}>
          <MaterialCommunityIcons name="ferry" size={24} color={theme.colors.primary} />
          <Text variant="bodySmall">Front</Text>
        </View>
        
        <View style={styles.seatMap}>
          {Array.from({ length: seatMap.rows }, (_, i) => renderRow(i))}
        </View>

        <View style={styles.boatBack}>
          <Text variant="bodySmall">Back</Text>
        </View>
      </View>
    </Surface>
  );
};

interface LegendItemProps {
  color: string;
  label: string;
  icon: string;
}

const LegendItem: React.FC<LegendItemProps> = ({ color, label, icon }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendColor, { backgroundColor: color }]}>
      <MaterialCommunityIcons name={icon as any} size={12} color="#ffffff" />
    </View>
    <Text variant="bodySmall" style={styles.legendLabel}>
      {label}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: spacing.md,
    margin: spacing.sm,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  subtitle: {
    opacity: 0.7,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
  },
  legendItem: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendColor: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendLabel: {
    fontSize: 10,
  },
  boat: {
    alignItems: 'center',
  },
  boatFront: {
    alignItems: 'center',
    marginBottom: spacing.md,
    padding: spacing.sm,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 20,
    minWidth: 80,
  },
  boatBack: {
    alignItems: 'center',
    marginTop: spacing.md,
    padding: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    minWidth: 60,
  },
  seatMap: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  rowLabel: {
    minWidth: 20,
    textAlign: 'center',
    fontWeight: '600',
    color: theme.colors.primary,
  },
  seatsContainer: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  seat: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 1,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  walkwaySeat: {
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  disabledSeat: {
    opacity: 0.5,
  },
  seatText: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
});
