import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onConfirm: (startYYYYMMDD: string, endYYYYMMDD: string) => void;
  initialStart?: string; // 'YYYY-MM-DD'
  initialEnd?: string;   // 'YYYY-MM-DD'
  minimumDate?: Date;
  maximumDate?: Date;
};

const toLocalMidnight = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate());

const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`;

const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  // JavaScript getDay() returns 0 for Sunday, 1 for Monday, etc.
  // We want 0 for Sunday, 1 for Monday, etc. (same as our dayNames array)
  return new Date(year, month, 1).getDay();
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']; // 0=Sun, 1=Mon, ..., 6=Sat

interface CalendarProps {
  currentDate: Date;
  selectedStart?: Date;
  selectedEnd?: Date;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
}

const Calendar: React.FC<CalendarProps> = ({
  currentDate,
  selectedStart,
  selectedEnd,
  onDateSelect,
  minDate,
  maxDate
}) => {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const isDateInRange = (date: Date) => {
    if (!selectedStart) return false;
    if (!selectedEnd) return false; // Don't highlight range until end is selected
    return date >= selectedStart && date <= selectedEnd;
  };

  const isDateSelected = (date: Date) => {
    if (!selectedStart) return false;
    return date.getTime() === selectedStart.getTime();
  };

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const renderCalendarDays = () => {
    const days = [];
    
    // Debug: Log the first day calculation
    console.log(`Calendar debug: year=${year}, month=${month}, firstDay=${firstDay}, dayNames[firstDay]=${dayNames[firstDay]}`);
    
    // Create a fixed 7x5 grid (35 cells total)
    const totalGridCells = 35;
    
    for (let cellIndex = 0; cellIndex < totalGridCells; cellIndex++) {
      // Calculate which day of the month this cell represents
      const dayOfMonth = cellIndex - firstDay + 1;
      
      if (dayOfMonth < 1 || dayOfMonth > daysInMonth) {
        // This is an empty cell (before month starts or after month ends)
        days.push(
          <View key={`empty-${cellIndex}`} style={[styles.calendarDay, { backgroundColor: 'transparent' }]}>
            <Text style={[styles.dayText, { color: 'transparent' }]}>.</Text>
          </View>
        );
      } else {
        // This is a day of the month
        const date = new Date(year, month, dayOfMonth);
        const isSelected = isDateSelected(date);
        const inRange = isDateInRange(date);
        const disabled = isDateDisabled(date);
        const isToday = date.getTime() === toLocalMidnight(new Date()).getTime();

        days.push(
          <TouchableOpacity
            key={dayOfMonth}
            style={[
              styles.calendarDay,
              isSelected && styles.selectedDay,
              inRange && !isSelected && styles.inRangeDay,
              disabled && styles.disabledDay,
              isToday && styles.todayDay,
            ]}
            onPress={() => !disabled && onDateSelect(date)}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={[
                styles.dayText,
                isSelected && styles.selectedDayText,
                inRange && !isSelected && styles.inRangeDayText,
                disabled && styles.disabledDayText,
                isToday && styles.todayDayText,
              ]}>
                {dayOfMonth}
              </Text>
            </View>
          </TouchableOpacity>
        );
      }
    }

    return days;
  };

  return (
    <View style={styles.calendar}>
      <Text style={styles.monthYear}>{monthNames[month]} {year}</Text>
      
      {/* Day headers */}
      <View style={styles.dayHeaders}>
        {dayNames.map(day => (
          <Text key={day} style={styles.dayHeader}>{day}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {renderCalendarDays()}
      </View>
    </View>
  );
};

export const CustomDatePicker: React.FC<Props> = ({
  visible,
  onClose,
  onConfirm,
  initialStart,
  initialEnd,
  minimumDate,
  maximumDate,
}) => {
  const today = useMemo(() => toLocalMidnight(new Date()), []);
  const [start, setStart] = useState<Date>(initialStart ? toLocalMidnight(new Date(initialStart)) : today);
  const [end, setEnd] = useState<Date>(initialEnd ? toLocalMidnight(new Date(initialEnd)) : today);
  const [currentMonth, setCurrentMonth] = useState<Date>(start);

  useEffect(() => {
    if (initialStart) setStart(toLocalMidnight(new Date(initialStart)));
    if (initialEnd) setEnd(toLocalMidnight(new Date(initialEnd)));
  }, [initialStart, initialEnd, visible]);

  // Ensure end >= start
  useEffect(() => {
    if (end < start) setEnd(start);
  }, [start, end]);

  const confirmDisabled = !start || !end || end < start;

  const handleConfirm = () => onConfirm(fmt(start), fmt(end));

  const handleDateSelect = (date: Date) => {
    const normalizedDate = toLocalMidnight(date);
    
    // If no start date is set, set it as start and end
    if (!start) {
      setStart(normalizedDate);
      setEnd(normalizedDate);
    } else if (start.getTime() === end.getTime()) {
      // If start and end are the same, this is the second selection
      if (normalizedDate < start) {
        // If selected date is before start, swap them
        setStart(normalizedDate);
        setEnd(start);
      } else {
        // Normal case: this becomes the end date
        setEnd(normalizedDate);
      }
    } else {
      // We have a range, start a new selection
      setStart(normalizedDate);
      setEnd(normalizedDate);
    }
  };

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Select Date Range</Text>

          {/* Month Navigation */}
          <View style={styles.monthNavigation}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>‹</Text>
            </TouchableOpacity>
            <Text style={styles.currentMonth}>
              {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </Text>
            <TouchableOpacity onPress={goToNextMonth} style={styles.navButton}>
              <Text style={styles.navButtonText}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Calendar */}
          <Calendar
            currentDate={currentMonth}
            selectedStart={start}
            selectedEnd={end}
            onDateSelect={handleDateSelect}
            minDate={minimumDate}
            maxDate={maximumDate}
          />

          {/* Selected Range Display */}
          <View style={styles.rangeDisplay}>
            <Text style={styles.rangeLabel}>Selected Range:</Text>
            <Text style={styles.rangeText}>
              {fmt(start)} - {fmt(end)}
            </Text>
          </View>

          {/* Helper / validation */}
          <Text style={styles.helper}>
            {confirmDisabled ? 'Please select a valid date range.' : '\u00A0'}
          </Text>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.btnGhost]}>
              <Text style={[styles.btnText, { color: '#111827' }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={confirmDisabled}
              onPress={handleConfirm}
              style={[styles.btn, confirmDisabled ? styles.btnDisabled : styles.btnPrimary]}
            >
              <Text style={[styles.btnText, { color: '#fff' }]}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center',
    padding: 16,
  },
  sheet: {
    width: '100%', borderRadius: 16, backgroundColor: '#fff', padding: 16,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111827', marginBottom: 12 },
  monthNavigation: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  navButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
  },
  currentMonth: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  calendar: {
    marginBottom: 16,
  },
  monthYear: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
    marginBottom: 8,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  calendarDay: {
    width: '14.2857%', // Exactly 1/7 of the width
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 0,
    padding: 4,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
    lineHeight: 20,
  },
  selectedDay: {
    backgroundColor: '#18181b',
  },
  selectedDayText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  inRangeDay: {
    backgroundColor: '#f3f4f6',
  },
  inRangeDayText: {
    color: '#374151',
  },
  disabledDay: {
    opacity: 0.3,
  },
  disabledDayText: {
    color: '#9ca3af',
  },
  todayDay: {
    borderWidth: 2,
    borderColor: '#18181b',
  },
  todayDayText: {
    color: '#18181b',
    fontWeight: '600',
  },
  rangeDisplay: {
    backgroundColor: '#f9fafb',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    marginBottom: 4,
  },
  rangeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  helper: { marginTop: 8, minHeight: 18, fontSize: 12, color: '#ef4444' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 8, justifyContent: 'flex-end' },
  btn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10 },
  btnPrimary: { backgroundColor: '#18181b' },
  btnGhost: { backgroundColor: '#f3f4f6' },
  btnDisabled: { backgroundColor: '#9ca3af' },
  btnText: { fontSize: 14, fontWeight: '700' },
});
