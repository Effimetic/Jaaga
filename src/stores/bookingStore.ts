import { create } from 'zustand';
import {
    Booking,
    PassengerInfo,
    PaymentMethod,
    PricingBreakdown,
    Schedule,
    SeatMap,
    TicketType
} from '../types';

export interface BookingStep {
  step: number;
  title: string;
  completed: boolean;
}

export interface BookingState {
  // Current booking flow state
  currentStep: number;
  steps: BookingStep[];
  
  // Schedule and trip details
  schedule: Schedule | null;
  segmentKey: string;
  availableSeats: string[];
  occupiedSeats: string[];
  seatMap: SeatMap | null;
  ticketTypes: TicketType[];
  
  // Selection state
  selectedSeats: string[];
  selectedTicketType: TicketType | null;
  passengerCount: number;
  passengers: PassengerInfo[];
  
  // Payment state
  selectedPaymentMethod: PaymentMethod | null;
  pricing: PricingBreakdown | null;
  
  // Booking result
  currentBooking: Booking | null;
  isLoading: boolean;
  error: string | null;
}

interface BookingActions {
  // Navigation actions
  nextStep: () => void;
  previousStep: () => void;
  goToStep: (step: number) => void;
  resetBooking: () => void;
  
  // Schedule actions
  setSchedule: (schedule: Schedule, segmentKey: string) => void;
  setAvailableSeats: (seats: string[]) => void;
  setOccupiedSeats: (seats: string[]) => void;
  setSeatMap: (seatMap: SeatMap) => void;
  setTicketTypes: (ticketTypes: TicketType[]) => void;
  
  // Selection actions
  toggleSeat: (seatId: string) => void;
  setSelectedSeats: (seats: string[]) => void;
  setTicketType: (ticketType: TicketType) => void;
  setPassengerCount: (count: number) => void;
  setPassengers: (passengers: PassengerInfo[]) => void;
  updatePassenger: (index: number, passenger: PassengerInfo) => void;
  
  // Payment actions
  setPaymentMethod: (method: PaymentMethod) => void;
  setPricing: (pricing: PricingBreakdown) => void;
  
  // Booking actions
  setCurrentBooking: (booking: Booking) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Validation
  canProceedToNextStep: () => boolean;
  validateCurrentStep: () => string | null;
}

const initialState: BookingState = {
  currentStep: 0,
  steps: [
    { step: 0, title: 'Trip Details', completed: false },
    { step: 1, title: 'Seat Selection', completed: false },
    { step: 2, title: 'Passenger Info', completed: false },
    { step: 3, title: 'Payment', completed: false },
    { step: 4, title: 'Confirmation', completed: false },
  ],
  
  schedule: null,
  segmentKey: '',
  availableSeats: [],
  occupiedSeats: [],
  seatMap: null,
  ticketTypes: [],
  
  selectedSeats: [],
  selectedTicketType: null,
  passengerCount: 1,
  passengers: [],
  
  selectedPaymentMethod: null,
  pricing: null,
  
  currentBooking: null,
  isLoading: false,
  error: null,
};

