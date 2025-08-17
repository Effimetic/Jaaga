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
  const { user } = useAuth();
  const [destination, setDestination] = useState("");
  const [activeTab, setActiveTab] = useState("Home");

  const handleSearch = () => {
    if (!destination.trim()) {
      Alert.alert("Destination Required", "Please enter where you want to go.");
      return;
    }
    
    Alert.alert("Search", `Searching for trips to ${destination}`);
    // TODO: Implement search functionality
  };

  const handleTabPress = (tabName: string) => {
    if (tabName === "Profile") {
      if (!user) {
        // Show login/register options for non-authenticated users
        Alert.alert(
          "Profile",
          "Please login or register to access your profile",
          [
            { text: "Cancel", style: "cancel" },
            { text: "Login", onPress: () => navigation?.navigate("Login") },
            { text: "Register", onPress: () => navigation?.navigate("Register") },
          ]
        );
      } else {
        // Navigate to profile for authenticated users
        navigation?.navigate("Profile");
      }
    } else {
      setActiveTab(tabName);
      // TODO: Handle other tab navigation
    }
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
                
                <TouchableOpacity 
                  style={styles.profileButton}
                  onPress={() => navigation?.navigate("Dashboard")}
                >
                  <FontAwesome5 name="tachometer-alt" size={16} color="white" />
                  <Text style={styles.profileButtonText}>Go to Dashboard</Text>
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
        {!user ? (
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.loginButton} onPress={() => navigation?.navigate("Login")}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.registerButton} onPress={() => navigation?.navigate("Register")}>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          </View>
        ) : (
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
  headerRight: {
    flexDirection: 'row',
    gap: 8,
  },
  loginButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  registerButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#10B981',
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
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
  profileButton: {
    width: '100%',
    height: 46,
    borderRadius: 8,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 12,
  },
  profileButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
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
});
