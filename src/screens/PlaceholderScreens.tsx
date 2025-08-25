import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Button, Card, Surface, Text } from 'react-native-paper';
import { spacing, theme } from '../theme/theme';

interface PlaceholderScreenProps {
  title: string;
  description: string;
  icon: string;
  navigation?: any;
}

const PlaceholderScreen: React.FC<PlaceholderScreenProps> = ({
  title,
  description,
  icon,
  navigation,
}) => {
  return (
    <View style={styles.container}>
      <Surface style={styles.surface} elevation={1}>
        <Card.Content style={styles.content}>
          <MaterialCommunityIcons
            name={icon as any}
            size={64}
            color={theme.colors.primary}
            style={styles.icon}
          />
          <Text variant="headlineMedium" style={styles.title}>
            {title}
          </Text>
          <Text variant="bodyLarge" style={styles.description}>
            {description}
          </Text>
          <Text variant="bodyMedium" style={styles.comingSoon}>
            Coming soon...
          </Text>
          {navigation && (
            <Button
              mode="outlined"
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            >
              Go Back
            </Button>
          )}
        </Card.Content>
      </Surface>
    </View>
  );
};

// Individual screen components


export const MyBookingsScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <PlaceholderScreen
    title="My Bookings"
    description="View your booking history, upcoming trips, and manage your reservations."
    icon="book-open"
    navigation={navigation}
  />
);

export const ProfileScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <PlaceholderScreen
    title="Profile"
    description="Manage your account settings, payment methods, and personal information."
    icon="account"
    navigation={navigation}
  />
);

export const AgentDashboardScreen: React.FC<{ navigation: any }> = ({ navigation }) => (
  <PlaceholderScreen
    title="Agent Portal"
    description="Access your agent dashboard, manage connections with boat owners, view credit status, and book tickets for customers."
    icon="account-tie"
    navigation={navigation}
  />
);





const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  surface: {
    borderRadius: 16,
    backgroundColor: theme.colors.surface,
  },
  content: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  icon: {
    marginBottom: spacing.lg,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: spacing.md,
    color: theme.colors.onSurface,
  },
  description: {
    textAlign: 'center',
    marginBottom: spacing.lg,
    opacity: 0.8,
    lineHeight: 24,
  },
  paramInfo: {
    textAlign: 'center',
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: theme.colors.surfaceVariant,
    borderRadius: 8,
    fontFamily: 'monospace',
  },
  comingSoon: {
    textAlign: 'center',
    fontStyle: 'italic',
    opacity: 0.6,
    marginBottom: spacing.lg,
  },
  backButton: {
    marginTop: spacing.md,
  },
});
