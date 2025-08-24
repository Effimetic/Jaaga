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
    
    // For now, show alert since search functionality will be implemented later
    Alert.alert("Search", `Searching for trips to ${destination.trim()}`);
  };

  const handleTabPress = (tabName: string) => {
    console.log('🔄 Tab pressed:', tabName);
    console.log('🔄 Current active tab:', activeTab);
    
    // Always set the active tab first
    setActiveTab(tabName);
    console.log('🔄 Setting active tab to:', tabName);
    
    // Handle any special navigation if needed
    if (tabName === "Profile" && user) {
      // For logged-in users, we could optionally navigate to a full profile screen
      // But for now, just show the tab content
      console.log("Profile tab selected for logged-in user");
    }
  };

  const renderTabContent = () => {
    console.log('🔄 Rendering tab content for:', activeTab);
    
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
                  
                  {user.role === 'owner' && (
                    <TouchableOpacity
                      style={styles.quickActionCard}
                      onPress={() => navigation?.navigate("Schedules")}
                    >
                      <FontAwesome5 name="calendar-alt" size={20} color="#F59E0B" />
                      <Text style={styles.quickActionText}>Schedules</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Quick Info */}
            <View style={styles.quickInfo}>
              <View style={styles.infoCard}>
                <FontAwesome5 name="ship" size={24} color="#007AFF" />
                <Text style={styles.infoTitle}>Speed Boats</Text>
                <Text style={styles.infoText}>Fast and comfortable travel</Text>
              </View>
              <View style={styles.infoCard}>
                <FontAwesome5 name="island-tropical" size={24} color="#10B981" />
                <Text style={styles.infoTitle}>Beautiful Islands</Text>
                <Text style={styles.infoText}>Explore paradise destinations</Text>
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
                <FontAwesome5 name="island-tropical" size={40} color="#10B981" />
                <Text style={styles.destinationName}>Maafushi</Text>
                <Text style={styles.destinationDetails}>Famous for water sports and beaches</Text>
              </View>
              <View style={styles.destinationCard}>
                <FontAwesome5 name="island-tropical" size={40} color="#007AFF" />
                <Text style={styles.destinationName}>Gulhi</Text>
                <Text style={styles.destinationDetails}>Perfect for snorkeling and diving</Text>
              </View>
              <View style={styles.destinationCard}>
                <FontAwesome5 name="island-tropical" size={40} color="#F59E0B" />
                <Text style={styles.destinationName}>Thulusdhoo</Text>
                <Text style={styles.destinationDetails}>Surfing paradise with crystal waters</Text>
              </View>
            </View>
          </View>
        );
      
      case "Profile":
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
                  
                  {user.role === 'owner' && (
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
                
                <TouchableOpacity 
                  style={styles.logoutButton}
                  onPress={() => {
                    // Handle logout
                    Alert.alert(
                      "Logout",
                      "Are you sure you want to logout?",
                      [
                        { text: "Cancel", style: "cancel" },
                        { 
                          text: "Logout", 
                          style: "destructive",
                          onPress: () => {
                            // TODO: Implement logout functionality
                            Alert.alert("Logout", "Logout functionality will be implemented here");
                          }
                        }
                      ]
                    );
                  }}
                >
                  <FontAwesome5 name="sign-out-alt" size={16} color="white" />
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </TouchableOpacity>
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
        return null;
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
        {user && (
          <TouchableOpacity style={styles.userButton} onPress={() => navigation?.navigate("Dashboard")}>
            <FontAwesome name="user-circle" size={24} color="#007AFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {["Home", "Boats", "Destinations", "Profile"].map((tab) => (
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
  safe: { flex: 1, backgroundColor: "#f6f8fa" },
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

  userButton: {
    padding: 8,
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
  contentContainer: { padding: 16, gap: 12 },
  tabContent: { alignItems: "center", paddingVertical: 8 },
  tabTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  tabSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 6, textAlign: "center" },
  searchSection: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  searchLabel: { fontWeight: "600", color: "#374151", marginTop: 8, marginBottom: 6, fontSize: 14 },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#fff",
  },
  searchIcon: { marginLeft: 12, marginRight: 8 },
  searchInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },
  searchButton: {
    width: '100%',
    height: 46,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
  },
  searchButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  quickInfo: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  infoCard: {
    alignItems: 'center',
    width: '30%',
  },
  infoTitle: { fontWeight: "700", color: "#111827", marginTop: 8 },
  infoText: { color: "#6b7280", marginTop: 4 },
  
  quickActionsSection: {
    width: '100%',
    marginTop: 20,
  },
  quickActionsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
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
  
  boatsList: { width: '100%', marginTop: 16 },
  boatCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  boatName: { fontWeight: "700", color: "#111827", marginTop: 8 },
  boatDetails: { color: "#6b7280", marginTop: 4 },
  destinationsList: { width: '100%', marginTop: 16 },
  destinationCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 12,
  },
  destinationName: { fontWeight: "700", color: "#111827", marginTop: 8 },
  destinationDetails: { color: "#6b7280", marginTop: 4 },
  profileInfo: {
    alignItems: 'center',
    marginTop: 16,
  },
  userName: { fontSize: 18, fontWeight: "700", color: "#111827", marginTop: 8 },
  userPhone: { fontSize: 14, color: "#6b7280", marginTop: 4 },

  authOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 16,
  },
  authButton: {
    flex: 1,
    height: 46,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: 5,
  },
  authButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  registerButtonStyle: {
    backgroundColor: "#10B981",
  },
  quickLinks: {
    width: '100%',
    marginTop: 16,
    alignItems: 'center',
  },
  quickLinksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
  },
  quickLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 46,
    borderRadius: 8,
    backgroundColor: '#f3f4f6',
    marginBottom: 10,
    paddingHorizontal: 12,
  },
  quickLinkText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#374151',
    marginLeft: 10,
  },
  logoutButton: {
    width: '100%',
    height: 46,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
  },
  logoutButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  guestInfo: {
    width: '100%',
    marginTop: 16,
    paddingHorizontal: 10,
  },
  guestInfoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  guestInfoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  guestInfoText: {
    fontSize: 14,
    color: '#6b7280',
    marginLeft: 8,
  },
});
