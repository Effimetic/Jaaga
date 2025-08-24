import React, { useState, useEffect } from 'react';
import {
  Alert,
  FlatList,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/apiService';
import { AgentOwnerLink, Booking } from '../types';

interface AgentStats {
  total_connections: number;
  active_connections: number;
  total_bookings: number;
  pending_bookings: number;
  total_credit_used: number;
  total_credit_limit: number;
  next_due_date?: string;
}

export default function AgentDashboardScreen({ navigation }: { navigation: any }) {
  const { user } = useAuth();
  const [stats, setStats] = useState<AgentStats>({
    total_connections: 0,
    active_connections: 0,
    total_bookings: 0,
    pending_bookings: 0,
    total_credit_used: 0,
    total_credit_limit: 0,
  });
  const [connections, setConnections] = useState<AgentOwnerLink[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      const [connectionsResponse, bookingsResponse] = await Promise.all([
        apiService.getAgentConnections(),
        apiService.getAgentBookings({ limit: 5 })
      ]);
      
      if (connectionsResponse.success) {
        const connectionsData = connectionsResponse.data || [];
        setConnections(connectionsData);
        
        // Calculate stats from connections
        const totalConnections = connectionsData.length;
        const activeConnections = connectionsData.filter((c: AgentOwnerLink) => 
          c.status === 'APPROVED' && c.active
        ).length;
        const totalCreditLimit = connectionsData.reduce((sum: number, c: AgentOwnerLink) => 
          sum + c.credit_limit, 0
        );
        
        setStats(prev => ({
          ...prev,
          total_connections: totalConnections,
          active_connections: activeConnections,
          total_credit_limit: totalCreditLimit,
        }));
      }
      
      if (bookingsResponse.success) {
        const bookingsData = bookingsResponse.data || [];
        setRecentBookings(bookingsData);
        
        // Calculate booking stats
        const totalBookings = bookingsData.length;
        const pendingBookings = bookingsData.filter((b: Booking) => 
          b.payment_status === 'UNPAID'
        ).length;
        
        setStats(prev => ({
          ...prev,
          total_bookings: totalBookings,
          pending_bookings: pendingBookings,
        }));
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'MVR') => {
    return `${currency} ${amount.toFixed(2)}`;
  };

  const getConnectionStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '#10B981';
      case 'REQUESTED':
        return '#F59E0B';
      case 'REJECTED':
        return '#EF4444';
      case 'BLOCKED':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const renderConnectionCard = ({ item }: { item: AgentOwnerLink }) => (
    <TouchableOpacity
      style={styles.connectionCard}
      onPress={() => navigation.navigate('AgentOwnerDetail', { linkId: item.id })}
    >
      <View style={styles.connectionHeader}>
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionName}>{item.owner.brand_name}</Text>
          <Text style={styles.connectionContact}>{item.owner.name} • {item.owner.phone}</Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: getConnectionStatusColor(item.status) }
        ]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      
      <View style={styles.connectionDetails}>
        <View style={styles.creditInfo}>
          <Text style={styles.creditLabel}>Credit Limit</Text>
          <Text style={styles.creditAmount}>
            {formatCurrency(item.credit_limit, item.credit_currency)}
          </Text>
        </View>
        <View style={styles.creditInfo}>
          <Text style={styles.creditLabel}>Available</Text>
          <Text style={styles.creditAvailable}>
            {formatCurrency(item.credit_limit - 0, item.credit_currency)} {/* TODO: Calculate used credit */}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderRecentBooking = ({ item }: { item: Booking }) => (
    <TouchableOpacity
      style={styles.bookingCard}
      onPress={() => navigation.navigate('ViewBooking', { bookingId: item.id })}
    >
      <View style={styles.bookingHeader}>
        <Text style={styles.bookingCode}>{item.code}</Text>
        <Text style={styles.bookingAmount}>
          {formatCurrency(item.total, item.currency)}
        </Text>
      </View>
      <Text style={styles.bookingSchedule}>{item.schedule.name}</Text>
      <Text style={styles.bookingDate}>
        {new Date(item.schedule.date_time_start).toLocaleDateString()}
      </Text>
      <View style={styles.bookingStatus}>
        <View style={[
          styles.statusDot,
          { backgroundColor: item.payment_status === 'PAID' ? '#10B981' : '#F59E0B' }
        ]} />
        <Text style={styles.statusText}>
          {item.payment_status === 'PAID' ? 'Paid' : 'Pending Payment'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loadingContainer}>
          <FontAwesome5 name="spinner" size={24} color="#007AFF" />
          <Text style={styles.loadingText}>Loading dashboard...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <FontAwesome5 name="arrow-left" size={20} color="#007AFF" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Agent Dashboard</Text>
            <Text style={styles.headerSubtitle}>Welcome back, {user?.name}</Text>
          </View>
        </View>

        {/* Stats Overview */}
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <FontAwesome5 name="handshake" size={20} color="#FFF" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.active_connections}</Text>
                <Text style={styles.statLabel}>Active Connections</Text>
              </View>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <FontAwesome5 name="ticket-alt" size={20} color="#FFF" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>{stats.total_bookings}</Text>
                <Text style={styles.statLabel}>Total Bookings</Text>
              </View>
            </View>
            
            <View style={styles.statCard}>
              <View style={styles.statIcon}>
                <FontAwesome5 name="credit-card" size={20} color="#FFF" />
              </View>
              <View style={styles.statContent}>
                <Text style={styles.statValue}>
                  {formatCurrency(stats.total_credit_limit - stats.total_credit_used)}
                </Text>
                <Text style={styles.statLabel}>Available Credit</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Credit Summary */}
        <View style={styles.creditSection}>
          <Text style={styles.sectionTitle}>Credit Summary</Text>
          <View style={styles.creditCard}>
            <View style={styles.creditHeader}>
              <FontAwesome5 name="wallet" size={24} color="#007AFF" />
              <View style={styles.creditInfo}>
                <Text style={styles.creditTitle}>Total Credit Limit</Text>
                <Text style={styles.creditAmount}>
                  {formatCurrency(stats.total_credit_limit)}
                </Text>
              </View>
            </View>
            <View style={styles.creditBreakdown}>
              <View style={styles.creditRow}>
                <Text style={styles.creditLabel}>Used:</Text>
                <Text style={styles.creditUsed}>
                  {formatCurrency(stats.total_credit_used)}
                </Text>
              </View>
              <View style={styles.creditRow}>
                <Text style={styles.creditLabel}>Available:</Text>
                <Text style={styles.creditAvailable}>
                  {formatCurrency(stats.total_credit_limit - stats.total_credit_used)}
                </Text>
              </View>
            </View>
            {stats.next_due_date && (
              <View style={styles.dueDateInfo}>
                <FontAwesome5 name="calendar-exclamation" size={14} color="#F59E0B" />
                <Text style={styles.dueDateText}>
                  Next payment due: {new Date(stats.next_due_date).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsSection}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Search')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="search" size={20} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>Quick Book</Text>
              <Text style={styles.actionSubtitle}>Search and book trips</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AgentConnections')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="handshake" size={20} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>Connections</Text>
              <Text style={styles.actionSubtitle}>Manage owner relationships</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AgentBookings')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="list-alt" size={20} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>My Bookings</Text>
              <Text style={styles.actionSubtitle}>View all bookings</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('AgentAccountBook')}
            >
              <View style={styles.actionIcon}>
                <FontAwesome5 name="book" size={20} color="#007AFF" />
              </View>
              <Text style={styles.actionTitle}>Account Book</Text>
              <Text style={styles.actionSubtitle}>View ledger & payments</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Connected Owners */}
        {connections.length > 0 && (
          <View style={styles.connectionsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Connected Owners</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('AgentConnections')}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <FontAwesome5 name="chevron-right" size={12} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={connections.slice(0, 3)}
              renderItem={renderConnectionCard}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Recent Bookings */}
        {recentBookings.length > 0 && (
          <View style={styles.bookingsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Bookings</Text>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={() => navigation.navigate('AgentBookings')}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <FontAwesome5 name="chevron-right" size={12} color="#007AFF" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={recentBookings}
              renderItem={renderRecentBooking}
              keyExtractor={(item) => item.id.toString()}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Empty State for New Agents */}
        {connections.length === 0 && (
          <View style={styles.emptyState}>
            <FontAwesome5 name="handshake" size={48} color="#9CA3AF" />
            <Text style={styles.emptyTitle}>No Connections Yet</Text>
            <Text style={styles.emptyDescription}>
              Start by requesting connections with boat owners to begin booking on credit.
            </Text>
            <TouchableOpacity
              style={styles.emptyActionBtn}
              onPress={() => navigation.navigate('RequestConnection')}
            >
              <FontAwesome5 name="plus" size={16} color="#FFF" />
              <Text style={styles.emptyActionText}>Request Connection</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F8F9FA' },
  container: { padding: 16 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
    marginRight: 12,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#6B7280',
  },

  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#007AFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statContent: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  creditSection: {
    marginBottom: 24,
  },
  creditCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  creditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  creditInfo: {
    marginLeft: 12,
    flex: 1,
  },
  creditTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  creditAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#10B981',
  },
  creditBreakdown: {
    gap: 8,
    marginBottom: 12,
  },
  creditRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  creditLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  creditUsed: {
    fontSize: 14,
    fontWeight: '600',
    color: '#EF4444',
  },
  creditAvailable: {
    fontSize: 14,
    fontWeight: '600',
    color: '#10B981',
  },
  dueDateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  dueDateText: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
  },

  actionsSection: {
    marginBottom: 24,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F9FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
  },

  connectionsSection: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewAllText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
  },

  connectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  connectionContact: {
    fontSize: 13,
    color: '#6B7280',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
  },
  connectionDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  bookingsSection: {
    marginBottom: 24,
  },
  bookingCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bookingCode: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
  },
  bookingAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10B981',
  },
  bookingSchedule: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 4,
  },
  bookingDate: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 8,
  },
  bookingStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  emptyState: {
    alignItems: 'center',
    padding: 32,
    marginTop: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  emptyActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
  },
});