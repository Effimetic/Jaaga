// SearchScreen.tsx
// Expo React Native version of your "Welcome / Search Boats" page
// - Wire API via process.env.EXPO_PUBLIC_API_URL (see notes below)
// - Replace mock lists/fetches with your real endpoints

import React, { useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FontAwesome5, FontAwesome } from "@expo/vector-icons";

// ---------- CONFIG ----------
const API_BASE =
  process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, "") || "https://your-backend.example.com";

type IslandKey =
  | "male"
  | "hulhumale"
  | "villimale"
  | "maafushi"
  | "gulhi"
  | "thulusdhoo";

const ISLAND_LABELS: Record<IslandKey, string> = {
  male: "Male",
  hulhumale: "Hulhumale",
  villimale: "Villimale",
  maafushi: "Maafushi",
  gulhi: "Gulhi",
  thulusdhoo: "Thulusdhoo",
};

// TO options depend on FROM (like your script)
const TO_BY_FROM: Partial<Record<IslandKey, IslandKey[]>> = {
  male: ["maafushi", "gulhi", "thulusdhoo", "hulhumale", "villimale"],
  // add more mappings if needed
};

// Mock data (replace with API data if desired)
const POPULAR_ROUTES = [
  { from: "Male", to: "Maafushi", price: "150", duration: "45", desc: "Popular tourist destination" },
  { from: "Male", to: "Gulhi", price: "120", duration: "35", desc: "Perfect for day trips and snorkeling" },
  { from: "Male", to: "Thulusdhoo", price: "180", duration: "60", desc: "Famous for surfing and beaches" },
];

const BOATS = [
  { name: "Alpha", seats: 25 },
  { name: "Beta", seats: 30 },
  { name: "Gamma", seats: 20 },
  { name: "Delta", seats: 35 },
];

