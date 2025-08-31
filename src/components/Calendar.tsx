import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Surface, Text } from './catalyst';

interface CalendarProps {
  selectedDates: string[];
  onDateSelect: (date: string) => void;
  onDateDeselect: (date: string) => void;
  minDate?: Date; // Defaults to today
}

export const Calendar: React.FC<CalendarProps> = ({
  selectedDates,
  onDateSelect,
  onDateDeselect,
  minDate = new Date()
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  // Get the first day of the current month view
  const firstDayOfMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
  }, [currentMonth]);
  
  // Get the last day of the current month
  const lastDayOfMonth = useMemo(() => {
    return new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
  }, [currentMonth]);
  
  // Get the first day to display (including previous month's days to fill the week)
  const firstDayToDisplay = useMemo(() => {
    const firstDay = firstDayOfMonth.getDay();
    const displayDate = new Date(firstDayOfMonth);
    displayDate.setDate(firstDayOfMonth.getDate() - firstDay);
    return displayDate;
  }, [firstDayOfMonth]);
  
  // Generate calendar days
  const calendarDays = useMemo(() => {
    const days = [];
    const currentDate = new Date(firstDayToDisplay);
    
    // Generate 42 days (6 weeks * 7 days) to ensure we cover the month
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  }, [firstDayToDisplay]);
  
  // Navigate to previous month
  const goToPreviousMonth = () => {
    console.log('Calendar: Going to previous month');
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() - 1);
      return newMonth;
    });
  };
  
  // Navigate to next month
  const goToNextMonth = () => {
    console.log('Calendar: Going to next month');
    setCurrentMonth(prev => {
      const newMonth = new Date(prev);
      newMonth.setMonth(prev.getMonth() + 1);
      return newMonth;
    });
  };
  
  // Check if a date is in the past
  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };
  
  // Check if a date is in the current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === currentMonth.getMonth() && 
           date.getFullYear() === currentMonth.getFullYear();
  };
  
  // Check if a date is selected
  const isSelected = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return selectedDates.includes(dateString);
  };
  
  // Handle date selection/deselection
  const handleDatePress = (date: Date) => {
    if (isPastDate(date)) return; // Can't select past dates
    
    const dateString = date.toISOString().split('T')[0];
    console.log('Calendar: Date pressed:', dateString, 'Selected:', isSelected(date));
    
    if (isSelected(date)) {
      onDateDeselect(dateString);
    } else {
      onDateSelect(dateString);
    }
  };
  
  // Format date for display
  const formatDate = (date: Date) => {
    return date.getDate().toString();
  };
  
  // Get month name
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };
  
  // Get day names for header
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  return (
    <Surface style={{ padding: 16, borderRadius: 12 }}>
      {/* Month Navigation */}
      <View className="flex-row items-center justify-between mb-4">
        <TouchableOpacity 
          onPress={goToPreviousMonth}
          className="p-2 rounded-lg bg-gray-100"
        >
          <MaterialCommunityIcons name="chevron-left" size={24} color="#374151" />
        </TouchableOpacity>
        
        <Text className="text-lg font-semibold text-gray-900">
          {getMonthName(currentMonth)}
        </Text>
        
        <TouchableOpacity 
          onPress={goToNextMonth}
          className="p-2 rounded-lg bg-gray-100"
        >
          <MaterialCommunityIcons name="chevron-right" size={24} color="#374151" />
        </TouchableOpacity>
      </View>
      
      {/* Day Names Header */}
      <View className="flex-row mb-2">
        {dayNames.map((dayName, index) => (
          <View key={index} className="flex-1 items-center py-2">
            <Text className="text-xs font-medium text-gray-500">
              {dayName}
            </Text>
          </View>
        ))}
      </View>
      
      {/* Calendar Grid */}
      <View className="flex-row flex-wrap">
        {calendarDays.map((date, index) => {
          const isPast = isPastDate(date);
          const isCurrentMonthDate = isCurrentMonth(date);
          const isDateSelected = isSelected(date);
          
          return (
            <TouchableOpacity
              key={index}
              onPress={() => handleDatePress(date)}
              disabled={isPast}
              className={`w-[14.28%] aspect-square items-center justify-center m-0.5 rounded-lg ${
                isPast 
                  ? 'bg-gray-100' 
                  : isDateSelected 
                    ? 'bg-gray-900' 
                    : isCurrentMonthDate 
                      ? 'bg-white border border-gray-200' 
                      : 'bg-gray-50'
              }`}
            >
              <Text className={`text-sm font-medium ${
                isPast 
                  ? 'text-gray-400' 
                  : isDateSelected 
                    ? 'text-white' 
                    : isCurrentMonthDate 
                      ? 'text-gray-900' 
                      : 'text-gray-400'
              }`}>
                {formatDate(date)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      
      {/* Legend */}
      <View className="flex-row items-center justify-center mt-4 pt-4 border-t border-gray-200">
        <View className="flex-row items-center mr-4">
          <View className="w-3 h-3 bg-gray-900 rounded mr-2" />
          <Text className="text-xs text-gray-600">Selected</Text>
        </View>
        <View className="flex-row items-center mr-4">
          <View className="w-3 h-3 bg-gray-100 rounded mr-2" />
          <Text className="text-xs text-gray-600">Past</Text>
        </View>
        <View className="flex-row items-center">
          <View className="w-3 h-3 bg-white border border-gray-200 rounded mr-2" />
          <Text className="text-xs text-gray-600">Available</Text>
        </View>
      </View>
    </Surface>
  );
};
