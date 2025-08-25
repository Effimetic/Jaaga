import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { FontAwesome5, FontAwesome } from "@expo/vector-icons";
import { useAuth } from "../contexts/AuthContext";

export default function HomeScreen({ navigation }: { navigation?: any }) {
  const { user, canAccessFeature } = useAuth();
  const [destination, setDestination] = useState("");
  const [activeTab, setActiveTab] = useState("Home");

  const handleSearch = () => {
    if (!destination.trim()) {
      Alert.alert("Destination Required", "Please enter where you want to go.");
      return;
    }
    
    // Navigate to search screen with destination
    navigation?.navigate("SearchScreen", { destination: destination.trim() });
  };

  const handleTabPress = (tabName: string) => {
    console.log('🔄 Tab pressed:', tabName);
    setActiveTab(tabName);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "Home":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Welcome to Nashath Booking</Text>
            <Text style={styles.tabSubtitle}>
              Your gateway to exploring the beautiful islands of Maldives by sea
            </Text>
            
            {/* Search Section */}
            <View style={styles.searchSection}>
              <Text style={styles.searchLabel}>Where do you want to go?</Text>
              <View style={styles.searchInputContainer}>
                <FontAwesome5 name="map-marker-alt" size={20} color="#007AFF" style={styles.searchIcon} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Enter destination (e.g., Maafushi, Gulhi, Thulusdhoo)"
                  value={destination}
                  onChangeText={setDestination}
                  placeholderTextColor="#999"
                />
              </View>
              <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
                <FontAwesome5 name="search" size={16} color="white" />
                <Text style={styles.searchButtonText}>Search Trips</Text>
              </TouchableOpacity>
            </View>

            {/* Quick Actions for Authenticated Users */}
            {user && (
              <View style={styles.quickActionsSection}>
                <Text style={styles.quickActionsTitle}>Quick Actions</Text>
                <View style={styles.quickActionsGrid}>
                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => navigation?.navigate("MyBookings")}
                  >
                    <FontAwesome5 name="list-alt" size={20} color="#007AFF" />
                    <Text style={styles.quickActionText}>My Bookings</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.quickActionCard}
                    onPress={() => navigation?.navigate("Dashboard")}
                  >
                    <FontAwesome5 name="tachometer-alt" size={20} color="#10B981" />
                    <Text style={styles.quickActionText}>Dashboard</Text>
                  </TouchableOpacity>
                  
                  {canAccessFeature('boat_management') && (
                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => navigation?.navigate("MyBoats")}
                    >
                      <FontAwesome5 name="ship" size={20} color="#8B5CF6" />
                      <Text style={styles.quickActionText}>My Boats</Text>
                    </TouchableOpacity>
                  )}
                  
                  {(user.role === 'owner' || user.role === 'OWNER') && (
                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => navigation?.navigate("ScheduleManagement")}
                    >
                      <FontAwesome5 name="calendar-alt" size={20} color="#F59E0B" />
                      <Text style={styles.quickActionText}>Schedules</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Authentication Section for Non-logged Users */}
            {!user && (
              <View style={styles.authSection}>
                <Text style={styles.authTitle}>Get Started</Text>
                <Text style={styles.authSubtitle}>Login or register to book tickets</Text>
                
                <View style={styles.authButtons}>
                  <TouchableOpacity 
                    style={styles.authButton}
                    onPress={() => navigation?.navigate("Login")}
                  >
                    <FontAwesome5 name="sign-in-alt" size={16} color="white" />
                    <Text style={styles.authButtonText}>Login</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.authButton, styles.registerButton]}
                    onPress={() => navigation?.navigate("Register")}
                  >
                    <FontAwesome5 name="user-plus" size={16} color="white" />
                    <Text style={styles.authButtonText}>Register</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Features Section */}
            <View style={styles.featuresSection}>
              <Text style={styles.featuresTitle}>Why Choose Nashath Booking?</Text>
              <View style={styles.featuresList}>
                <View style={styles.featureItem}>
                  <FontAwesome5 name="sms" size={20} color="#007AFF" />
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Easy SMS Login</Text>
                    <Text style={styles.featureText}>Quick and secure login with SMS verification</Text>
                  </View>
                </View>
                
                <View style={styles.featureItem}>
                  <FontAwesome5 name="credit-card" size={20} color="#10B981" />
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>Secure Payments</Text>
                    <Text style={styles.featureText}>Multiple payment options including BML integration</Text>
                  </View>
                </View>
                
                <View style={styles.featureItem}>
                  <FontAwesome5 name="qrcode" size={20} color="#F59E0B" />
                  <View style={styles.featureContent}>
                    <Text style={styles.featureTitle}>QR Code Tickets</Text>
                    <Text style={styles.featureText}>Digital tickets with QR codes for easy validation</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        );
      
      case "Boats":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Available Boats</Text>
            <Text style={styles.tabSubtitle}>Modern speed boats for your journey</Text>
            
            <View style={styles.boatsList}>
              <View style={styles.boatCard}>
                <FontAwesome5 name="ship" size={40} color="#007AFF" />
                <Text style={styles.boatName}>Speed Boat Alpha</Text>
                <Text style={styles.boatDetails}>25 seats • Air conditioned</Text>
              </View>
              <View style={styles.boatCard}>
                <FontAwesome5 name="ship" size={40} color="#10B981" />
                <Text style={styles.boatName}>Speed Boat Beta</Text>
                <Text style={styles.boatDetails}>30 seats • Premium service</Text>
              </View>
              <View style={styles.boatCard}>
                <FontAwesome5 name="ship" size={40} color="#F59E0B" />
                <Text style={styles.boatName}>Speed Boat Gamma</Text>
                <Text style={styles.boatDetails}>20 seats • Express service</Text>
              </View>
            </View>
          </View>
        );
      
      case "Destinations":
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Popular Destinations</Text>
            <Text style={styles.tabSubtitle}>Discover amazing islands in Maldives</Text>
            
            <View style={styles.destinationsList}>
              <View style={styles.destinationCard}>
                <FontAwesome5 name="umbrella-beach" size={40} color="#10B981" />
                <Text style={styles.destinationName}>Maafushi</Text>
                <Text style={styles.destinationDetails}>Famous for water sports and beaches</Text>
              </View>
              <View style={styles.destinationCard}>
                <FontAwesome5 name="umbrella-beach" size={40} color="#007AFF" />
                <Text style={styles.destinationName}>Gulhi</Text>
                <Text style={styles.destinationDetails}>Perfect for snorkeling and diving</Text>
              </View>
              <View style={styles.destinationCard}>
                <FontAwesome5 name="umbrella-beach" size={40} color="#F59E0B" />
                <Text style={styles.destinationName}>Thulusdhoo</Text>
                <Text style={styles.destinationDetails}>Surfing paradise with crystal waters</Text>
              </View>
            </View>
          </View>
        );
      

        return (
          <View style={styles.tabContent}>
            {user ? (
              <>
                <Text style={styles.tabTitle}>Welcome Back!</Text>
                <Text style={styles.tabSubtitle}>Manage your account and bookings</Text>
                
                <View style={styles.profileInfo}>
                  <FontAwesome5 name="user-circle" size={60} color="#007AFF" />
                  <Text style={styles.userName}>{user.name}</Text>
                  <Text style={styles.userPhone}>{user.phone}</Text>
                  <Text style={styles.userRole}>
                    {user.role === 'public' && 'Public User'}
                    {user.role === 'agent' && 'Agent User'}
                    {user.role === 'owner' && 'Boat Owner'}
                    {user.role === 'PUBLIC' && 'Public User'}
                    {user.role === 'AGENT' && 'Agent User'}
                    {user.role === 'OWNER' && 'Boat Owner'}
                  </Text>
                </View>
                
                {/* Quick Links for Logged-in Users */}
                <View style={styles.quickLinks}>
                  <Text style={styles.quickLinksTitle}>Quick Actions</Text>
                  
                  <TouchableOpacity 
                    style={styles.quickLinkButton}
                    onPress={() => navigation?.navigate("Dashboard")}
                  >
                    <FontAwesome5 name="tachometer-alt" size={20} color="#007AFF" />
                    <Text style={styles.quickLinkText}>Dashboard</Text>
                  </TouchableOpacity>
                  
                  {canAccessFeature('boat_management') && (
                    <TouchableOpacity 
                      style={styles.quickLinkButton}
                      onPress={() => navigation?.navigate("MyBoats")}
                    >
                      <FontAwesome5 name="ship" size={20} color="#10B981" />
                      <Text style={styles.quickLinkText}>My Boats</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity 
                    style={styles.quickLinkButton}
                    onPress={() => navigation?.navigate("MyBookings")}
                  >
                    <FontAwesome5 name="list-alt" size={20} color="#F59E0B" />
                    <Text style={styles.quickLinkText}>My Bookings</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.quickLinkButton}
                    onPress={() => navigation?.navigate("Settings")}
                  >
                    <FontAwesome5 name="cog" size={20} color="#6B7280" />
                    <Text style={styles.quickLinkText}>Settings</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <>
                <Text style={styles.tabTitle}>Profile</Text>
                <Text style={styles.tabSubtitle}>Login or register to access your profile</Text>
                
                <View style={styles.authOptions}>
                  <TouchableOpacity 
                    style={styles.authButton}
                    onPress={() => navigation?.navigate("Login")}
                  >
                    <FontAwesome5 name="sign-in-alt" size={16} color="white" />
                    <Text style={styles.authButtonText}>Login</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[styles.authButton, styles.registerButtonStyle]}
                    onPress={() => navigation?.navigate("Register")}
                  >
                    <FontAwesome5 name="user-plus" size={16} color="white" />
                    <Text style={styles.authButtonText}>Register</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.guestInfo}>
                  <Text style={styles.guestInfoTitle}>Why Create an Account?</Text>
                  <View style={styles.guestInfoItem}>
                    <FontAwesome5 name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.guestInfoText}>Book and manage your trips</Text>
                  </View>
                  <View style={styles.guestInfoItem}>
                    <FontAwesome5 name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.guestInfoText}>View booking history</Text>
                  </View>
                  <View style={styles.guestInfoItem}>
                    <FontAwesome5 name="check-circle" size={16} color="#10B981" />
                    <Text style={styles.guestInfoText}>Get notifications and updates</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        );
      
      default:
        return (
          <View style={styles.tabContent}>
            <Text style={styles.tabTitle}>Coming Soon</Text>
            <Text style={styles.tabSubtitle}>This section is under development</Text>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <FontAwesome name="ship" size={24} color="#007AFF" />
          <Text style={styles.headerTitle}>Nashath Booking</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {["Home", "Boats", "Destinations"].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => handleTabPress(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F8F9FA" },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 8,
  },


  tabContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: '#fff',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeTabText: {
    color: '#007AFF',
  },

  content: { flex: 1 },
  contentContainer: { 
    padding: 16,
    paddingBottom: 100, // Add extra bottom padding for bottom navigation
  },
  
  tabContent: { 
    alignItems: "center", 
    paddingVertical: 8,
    minHeight: 400,
  },
  tabTitle: { 
    fontSize: 24, 
    fontWeight: "700", 
    color: "#111827",
    textAlign: 'center',
    marginBottom: 8,
  },
  tabSubtitle: { 
    fontSize: 14, 
    color: "#6b7280", 
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },

  searchSection: {
    width: '100%',
    marginBottom: 32,
  },
  searchLabel: { 
    fontWeight: "600", 
    color: "#374151", 
    marginBottom: 12, 
    fontSize: 16,
    textAlign: 'center',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#fff",
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  searchIcon: { 
    marginLeft: 16, 
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 16,
    fontSize: 16,
    color: "#111827",
  },
  searchButton: {
    width: '100%',
    height: 50,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    shadowColor: '#007AFF',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  searchButtonText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16,
  },

  quickActionsSection: {
    width: '100%',
    marginBottom: 32,
  },
  quickActionsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickActionCard: {
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
  quickActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#374151',
    marginTop: 8,
    textAlign: 'center',
  },

  authSection: {
    width: '100%',
    marginBottom: 32,
    alignItems: 'center',
  },
  authTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  authSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
  },
  authButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: 12,
  },
  authButton: {
    flex: 1,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  registerButton: {
    backgroundColor: "#10B981",
  },
  authButtonText: { 
    color: "#fff", 
    fontWeight: "700", 
    fontSize: 16,
  },

  authOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
    gap: 12,
  },
  registerButtonStyle: {
    backgroundColor: "#10B981",
  },

  profileInfo: {
    alignItems: 'center',
    marginBottom: 24,
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  userName: { 
    fontSize: 20, 
    fontWeight: "700", 
    color: "#111827", 
    marginTop: 12,
    marginBottom: 4,
  },
  userPhone: { 
    fontSize: 14, 
    color: "#6b7280", 
    marginBottom: 4,
  },
  userRole: {
    fontSize: 14,
    color: "#007AFF",
    fontWeight: '600',
  },

  quickLinks: {
    width: '100%',
    alignItems: 'center',
  },
  quickLinksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  quickLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
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
  quickLinkText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 12,
  },

  guestInfo: {
    width: '100%',
    marginTop: 24,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  guestInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  guestInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guestInfoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 12,
    flex: 1,
  },

  featuresSection: {
    width: '100%',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  featuresList: {
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  featureContent: {
    marginLeft: 16,
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  featureText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },

  boatsList: { 
    width: '100%', 
    gap: 16,
  },
  boatCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  boatName: { 
    fontWeight: "700", 
    color: "#111827", 
    marginTop: 12,
    fontSize: 16,
  },
  boatDetails: { 
    color: "#6b7280", 
    marginTop: 4,
    fontSize: 14,
  },

  destinationsList: { 
    width: '100%', 
    gap: 16,
  },
  destinationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  destinationName: { 
    fontWeight: "700", 
    color: "#111827", 
    marginTop: 12,
    fontSize: 16,
  },
  destinationDetails: { 
    color: "#6b7280", 
    marginTop: 4,
    fontSize: 14,
    textAlign: 'center',
  },
});