import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import {
    Button,
    Card,
    Chip,
    Modal,
    Portal,
    Searchbar,
    Surface,
    Text,
    TextInput,
} from 'react-native-paper';
import { useAuth } from '../contexts/AuthContext';
import {
    agentManagementService,
    OwnerSearchResult
} from '../services/agentManagementService';
import { colors, spacing, theme } from '../theme/theme';

interface ConnectionRequestForm {
  message: string;
  requestedCreditLimit: string;
}

export const FindOwnersScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const { user } = useAuth();
  const [owners, setOwners] = useState<OwnerSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOwner, setSelectedOwner] = useState<OwnerSearchResult | null>(null);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [connectionForm, setConnectionForm] = useState<ConnectionRequestForm>({
    message: '',
    requestedCreditLimit: '5000',
  });
  const [sendingRequest, setSendingRequest] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadOwners();
    }, [loadOwners])
  );

  const loadOwners = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const result = await agentManagementService.searchOwners(user.id, {
        search: searchQuery.trim() || undefined,
      });

      if (result.success) {
        setOwners(result.data || []);
      } else {
        Alert.alert('Error', result.error || 'Failed to load owners');
      }
    } catch (error) {
      console.error('Failed to load owners:', error);
      Alert.alert('Error', 'Failed to load owners');
    } finally {
      setLoading(false);
    }
  }, [user?.id, searchQuery]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadOwners();
    setRefreshing(false);
  };

  const handleSearch = () => {
    loadOwners();
  };

  const getConnectionStatusColor = (status?: string) => {
    switch (status) {
      case 'connected':
        return colors.success;
      case 'pending':
        return colors.warning;
      default:
        return theme.colors.onSurfaceVariant;
    }
  };

  const getConnectionStatusText = (status?: string) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'pending':
        return 'Pending';
      default:
        return 'Connect';
    }
  };

  const getConnectionStatusIcon = (status?: string) => {
    switch (status) {
      case 'connected':
        return 'check-circle';
      case 'pending':
        return 'clock-outline';
      default:
        return 'plus-circle';
    }
  };

  const handleConnectPress = (owner: OwnerSearchResult) => {
    if (owner.connection_status === 'connected') {
      navigation.navigate('SearchBoats', { ownerId: owner.id });
      return;
    }

    if (owner.connection_status === 'pending') {
      Alert.alert(
        'Connection Pending',
        'Your connection request is pending approval from this owner.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Show connection request modal
    setSelectedOwner(owner);
    setConnectionForm({
      message: `Hello ${owner.brand_name || owner.business_name},\n\nI am a travel agent interested in partnering with you to offer ferry services to my customers. I would like to request access to book tickets on your boats with credit terms.\n\nLooking forward to a fruitful partnership.`,
      requestedCreditLimit: '5000',
    });
    setShowConnectionModal(true);
  };

  const handleSendConnectionRequest = async () => {
    if (!selectedOwner || !user?.id) return;

    const creditLimit = parseFloat(connectionForm.requestedCreditLimit);
    if (isNaN(creditLimit) || creditLimit < 0) {
      Alert.alert('Invalid Input', 'Please enter a valid credit limit amount.');
      return;
    }

    try {
      setSendingRequest(true);

      const result = await agentManagementService.sendConnectionRequest({
        agent_id: user.id,
        owner_id: selectedOwner.id,
        message: connectionForm.message.trim(),
        requested_credit_limit: creditLimit,
      });

      if (result.success) {
        Alert.alert(
          'Request Sent!',
          'Your connection request has been sent to the owner. You will be notified when they respond.',
          [{ text: 'OK', onPress: () => {
            setShowConnectionModal(false);
            loadOwners(); // Refresh to update status
          }}]
        );
      } else {
        Alert.alert('Error', result.error || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Connection request failed:', error);
      Alert.alert('Error', 'Failed to send connection request');
    } finally {
      setSendingRequest(false);
    }
  };

  const formatCurrency = (amount: number) => `MVR ${amount.toFixed(0)}`;

  const renderOwnerCard = (owner: OwnerSearchResult) => (
    <Card key={owner.id} style={styles.ownerCard}>
      <Card.Content style={styles.ownerContent}>
        <View style={styles.ownerHeader}>
          <View style={styles.ownerInfo}>
            <Text variant="titleMedium" style={styles.ownerName}>
              {owner.brand_name || owner.business_name}
            </Text>
            {owner.brand_name && owner.business_name && owner.brand_name !== owner.business_name && (
              <Text variant="bodySmall" style={styles.businessName}>
                {owner.business_name}
              </Text>
            )}
            {owner.description && (
              <Text variant="bodySmall" style={styles.ownerDescription} numberOfLines={2}>
                {owner.description}
              </Text>
            )}
          </View>

          <Chip
            mode={owner.connection_status === 'connected' ? 'flat' : 'outlined'}
            style={[
              styles.statusChip,
              owner.connection_status === 'connected' && {
                backgroundColor: getConnectionStatusColor(owner.connection_status) + '20'
              }
            ]}
            textStyle={{
              color: getConnectionStatusColor(owner.connection_status),
              fontSize: 11,
            }}
            icon={() => (
              <MaterialCommunityIcons
                name={getConnectionStatusIcon(owner.connection_status)}
                size={14}
                color={getConnectionStatusColor(owner.connection_status)}
              />
            )}
          >
            {getConnectionStatusText(owner.connection_status)}
          </Chip>
        </View>

        <View style={styles.ownerDetails}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="phone" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={styles.detailText}>
              {owner.phone || 'No phone'}
            </Text>
          </View>

          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="email" size={16} color={theme.colors.primary} />
            <Text variant="bodySmall" style={styles.detailText}>
              {owner.email || 'No email'}
            </Text>
          </View>

          {owner.connection_status === 'connected' && (
            <View style={styles.creditInfo}>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="credit-card" size={16} color={colors.success} />
                <Text variant="bodySmall" style={[styles.detailText, { color: colors.success }]}>
                  Credit: {formatCurrency(owner.credit_balance || 0)}
                </Text>
              </View>
              <View style={styles.detailItem}>
                <MaterialCommunityIcons name="bank" size={16} color={theme.colors.primary} />
                <Text variant="bodySmall" style={styles.detailText}>
                  Limit: {formatCurrency(owner.credit_limit || 0)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.ownerActions}>
          <Button
            mode={owner.connection_status === 'connected' ? 'contained' : 'outlined'}
            onPress={() => handleConnectPress(owner)}
            style={styles.connectButton}
            disabled={owner.connection_status === 'pending'}
          >
            {owner.connection_status === 'connected' ? 'Book Now' : 
             owner.connection_status === 'pending' ? 'Pending' : 'Connect'}
          </Button>
          
          <Button
            mode="text"
            onPress={() => navigation.navigate('OwnerProfile', { ownerId: owner.id })}
            compact
          >
            View Profile
          </Button>
        </View>
      </Card.Content>
    </Card>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <MaterialCommunityIcons
        name="account-search-outline"
        size={64}
        color={theme.colors.onSurfaceVariant}
      />
      <Text variant="headlineSmall" style={styles.emptyTitle}>
        {searchQuery.trim() ? 'No owners found' : 'Find Boat Owners'}
      </Text>
      <Text variant="bodyMedium" style={styles.emptySubtitle}>
        {searchQuery.trim() 
          ? 'Try adjusting your search terms'
          : 'Search for boat owners to connect with and start booking ferry services'
        }
      </Text>
    </View>
  );

  const renderConnectionModal = () => (
    <Portal>
      <Modal
        visible={showConnectionModal}
        onDismiss={() => setShowConnectionModal(false)}
        contentContainerStyle={styles.modalContainer}
      >
        <Surface style={styles.modalContent}>
          <Text variant="headlineSmall" style={styles.modalTitle}>
            Connect with {selectedOwner?.brand_name || selectedOwner?.business_name}
          </Text>

          <Text variant="bodyMedium" style={styles.modalSubtitle}>
            Send a connection request to start booking with this owner.
          </Text>

          <TextInput
            label="Requested Credit Limit (MVR)"
            value={connectionForm.requestedCreditLimit}
            onChangeText={(text) => setConnectionForm({ ...connectionForm, requestedCreditLimit: text })}
            mode="outlined"
            style={styles.modalInput}
            keyboardType="numeric"
            placeholder="5000"
          />

          <TextInput
            label="Message to Owner"
            value={connectionForm.message}
            onChangeText={(text) => setConnectionForm({ ...connectionForm, message: text })}
            mode="outlined"
            style={styles.modalInput}
            multiline
            numberOfLines={6}
            placeholder="Introduce yourself and explain why you want to connect..."
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowConnectionModal(false)}
              style={styles.modalButton}
              disabled={sendingRequest}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              onPress={handleSendConnectionRequest}
              style={styles.modalButton}
              loading={sendingRequest}
              disabled={sendingRequest}
            >
              Send Request
            </Button>
          </View>
        </Surface>
      </Modal>
    </Portal>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Search Bar */}
        <Searchbar
          placeholder="Search boat owners by name, location..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          onSubmitEditing={handleSearch}
          style={styles.searchBar}
          icon="account-search"
        />

        {/* Owners List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <Text variant="bodyMedium">Loading owners...</Text>
          </View>
        ) : owners.length > 0 ? (
          <View style={styles.ownersList}>
            {owners.map(renderOwnerCard)}
          </View>
        ) : (
          renderEmptyState()
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>

      {renderConnectionModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  searchBar: {
    margin: spacing.md,
    elevation: 2,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  ownersList: {
    paddingHorizontal: spacing.md,
    gap: spacing.md,
  },
  ownerCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  ownerContent: {
    padding: spacing.md,
  },
  ownerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  ownerInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  ownerName: {
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  businessName: {
    opacity: 0.7,
    marginBottom: spacing.xs,
  },
  ownerDescription: {
    opacity: 0.8,
    lineHeight: 18,
  },
  statusChip: {
    height: 28,
  },
  ownerDetails: {
    marginBottom: spacing.md,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  detailText: {
    flex: 1,
  },
  creditInfo: {
    marginTop: spacing.sm,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.outline,
  },
  ownerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  connectButton: {
    flex: 1,
    marginRight: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginTop: spacing.xl,
  },
  emptyTitle: {
    fontWeight: 'bold',
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    opacity: 0.7,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  modalContainer: {
    justifyContent: 'center',
    padding: spacing.md,
  },
  modalContent: {
    borderRadius: 16,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalTitle: {
    fontWeight: 'bold',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    opacity: 0.8,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  modalInput: {
    marginBottom: spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  modalButton: {
    flex: 1,
  },
  bottomSpacing: {
    height: 80,
  },
});
