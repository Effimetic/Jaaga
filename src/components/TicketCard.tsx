import { MaterialCommunityIcons } from '@expo/vector-icons';
import { format } from 'date-fns';
import React, { useState } from 'react';
import { Alert, Share, StyleSheet, View } from 'react-native';
import {
  Button,
  Card,
  Chip,
  Divider,
  IconButton,
  Modal,
  Portal,
  Surface,
  Text,
} from 'react-native-paper';
import QRCode from 'react-native-qrcode-svg';
import { qrCodeService } from '../services/qrCodeService';
import { colors, spacing, theme } from '../theme/theme';
import { Booking, Schedule, Ticket } from '../types';

interface TicketCardProps {
  ticket: Ticket & {
    booking: Booking & {
      schedule: Schedule & {
        boat: any;
        owner: any;
      };
    };
    ticket_type: any;
  };
  onPress?: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, onPress }) => {
  const [showQR, setShowQR] = useState(false);
  const [qrError, setQrError] = useState(false);

  const { booking } = ticket;
  const { schedule } = booking;
  const { boat, owner } = schedule;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return colors.success;
      case 'USED':
        return colors.info;
      case 'VOID':
        return colors.error;
      case 'REFUNDED':
        return colors.warning;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ISSUED':
        return 'ticket';
      case 'USED':
        return 'check-circle';
      case 'VOID':
        return 'close-circle';
      case 'REFUNDED':
        return 'cash-refund';
      default:
        return 'help-circle';
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'EEE, MMM d');
  };

  const formatTime = (dateString: string) => {
    return format(new Date(dateString), 'HH:mm');
  };

  const isExpired = () => {
    return new Date(schedule.start_at) < new Date();
  };

  const canUseTicket = () => {
    return ticket.status === 'ISSUED' && !isExpired();
  };

  const handleShare = async () => {
    try {
      const boardingPass = qrCodeService.generateBoardingPassData(
        ticket,
        booking,
        schedule
      );

      const message = `🎫 Ferry Ticket
Passenger: ${ticket.passenger_name}
Boat: ${boat.name}
Date: ${formatDate(schedule.start_at)}
Time: ${formatTime(schedule.start_at)}
${ticket.seat_id ? `Seat: ${ticket.seat_id}` : ''}

Booking: ${booking.id.slice(-8).toUpperCase()}
Reference: ${boardingPass.reference}

Present this ticket for boarding.`;

      await Share.share({
        message,
        title: 'Ferry Ticket',
      });
    } catch (error) {
      console.error('Error sharing ticket:', error);
    }
  };

  const handleShowQR = () => {
    if (!ticket.qr_code) {
      Alert.alert('Error', 'QR code not available for this ticket');
      return;
    }
    setShowQR(true);
  };

  const renderQRModal = () => (
    <Portal>
      <Modal
        visible={showQR}
        onDismiss={() => setShowQR(false)}
        contentContainerStyle={styles.qrModal}
      >
        <Surface style={styles.qrContainer} elevation={3}>
          <View style={styles.qrHeader}>
            <Text variant="titleLarge" style={styles.qrTitle}>
              Boarding Pass
            </Text>
            <IconButton
              icon="close"
              onPress={() => setShowQR(false)}
              size={24}
            />
          </View>

          <View style={styles.qrContent}>
            <View style={styles.ticketInfo}>
              <Text variant="titleMedium" style={styles.passengerName}>
                {ticket.passenger_name}
              </Text>
              <Text variant="bodyMedium" style={styles.qrRouteInfo}>
                {boat.name} • {owner.brand_name}
              </Text>
              <Text variant="bodyMedium" style={styles.dateTimeInfo}>
                {formatDate(schedule.start_at)} at {formatTime(schedule.start_at)}
              </Text>
              {ticket.seat_id && (
                <Chip mode="outlined" compact style={styles.seatChip}>
                  Seat {ticket.seat_id}
                </Chip>
              )}
            </View>

            <View style={styles.qrCodeContainer}>
              {!qrError ? (
                <QRCode
                  value={ticket.qr_code}
                  size={200}
                  backgroundColor="white"
                  color="black"
                  onError={() => setQrError(true)}
                />
              ) : (
                <View style={styles.qrError}>
                  <MaterialCommunityIcons
                    name="qrcode-remove"
                    size={64}
                    color={theme.colors.error}
                  />
                  <Text variant="bodyMedium" style={styles.qrErrorText}>
                    QR Code unavailable
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.qrFooter}>
              <Text variant="bodySmall" style={styles.qrInstructions}>
                Present this QR code to the crew for boarding verification
              </Text>
              
              <View style={styles.verificationCode}>
                <Text variant="bodySmall" style={styles.verificationLabel}>
                  Verification Code:
                </Text>
                <Text variant="titleSmall" style={styles.verificationNumber}>
                  {qrCodeService.generateVerificationCode(ticket.id)}
                </Text>
              </View>
            </View>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );

  return (
    <>
      <Card style={styles.card} onPress={onPress}>
        <Card.Content style={styles.cardContent}>
          {/* Header with Status */}
          <View style={styles.header}>
            <View style={styles.routeInfo}>
              <MaterialCommunityIcons
                name="ferry"
                size={20}
                color={theme.colors.primary}
              />
              <Text variant="titleMedium" style={styles.boatName}>
                {boat.name}
              </Text>
            </View>
            
            <Chip
              mode="flat"
              style={[
                styles.statusChip,
                { backgroundColor: getStatusColor(ticket.status) + '20' }
              ]}
              textStyle={{ color: getStatusColor(ticket.status) }}
              icon={() => (
                <MaterialCommunityIcons
                  name={getStatusIcon(ticket.status)}
                  size={16}
                  color={getStatusColor(ticket.status)}
                />
              )}
            >
              {ticket.status}
            </Chip>
          </View>

          {/* Trip Details */}
          <View style={styles.tripDetails}>
            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="account"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium" style={styles.passengerText}>
                {ticket.passenger_name}
              </Text>
            </View>

            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="calendar"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium">
                {formatDate(schedule.start_at)} at {formatTime(schedule.start_at)}
              </Text>
            </View>

            {ticket.seat_id && (
              <View style={styles.detailRow}>
                <MaterialCommunityIcons
                  name="seat"
                  size={16}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodyMedium">Seat {ticket.seat_id}</Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <MaterialCommunityIcons
                name="domain"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text variant="bodyMedium">{owner.brand_name}</Text>
            </View>
          </View>

          {/* Booking Reference */}
          <View style={styles.referenceSection}>
            <Text variant="bodySmall" style={styles.referenceLabel}>
              Booking Reference
            </Text>
            <Text variant="bodyMedium" style={styles.referenceNumber}>
              {booking.id.slice(-8).toUpperCase()}
            </Text>
          </View>

          {/* Expiry Warning */}
          {isExpired() && ticket.status === 'ISSUED' && (
            <View style={styles.expiredWarning}>
              <MaterialCommunityIcons
                name="alert"
                size={16}
                color={colors.warning}
              />
              <Text variant="bodySmall" style={styles.expiredText}>
                This ticket has expired
              </Text>
            </View>
          )}

          <Divider style={styles.divider} />

          {/* Actions */}
          <View style={styles.actions}>
            <Button
              mode="outlined"
              onPress={handleShowQR}
              disabled={!canUseTicket()}
              style={styles.actionButton}
              icon="qrcode"
              compact
            >
              Show QR
            </Button>

            <Button
              mode="text"
              onPress={handleShare}
              style={styles.actionButton}
              icon="share"
              compact
            >
              Share
            </Button>
          </View>
        </Card.Content>
      </Card>

      {renderQRModal()}
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginVertical: spacing.xs,
    elevation: 2,
  },
  cardContent: {
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  routeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flex: 1,
  },
  boatName: {
    fontWeight: '600',
    flex: 1,
  },
  statusChip: {
    height: 28,
  },
  tripDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  passengerText: {
    fontWeight: '500',
  },
  referenceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.sm,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  referenceLabel: {
    opacity: 0.7,
  },
  referenceNumber: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
  expiredWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.warning + '20',
    borderRadius: 8,
    marginBottom: spacing.sm,
  },
  expiredText: {
    color: colors.warning,
    fontWeight: '500',
  },
  divider: {
    marginVertical: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  // QR Modal Styles
  qrModal: {
    margin: spacing.lg,
    borderRadius: 16,
  },
  qrContainer: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  qrHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: theme.colors.primaryContainer,
  },
  qrTitle: {
    fontWeight: 'bold',
    color: theme.colors.onPrimaryContainer,
  },
  qrContent: {
    padding: spacing.lg,
    alignItems: 'center',
  },
  ticketInfo: {
    alignItems: 'center',
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  passengerName: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  qrRouteInfo: {
    opacity: 0.8,
    textAlign: 'center',
  },
  dateTimeInfo: {
    opacity: 0.8,
    textAlign: 'center',
  },
  seatChip: {
    marginTop: spacing.sm,
  },
  qrCodeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: 'white',
    borderRadius: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrError: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 200,
    height: 200,
    gap: spacing.sm,
  },
  qrErrorText: {
    color: theme.colors.error,
    textAlign: 'center',
  },
  qrFooter: {
    alignItems: 'center',
    gap: spacing.md,
  },
  qrInstructions: {
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
  },
  verificationCode: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    minWidth: 120,
  },
  verificationLabel: {
    opacity: 0.7,
  },
  verificationNumber: {
    fontFamily: 'monospace',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 2,
  },
});
