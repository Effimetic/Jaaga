import { MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    Modal,
    ScrollView,
    TouchableOpacity,
    View,
} from 'react-native';
import { Surface, Text } from './catalyst';

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  placeholder?: string;
  label?: string;
  required?: boolean;
}

export const TimePicker: React.FC<TimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select Time',
  label,
  required = false,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [selectedHour, setSelectedHour] = useState(() => {
    if (value) {
      const [hours] = value.split(':').map(Number);
      return hours;
    }
    return 8;
  });
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (value) {
      const [, minutes] = value.split(':').map(Number);
      return minutes;
    }
    return 0;
  });

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const minutes = Array.from({ length: 60 }, (_, i) => i);

  const handleConfirm = () => {
    const timeString = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    console.log('TimePicker: Confirming time:', timeString);
    onChange(timeString);
    setIsVisible(false);
  };

  const handleCancel = () => {
    setIsVisible(false);
  };

  const formatTime = (hour: number, minute: number) => {
    return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
  };

  const currentTime = value || placeholder;

  return (
    <View>
      {label && (
        <Text className="text-xs font-medium mb-2 text-gray-700">
          {label} {required && '*'}
        </Text>
      )}
      
      <TouchableOpacity
        onPress={() => setIsVisible(true)}
        className="py-3 px-4 border border-gray-300 rounded-lg bg-white flex-row items-center justify-between"
      >
        <Text className={`text-sm ${value ? 'text-gray-900' : 'text-gray-500'}`}>
          {currentTime}
        </Text>
        <MaterialCommunityIcons name="clock-outline" size={20} color="#6b7280" />
      </TouchableOpacity>

      <Modal
        visible={isVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCancel}
      >
        <View className="flex-1 bg-black/50 justify-center items-center">
          <Surface style={{ width: '90%', maxWidth: 400, backgroundColor: '#ffffff', borderRadius: 12, padding: 20 }}>
            <View className="flex-row justify-between items-center mb-5">
              <Text className="text-lg font-semibold text-gray-900">
                Select Time
              </Text>
              <TouchableOpacity onPress={handleCancel} className="p-1">
                <MaterialCommunityIcons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="flex-row gap-5 mb-5">
              {/* Hours */}
              <View className="flex-1 items-center">
                <Text className="text-sm font-medium mb-3 text-gray-700">
                  Hour
                </Text>
                <ScrollView className="max-h-[200px]" showsVerticalScrollIndicator={false}>
                  {hours.map((hour) => (
                    <TouchableOpacity
                      key={hour}
                      className={`py-2 px-4 rounded-md my-0.5 min-w-[60px] items-center ${
                        selectedHour === hour ? 'bg-gray-200' : ''
                      }`}
                      onPress={() => setSelectedHour(hour)}
                    >
                      <Text className={`text-base ${
                        selectedHour === hour ? 'text-white font-semibold' : 'text-gray-500'
                      }`}>
                        {hour.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Minutes */}
              <View className="flex-1 items-center">
                <Text className="text-sm font-medium mb-3 text-gray-700">
                  Minute
                </Text>
                <ScrollView className="max-h-[200px]" showsVerticalScrollIndicator={false}>
                  {minutes.map((minute) => (
                    <TouchableOpacity
                      key={minute}
                      className={`py-2 px-4 rounded-md my-0.5 min-w-[60px] items-center ${
                        selectedMinute === minute ? 'bg-gray-200' : ''
                      }`}
                      onPress={() => setSelectedMinute(minute)}
                    >
                      <Text className={`text-base ${
                        selectedMinute === minute ? 'text-white font-semibold' : 'text-gray-500'
                      }`}>
                        {minute.toString().padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            <View className="items-center mb-5 py-4 bg-gray-100 rounded-lg">
              <Text className="text-sm text-gray-500 mb-2">
                Selected Time:
              </Text>
              <Text className="text-2xl font-semibold text-gray-900">
                {formatTime(selectedHour, selectedMinute)}
              </Text>
            </View>

            <View className="flex-row gap-3">
              <TouchableOpacity 
                onPress={handleCancel} 
                className="flex-1 py-3 px-4 rounded-lg border border-gray-300 bg-white items-center"
              >
                <Text className="text-sm font-medium text-gray-500">
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={handleConfirm} 
                className="flex-1 py-3 px-4 rounded-lg bg-gray-900 items-center text-white"
              >
                <Text className="text-sm font-medium" style={{ color: '#ffffff' }}>
                  Confirm
                </Text>
              </TouchableOpacity>
            </View>
          </Surface>
        </View>
      </Modal>
    </View>
  );
};
