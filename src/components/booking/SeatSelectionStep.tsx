import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import {
    Button,
    Chip,
    Surface,
    Text
} from '../../compat/paper';
import { useBookingStore } from '../../stores/bookingStore';
import { colors, spacing, theme } from '../../theme/theme';
import { Seat, SeatMap } from '../../types';
import { SeatMapComponent } from '../SeatMap';

export const SeatSelectionStep: React.FC = () => {
  const {
    schedule,
    seatMap,
    selectedSeats,
    passengerCount,
    occupiedSeats,
    toggleSeat,
    setSelectedSeats,
  } = useBookingStore();

  // Generate a default seat map if none exists
  const getDefaultSeatMap = (): SeatMap => {
    const rows = 8;
    const columns = 6;
    const seats: Seat[] = [];

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < columns; col++) {
        // Skip middle columns for aisle
        if (col === 2 || col === 3) continue;
        
        const seatId = `${String.fromCharCode(65 + row)}${col < 2 ? col + 1 : col - 1}`;
        const isOccupied = occupiedSeats.includes(seatId);
        
        seats.push({
          id: seatId,
          row,
          column: col,
          type: 'seat',
          available: !isOccupied,
          price_multiplier: row < 2 ? 1.5 : 1.0,
        });
      }
    }

    return {
      rows,
      columns,
      seats,
      layout: Array.from({ length: rows }, (_, row) => 
        Array.from({ length: columns }, (_, col) => {
          if (col === 2 || col === 3) return '';
          return `${String.fromCharCode(65 + row)}${col < 2 ? col + 1 : col - 1}`;
        })
      ),
    };
  };

  const currentSeatMap = seatMap || getDefaultSeatMap();

  const handleAutoSelect = () => {
    if (selectedSeats.length >= passengerCount) return;

    const availableSeats = currentSeatMap.seats.filter(seat => 
      seat.available && !occupiedSeats.includes(seat.id)
    );

    // Try to find seats together in the same row
    const seatsByRow = availableSeats.reduce((acc, seat) => {
      if (!acc[seat.row]) acc[seat.row] = [];
      acc[seat.row].push(seat);
      return acc;
    }, {} as Record<number, Seat[]>);

    let selectedSeatIds: string[] = [];
    const remainingCount = passengerCount - selectedSeats.length;

    // Try to find consecutive seats in the same row
    for (const [row, rowSeats] of Object.entries(seatsByRow)) {
      if (selectedSeatIds.length >= remainingCount) break;
      
      const sortedSeats = rowSeats.sort((a, b) => a.column - b.column);
      
      for (let i = 0; i <= sortedSeats.length - remainingCount; i++) {
        const consecutiveSeats = sortedSeats.slice(i, i + remainingCount);
        
        // Check if seats are consecutive
        const isConsecutive = consecutiveSeats.every((seat, index) => 
          index === 0 || seat.column === consecutiveSeats[index - 1].column + 1
        );
        
        if (isConsecutive) {
          selectedSeatIds = consecutiveSeats.map(seat => seat.id);
          break;
        }
      }
      
      if (selectedSeatIds.length > 0) break;
    }

    // If no consecutive seats found, just pick the first available ones
    if (selectedSeatIds.length === 0) {
      selectedSeatIds = availableSeats
        .slice(0, remainingCount)
        .map(seat => seat.id);
    }

    setSelectedSeats([...selectedSeats, ...selectedSeatIds]);
  };

  const handleClearSelection = () => {
    setSelectedSeats([]);
  };

  const renderCapacityMode = () => (
    <Surface style={styles.capacityContainer} elevation={1}>
      <View style={styles.capacityHeader}>
        <MaterialCommunityIcons 
          name="seat" 
          size={32} 
          color={theme.colors.primary} 
        />
        <Text variant="headlineSmall" style={styles.capacityTitle}>
          General Seating
        </Text>
        <Text variant="bodyMedium" style={styles.capacitySubtitle}>
          Seats will be assigned automatically
        </Text>
      </View>

      <View style={styles.capacityInfo}>
        <View style={styles.capacityRow}>
          <Text variant="bodyLarge">Passengers:</Text>
          <Text variant="titleLarge" style={styles.capacityNumber}>
            {passengerCount}
          </Text>
        </View>
        
        <View style={styles.capacityRow}>
          <Text variant="bodyLarge">Available Seats:</Text>
          <Text variant="titleLarge" style={styles.availableNumber}>
            {(schedule?.available_seats || 0) - occupiedSeats.length}
          </Text>
        </View>
      </View>

      <View style={styles.capacityNote}>
        <MaterialCommunityIcons 
          name="information" 
          size={16} 
          color={theme.colors.primary} 
        />
        <Text variant="bodySmall" style={styles.noteText}>
          Seats will be assigned when you board the ferry. Please arrive 15 minutes early.
        </Text>
      </View>
    </Surface>
  );

  const renderSeatMapMode = () => (
    <View>
      <SeatMapComponent
        seatMap={currentSeatMap}
        selectedSeats={selectedSeats}
        onSeatSelect={toggleSeat}
        maxSeats={passengerCount}
        occupiedSeats={occupiedSeats}
      />

      <View style={styles.seatActions}>
        <Button
          mode="outlined"
          onPress={handleClearSelection}
          disabled={selectedSeats.length === 0}
          style={styles.actionButton}
          icon="close"
        >
          Clear Selection
        </Button>
        
        <Button
          mode="contained"
          onPress={handleAutoSelect}
          disabled={selectedSeats.length >= passengerCount}
          style={styles.actionButton}
          icon="auto-fix"
        >
          Auto Select
        </Button>
      </View>
    </View>
  );

  const renderSelectionSummary = () => {
    if (schedule?.boat.seat_mode === 'CAPACITY') return null;

    return (
      <Surface style={styles.summaryContainer} elevation={1}>
        <Text variant="titleMedium" style={styles.summaryTitle}>
          Selected Seats
        </Text>
        
        {selectedSeats.length > 0 ? (
          <View style={styles.selectedSeatsContainer}>
            {selectedSeats.map((seatId, index) => (
              <Chip
                key={seatId}
                mode="flat"
                style={styles.seatChip}
                textStyle={styles.seatChipText}
                icon="seat"
              >
                {seatId}
              </Chip>
            ))}
          </View>
        ) : (
          <Text variant="bodyMedium" style={styles.noSelectionText}>
            Please select {passengerCount} seat{passengerCount !== 1 ? 's' : ''}
          </Text>
        )}
      </Surface>
    );
  };

  return (
    <View style={styles.container}>
      {schedule?.boat.seat_mode === 'SEATMAP' ? renderSeatMapMode() : renderCapacityMode()}
      {renderSelectionSummary()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.md,
  },
  capacityContainer: {
    borderRadius: 12,
    padding: spacing.xl,
    alignItems: 'center',
  },
  capacityHeader: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  capacityTitle: {
    fontWeight: 'bold',
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  capacitySubtitle: {
    opacity: 0.7,
    textAlign: 'center',
  },
  capacityInfo: {
    width: '100%',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  capacityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.outline,
  },
  capacityNumber: {
    fontWeight: 'bold',
    color: theme.colors.primary,
  },
  availableNumber: {
    fontWeight: 'bold',
    color: colors.success,
  },
  capacityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: theme.colors.primaryContainer,
    borderRadius: 8,
  },
  noteText: {
    flex: 1,
    color: theme.colors.onPrimaryContainer,
    lineHeight: 16,
  },
  seatActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  actionButton: {
    flex: 1,
  },
  summaryContainer: {
    borderRadius: 12,
    padding: spacing.md,
  },
  summaryTitle: {
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  selectedSeatsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  seatChip: {
    backgroundColor: theme.colors.primaryContainer,
  },
  seatChipText: {
    color: theme.colors.onPrimaryContainer,
    fontWeight: '600',
  },
  noSelectionText: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
});
