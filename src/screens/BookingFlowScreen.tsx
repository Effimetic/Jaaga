import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
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
    Surface,
    Text
} from '../compat/paper';
import { ConfirmationStep } from '../components/booking/ConfirmationStep';
import { PassengerInfoStep } from '../components/booking/PassengerInfoStep';
import { PaymentStep } from '../components/booking/PaymentStep';
import { SeatSelectionStep } from '../components/booking/SeatSelectionStep';
import { TripDetailsStep } from '../components/booking/TripDetailsStep';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { useBookingStore } from '../stores/bookingStore';
import { colors, spacing, theme } from '../theme/theme';

interface BookingFlowScreenProps {
  navigation: any;
  route: any;
}

export const BookingFlowScreen: React.FC<BookingFlowScreenProps> = ({ 
  navigation, 
  route 
}) => {
  const { scheduleId, segmentKey } = route.params || {};
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  
  const {
    currentStep,
    steps,
    schedule,
    isLoading,
    error,
    nextStep,
    previousStep,
    resetBooking,
    setSchedule,
    setTicketTypes,
    setSeatMap,
    setAvailableSeats,
    setOccupiedSeats,
    canProceedToNextStep,
    validateCurrentStep,
    setError,
  } = useBookingStore();

  useEffect(() => {
    if (scheduleId) {
      loadScheduleData();
    }
    
    // Cleanup when leaving
    return () => {
      resetBooking();
    };
  }, [scheduleId]);

  const loadScheduleData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load schedule details
      const { data, error } = await apiService.searchTrips({
        date: new Date().toISOString().split('T')[0],
      });

      if (error) throw new Error(error);

      const scheduleData = data?.find(result => result.schedule.id === scheduleId);
      
      if (!scheduleData) {
        throw new Error('Schedule not found');
      }

      // Set schedule data
      setSchedule(scheduleData.schedule, segmentKey || 'default');
      setTicketTypes(scheduleData.schedule.available_tickets.map(st => st.ticket_type));

      // Load seat information
      if (scheduleData.schedule.boat.seat_mode === 'SEATMAP') {
        const seatMapData = scheduleData.schedule.boat.seat_map_json;
        if (seatMapData) {
          setSeatMap(seatMapData);
        }
      }

      // Load occupied seats
      await loadOccupiedSeats(scheduleId);

    } catch (error: any) {
      console.error('Error loading schedule:', error);
      setError(error.message || 'Failed to load trip details');
      Alert.alert('Error', error.message || 'Failed to load trip details', [
        { text: 'Go Back', onPress: () => navigation.goBack() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadOccupiedSeats = async (scheduleId: string) => {
    try {
      // This would typically come from the API
      // For now, simulate some occupied seats
      const mockOccupiedSeats = ['A1', 'A2', 'C5', 'D3'];
      setOccupiedSeats(mockOccupiedSeats);
      
      // Calculate available seats
      const totalSeats = schedule?.boat.capacity || 50;
      const availableCount = totalSeats - mockOccupiedSeats.length;
      setAvailableSeats(Array.from({ length: availableCount }, (_, i) => `SEAT_${i}`));
      
    } catch (error) {
      console.error('Error loading seat availability:', error);
    }
  };

  const handleNext = () => {
    const validationError = validateCurrentStep();
    
    if (validationError) {
      Alert.alert('Please Complete This Step', validationError);
      return;
    }
    
    nextStep();
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      previousStep();
    } else {
      navigation.goBack();
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return <TripDetailsStep />;
      case 1:
        return <SeatSelectionStep />;
      case 2:
        return <PassengerInfoStep />;
      case 3:
        return <PaymentStep />;
      case 4:
        return <ConfirmationStep navigation={navigation} />;
      default:
        return null;
    }
  };

  const getStepIcon = (stepIndex: number) => {
    if (stepIndex < currentStep) return 'check-circle';
    if (stepIndex === currentStep) return 'circle-outline';
    return 'circle-outline';
  };

  const getStepColor = (stepIndex: number) => {
    if (stepIndex < currentStep) return colors.success;
    if (stepIndex === currentStep) return theme.colors.primary;
    return theme.colors.onSurfaceVariant;
  };

  if (loading || isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text variant="headlineSmall" style={styles.loadingText}>
          Loading trip details...
        </Text>
        {/* ProgressBar was removed from imports, so this will cause an error */}
        {/* <ProgressBar indeterminate style={styles.loadingBar} /> */}
      </View>
    );
  }

  if (error || !schedule) {
    return (
      <View style={styles.errorContainer}>
        <MaterialCommunityIcons 
          name="alert-circle" 
          size={64} 
          color={theme.colors.error} 
        />
        <Text variant="headlineSmall" style={styles.errorTitle}>
          Unable to Load Trip
        </Text>
        <Text variant="bodyMedium" style={styles.errorMessage}>
          {error || 'Trip details could not be loaded'}
        </Text>
        <Button 
          mode="contained" 
          onPress={() => navigation.goBack()}
          style={styles.errorButton}
        >
          Go Back
        </Button>
      </View>
    );
  }

  const progress = (currentStep + 1) / steps.length;
  const canProceed = canProceedToNextStep();
  const isLastStep = currentStep === steps.length - 1;

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Header */}
      <Surface style={styles.header} elevation={2}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            {/* IconButton was removed from imports, so this will cause an error */}
            {/* <IconButton
              icon="arrow-left"
              size={24}
              onPress={handlePrevious}
              iconColor={theme.colors.onSurface}
            /> */}
            <View>
              <Text variant="titleMedium" style={styles.headerTitle}>
                Book Tickets
              </Text>
              <Text variant="bodySmall" style={styles.headerSubtitle}>
                {schedule.boat.name} • {schedule.owner.brand_name}
              </Text>
            </View>
          </View>
        </View>
        
        {/* Progress Indicator */}
        <View style={styles.progressContainer}>
          {/* ProgressBar was removed from imports, so this will cause an error */}
          {/* <ProgressBar 
            progress={progress} 
            style={styles.progressBar}
            color={theme.colors.primary}
          /> */}
          <Text variant="bodySmall" style={styles.progressText}>
            Step {currentStep + 1} of {steps.length}
          </Text>
        </View>
      </Surface>

      {/* Step Indicators */}
      <Surface style={styles.stepIndicators} elevation={1}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.stepIndicatorContent}
        >
          {steps.map((step, index) => (
            <View key={step.step} style={styles.stepIndicator}>
              <View style={styles.stepIconContainer}>
                <MaterialCommunityIcons
                  name={getStepIcon(index)}
                  size={20}
                  color={getStepColor(index)}
                />
              </View>
              <Text 
                variant="bodySmall" 
                style={[
                  styles.stepLabel,
                  { color: getStepColor(index) }
                ]}
              >
                {step.title}
              </Text>
              {index < steps.length - 1 && (
                <View style={styles.stepConnector} />
              )}
            </View>
          ))}
        </ScrollView>
      </Surface>

      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
        <View style={styles.bottomSpacing} />
      </ScrollView>

      {/* Navigation Footer */}
      {currentStep < steps.length - 1 && (
        <Surface style={styles.footer} elevation={3}>
          <View style={styles.footerContent}>
            <Button
              mode="outlined"
              onPress={handlePrevious}
              style={styles.footerButton}
              disabled={isLoading}
            >
              {currentStep === 0 ? 'Cancel' : 'Previous'}
            </Button>
            
            <Button
              mode="contained"
              onPress={handleNext}
              style={styles.footerButton}
              disabled={!canProceed || isLoading}
              loading={isLoading}
            >
              {isLastStep ? 'Complete Booking' : 'Next'}
            </Button>
          </View>
        </Surface>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  loadingBar: {
    width: '80%',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    textAlign: 'center',
    opacity: 0.7,
    marginBottom: spacing.lg,
  },
  errorButton: {
    marginTop: spacing.md,
  },
  header: {
    paddingTop: Platform.OS === 'ios' ? 44 : 24,
    backgroundColor: theme.colors.surface,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerSubtitle: {
    opacity: 0.7,
  },
  progressContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  progressBar: {
    height: 4,
    marginBottom: spacing.xs,
  },
  progressText: {
    textAlign: 'center',
    opacity: 0.7,
  },
  stepIndicators: {
    backgroundColor: theme.colors.surface,
    paddingVertical: spacing.sm,
  },
  stepIndicatorContent: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  stepIndicator: {
    alignItems: 'center',
    flexDirection: 'row',
    marginHorizontal: spacing.xs,
  },
  stepIconContainer: {
    marginBottom: spacing.xs,
  },
  stepLabel: {
    fontSize: 10,
    textAlign: 'center',
    marginLeft: spacing.xs,
  },
  stepConnector: {
    width: 20,
    height: 1,
    backgroundColor: theme.colors.outline,
    marginHorizontal: spacing.sm,
  },
  content: {
    flex: 1,
  },
  bottomSpacing: {
    height: 80,
  },
  footer: {
    backgroundColor: theme.colors.surface,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  footerContent: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