// ---------- SCREEN ----------
export default function SearchScreen({ navigation }: { navigation?: any }) {
  const [fromIsland, setFromIsland] = useState<IslandKey | "">("");
  const [toIsland, setToIsland] = useState<IslandKey | "">("");
  const [passengers, setPassengers] = useState<string>("1");
  const [date, setDate] = useState<string>("");

  const toOptions = useMemo<IslandKey[]>(() => {
    if (!fromIsland) return [];
    const list = TO_BY_FROM[fromIsland] || [];
    // reset TO if not in new list
    if (toIsland && !list.includes(toIsland)) setToIsland("");
    return list;
  }, [fromIsland, toIsland]);

  const handleSearch = async () => {
    if (!fromIsland || !toIsland || !date || !passengers) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (fromIsland === toIsland) {
      Alert.alert("Invalid route", "From and To cannot be the same.");
      return;
    }

    // Check if user is logged in
    if (!navigation) {
      Alert.alert("Login Required", "Please login to search for schedules and book tickets.");
      return;
    }

    // Navigate to schedules list with search parameters
    navigation.navigate("Schedules", {
      from: fromIsland,
      to: toIsland,
      date: date,
      passengers,
    });

    Alert.alert(
      "Searching…",
      `From ${ISLAND_LABELS[fromIsland]} to ${ISLAND_LABELS[toIsland]} on ${date} for ${passengers} passenger(s).`
    );
  };

  const handleLoginPress = () => {
    if (navigation) {
      navigation.navigate("Login");
    }
  };

  const handleRegisterPress = () => {
    if (navigation) {
      navigation.navigate("Register");
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        {/* Header with Login/Register */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <FontAwesome name="ship" size={24} color="#007AFF" />
            <Text style={styles.headerTitle}>Nashath Booking</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.loginButton} onPress={handleLoginPress}>
              <Text style={styles.loginButtonText}>Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.registerButton} onPress={handleRegisterPress}>
              <Text style={styles.registerButtonText}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>



        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>
            <FontAwesome name="ship" size={20} style={styles.primary} />{" "}
            Discover Maldives by Sea
          </Text>
          <Text style={styles.heroSubtitle}>
            Book speed boat tickets to explore the beautiful islands of Maldives
          </Text>
        </View>

        {/* Search Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardHeaderText}>Search for Boats</Text>
          </View>
          <View style={styles.cardBody}>
            {/* FROM */}
            <Text style={styles.label}>From</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Select departure island"
                value={fromIsland ? ISLAND_LABELS[fromIsland] : ""}
                onFocus={() => {
                  // Show island selection modal or navigate to selection screen
                  Alert.alert("Select Island", "From: " + Object.values(ISLAND_LABELS).join(", "));
                }}
              />
            </View>

            {/* TO */}
            <Text style={styles.label}>To</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Select destination island"
                value={toIsland ? ISLAND_LABELS[toIsland] : ""}
                onFocus={() => {
                  if (!fromIsland) {
                    Alert.alert("Error", "Please select departure island first");
                    return;
                  }
                  // Show island selection modal
                  Alert.alert("Select Island", "To: " + toOptions.map(k => ISLAND_LABELS[k]).join(", "));
                }}
                editable={!!fromIsland}
              />
            </View>

            {/* DATE */}
            <Text style={styles.label}>Travel Date</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={date}
                onChangeText={setDate}
              />
            </View>

            {/* PASSENGERS */}
            <Text style={styles.label}>Passengers</Text>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Number of passengers"
                value={passengers}
                onChangeText={setPassengers}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSearch}>
              <FontAwesome5 name="search" size={16} style={styles.btnIcon} />
              <Text style={styles.btnText}>Search Boats</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Popular Routes */}
        <View style={styles.sectionCenter}>
          <Text style={styles.sectionTitle}>Popular Routes</Text>
          <Text style={styles.sectionSub}>Most traveled routes in the Maldives</Text>
        </View>
        <FlatList
          data={POPULAR_ROUTES}
          scrollEnabled={false}
          keyExtractor={(_, i) => `route-${i}`}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
                  }}
                  style={styles.cardImg}
                />
                <View style={styles.cardCol}>
                  <Text style={styles.cardTitle}>
                    {item.from} → {item.to}{" "}
                    <Text style={styles.badgeSuccess}>MVR {item.price}</Text>
                  </Text>
                  <Text style={styles.muted}>
                    <FontAwesome5 name="clock" /> {item.duration} minutes
                  </Text>
                  <Text style={styles.smallMuted}>{item.desc}</Text>
                </View>
              </View>
            </View>
          )}
        />

        {/* Available Boats */}
        <View style={styles.sectionCenter}>
          <Text style={styles.sectionTitle}>Available Boats</Text>
          <Text style={styles.sectionSub}>Modern speed boats with comfortable seating</Text>
        </View>
        <FlatList
          data={BOATS}
          scrollEnabled={false}
          keyExtractor={(b) => b.name}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Image
                  source={{
                    uri: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=400",
                  }}
                  style={styles.cardImg}
                />
                <View style={styles.cardCol}>
                  <Text style={styles.cardTitle}>Speed Boat {item.name}</Text>
                  <Text style={styles.muted}>
                    <FontAwesome5 name="user-friends" /> {item.seats} passengers
                  </Text>
                  <View style={styles.badgeRow}>
                    <Text style={[styles.badge, styles.bgSuccess]}>AC</Text>
                    <Text style={[styles.badge, styles.bgInfo]}>WiFi</Text>
                    <Text style={[styles.badge, styles.bgWarn]}>Refreshments</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        />

        {/* Features */}
        <View style={styles.sectionCenter}>
          <Text style={styles.sectionTitle}>Why Choose Nashath Booking?</Text>
          <Text style={styles.sectionSub}>
            Experience seamless speed boat ticketing across the Maldives
          </Text>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.circleIcon}>
            <FontAwesome5 name="sms" size={18} color="#fff" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Easy SMS Login</Text>
            <Text style={styles.smallMuted}>
              Quick and secure login with SMS verification. No passwords to remember!
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.circleIcon}>
            <FontAwesome5 name="credit-card" size={18} color="#fff" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>Secure Payments</Text>
            <Text style={styles.smallMuted}>
              Multiple payment options including BML integration.
            </Text>
          </View>
        </View>

        <View style={styles.featureItem}>
          <View style={styles.circleIcon}>
            <FontAwesome5 name="qrcode" size={18} color="#fff" />
          </View>
          <View style={styles.featureText}>
            <Text style={styles.featureTitle}>QR Code Tickets</Text>
            <Text style={styles.smallMuted}>
              Digital tickets with QR codes for easy validation and boarding.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------- STYLES ----------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f8fa" },
  container: { padding: 16, gap: 12 },
  primary: { color: "#2563eb" },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  loginButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  registerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#007AFF',
  },
  registerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  hero: { alignItems: "center", paddingVertical: 8 },
  heroTitle: { fontSize: 20, fontWeight: "700", color: "#111827" },
  heroSubtitle: { fontSize: 13, color: "#6b7280", marginTop: 6, textAlign: "center" },

  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeader: {
    paddingVertical: 10,
    backgroundColor: "#f3f4f6",
    alignItems: "center",
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  cardHeaderText: { fontWeight: "700", color: "#111827" },
  cardBody: { padding: 12 },

  label: { fontWeight: "600", color: "#374151", marginTop: 8, marginBottom: 6, fontSize: 14 },
  inputWrap: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  input: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
  },

  btn: {
    height: 46,
    borderRadius: 8,
    marginTop: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  btnPrimary: { backgroundColor: "#2563eb" },
  btnIcon: { color: "#fff", marginRight: 8 },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15 },

  sectionCenter: { alignItems: "center", marginTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: "#111827" },
  sectionSub: { fontSize: 12, color: "#6b7280", marginTop: 4 },

  row: { flexDirection: "row" },
  cardImg: { width: 110, height: 100, borderTopLeftRadius: 12, borderBottomLeftRadius: 12 },
  cardCol: { flex: 1, padding: 12 },
  cardTitle: { fontWeight: "700", color: "#111827" },
  muted: { color: "#6b7280", marginTop: 4 },
  smallMuted: { color: "#9aa0a6", fontSize: 12, marginTop: 4 },

  badgeSuccess: {
    backgroundColor: "#16a34a",
    color: "#fff",
    fontSize: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
    fontSize: 12,
    overflow: "hidden",
  },
  bgSuccess: { backgroundColor: "#16a34a", color: "#fff" },
  bgInfo: { backgroundColor: "#38bdf8", color: "#0f172a" },
  bgWarn: { backgroundColor: "#f59e0b", color: "#0f172a" },

  circleIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#2563eb",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  featureItem: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  featureText: { flex: 1 },
  featureTitle: { fontWeight: "700", color: "#111827", marginBottom: 2 },
});