export const useBookingStore = create<BookingState & BookingActions>((set, get) => ({
  ...initialState,
  
  // Navigation actions
  nextStep: () => {
    const { currentStep, steps, canProceedToNextStep } = get();
    
    if (!canProceedToNextStep()) return;
    
    const newStep = Math.min(currentStep + 1, steps.length - 1);
    const updatedSteps = steps.map((step, index) => ({
      ...step,
      completed: index < newStep,
    }));
    
    set({ currentStep: newStep, steps: updatedSteps });
  },
  
  previousStep: () => {
    const { currentStep } = get();
    const newStep = Math.max(currentStep - 1, 0);
    set({ currentStep: newStep });
  },
  
  goToStep: (step: number) => {
    const { steps } = get();
    const validStep = Math.max(0, Math.min(step, steps.length - 1));
    set({ currentStep: validStep });
  },
  
  resetBooking: () => {
    set({
      ...initialState,
      steps: initialState.steps.map(step => ({ ...step, completed: false })),
    });
  },
  
  // Schedule actions
  setSchedule: (schedule: Schedule, segmentKey: string) => {
    set({ schedule, segmentKey });
  },
  
  setAvailableSeats: (seats: string[]) => {
    set({ availableSeats: seats });
  },
  
  setOccupiedSeats: (seats: string[]) => {
    set({ occupiedSeats: seats });
  },
  
  setSeatMap: (seatMap: SeatMap) => {
    set({ seatMap });
  },
  
  setTicketTypes: (ticketTypes: TicketType[]) => {
    set({ ticketTypes });
  },
  
  // Selection actions
  toggleSeat: (seatId: string) => {
    const { selectedSeats, passengerCount } = get();
    
    if (selectedSeats.includes(seatId)) {
      // Remove seat
      set({ selectedSeats: selectedSeats.filter(id => id !== seatId) });
    } else if (selectedSeats.length < passengerCount) {
      // Add seat
      set({ selectedSeats: [...selectedSeats, seatId] });
    }
  },
  
  setSelectedSeats: (seats: string[]) => {
    set({ selectedSeats: seats });
  },
  
  setTicketType: (ticketType: TicketType) => {
    set({ selectedTicketType: ticketType });
  },
  
  setPassengerCount: (count: number) => {
    const { selectedSeats, passengers } = get();
    
    // Adjust selected seats if needed
    const newSelectedSeats = selectedSeats.slice(0, count);
    
    // Adjust passengers array
    const newPassengers = Array.from({ length: count }, (_, index) => 
      passengers[index] || { name: '', phone: '', seat_id: newSelectedSeats[index] }
    );
    
    set({ 
      passengerCount: count, 
      selectedSeats: newSelectedSeats,
      passengers: newPassengers 
    });
  },
  
  setPassengers: (passengers: PassengerInfo[]) => {
    set({ passengers });
  },
  
  updatePassenger: (index: number, passenger: PassengerInfo) => {
    const { passengers } = get();
    const newPassengers = [...passengers];
    newPassengers[index] = passenger;
    set({ passengers: newPassengers });
  },
  
  // Payment actions
  setPaymentMethod: (method: PaymentMethod) => {
    set({ selectedPaymentMethod: method });
  },
  
  setPricing: (pricing: PricingBreakdown) => {
    set({ pricing });
  },
  
  // Booking actions
  setCurrentBooking: (booking: Booking) => {
    set({ currentBooking: booking });
  },
  
  setLoading: (loading: boolean) => {
    set({ isLoading: loading });
  },
  
  setError: (error: string | null) => {
    set({ error });
  },
  
  // Validation
  canProceedToNextStep: () => {
    const state = get();
    const validationError = state.validateCurrentStep();
    return validationError === null;
  },
  
  validateCurrentStep: () => {
    const {
      currentStep,
      schedule,
      selectedTicketType,
      selectedSeats,
      passengerCount,
      passengers,
      selectedPaymentMethod,
      seatMap,
    } = get();
    
    switch (currentStep) {
      case 0: // Trip Details
        if (!schedule) return 'Please select a valid trip';
        if (!selectedTicketType) return 'Please select a ticket type';
        if (passengerCount < 1) return 'Please select number of passengers';
        return null;
        
      case 1: // Seat Selection
        if (seatMap && selectedSeats.length !== passengerCount) {
          return `Please select ${passengerCount} seat${passengerCount !== 1 ? 's' : ''}`;
        }
        return null;
        
      case 2: // Passenger Info
        for (let i = 0; i < passengerCount; i++) {
          const passenger = passengers[i];
          if (!passenger || !passenger.name.trim()) {
            return `Please enter name for passenger ${i + 1}`;
          }
        }
        return null;
        
      case 3: // Payment
        if (!selectedPaymentMethod) return 'Please select a payment method';
        return null;
        
      default:
        return null;
    }
  },
}));
