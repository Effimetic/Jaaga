// LoginScreen.tsx
// Expo React Native version of your SMS login + token verify flow
// - Integrated with apiService and userService
// - Proper authentication flow with session management

import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { FontAwesome } from "@expo/vector-icons";
import { apiService } from "../services/apiService";
import { userService } from "../services/userService";
import { useAuth } from "../contexts/AuthContext";

export default function LoginScreen({ navigation }: { navigation?: any }) {
  const { login, setUser } = useAuth();
  const [phone, setPhone] = useState("");
  const [currentPhone, setCurrentPhone] = useState(""); // tracks the phone used for token
  const [token, setToken] = useState("");
  const [stage, setStage] = useState<"phone" | "token">("phone");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const tokenRef = useRef<TextInput>(null);

  // ---------- Helpers ----------
  const formatMvPhone = (raw: string) => {
    // Keep digits only
    let digits = raw.replace(/\D/g, "");
    // Apply Maldives +960 logic similar to your HTML
    if (digits.length > 0) {
      if (digits.startsWith("960")) {
        digits = "+960 " + digits.substring(3);
      } else if (digits.startsWith("0")) {
        digits = "+960 " + digits.substring(1);
      } else if (!digits.startsWith("+960")) {
        digits = "+960 " + digits;
      }
    }
    return digits;
  };

  const normalizedPhoneForApi = useMemo(() => {
    // Strip spaces for API payload (e.g., "+9601234567")
    return phone.replace(/\s+/g, "");
  }, [phone]);

  // ---------- Actions ----------
  const sendToken = async () => {
    if (!phone.trim()) {
      Alert.alert("Missing phone", "Please enter a phone number.");
      return;
    }
    setSending(true);
    try {
      const response = await apiService.sendSMS(normalizedPhoneForApi);
      
      if (response.success) {
        setCurrentPhone(normalizedPhoneForApi);
        setStage("token");
        Alert.alert("Success", response.message || "Login token sent via SMS.");
        // Focus token input
        setTimeout(() => tokenRef.current?.focus(), 250);
      } else {
        Alert.alert("Error", response.error || "Failed to send token.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Network error. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const verifyToken = async () => {
    if (!token || token.length !== 6) {
      Alert.alert("Invalid token", "Please enter a valid 6-digit token.");
      return;
    }
    setVerifying(true);
    try {
      console.log('Verifying token for phone:', currentPhone || normalizedPhoneForApi);
      const response = await apiService.verifyToken(currentPhone || normalizedPhoneForApi, token);
      console.log('Verify token response:', response);
      
      if (response.success) {
        console.log('Token verification successful, updating user state...');
        
        // Create a temporary user object with the verified phone
        const tempUser = {
          id: 0, // Will be updated from profile
          phone: response.phone,
          name: `User_${response.phone.slice(-4)}`, // Temporary name
          role: 'public', // Default role
          authenticated: true
        };
        
        // Store the session
        await userService.setCurrentUserSession(tempUser, response.access_token);
        
        // Try to get profile data
        try {
          const profile = await apiService.getProfile();
          if (profile.success) {
            const userData = {
              id: profile.profile.id,
              phone: profile.profile.phone,
              name: profile.profile.name,
              role: profile.profile.role,
              authenticated: true
            };
            await userService.setCurrentUserSession(userData, response.access_token);
            // Update AuthContext user state
            setUser(userData);
            console.log('Profile loaded, user state updated:', userData);
          }
        } catch (profileError) {
          console.log('Profile load failed, using basic user data');
          // Set basic user data in AuthContext
          setUser(tempUser);
          console.log('Basic user state set:', tempUser);
        }
        
        console.log('Login successful, waiting for state update...');
        
        // Wait for state update to complete before navigation
        setTimeout(async () => {
          console.log('State update delay completed, attempting navigation...');
          
          // Try immediate navigation
          if (navigation) {
            try {
              console.log('Attempting immediate navigation...');
              navigation.reset({ 
                index: 0, 
                routes: [{ name: "MainTabs" }] 
              });
              console.log('Immediate navigation successful');
              return;
            } catch (navError) {
              console.error('Immediate navigation failed:', navError);
            }
          }
          
          // Fallback: show alert and navigate on dismiss
          Alert.alert("Success", response.message || "Login successful.", [
            {
              text: "OK",
              onPress: () => {
                console.log('Alert dismissed, navigating to MainTabs...');
                if (navigation) {
                  try {
                    navigation.reset({ 
                      index: 0, 
                      routes: [{ name: "MainTabs" }] 
                    });
                    console.log('Navigation reset successful');
                  } catch (navError) {
                    console.error('Navigation reset failed:', navError);
                    try {
                      navigation.navigate('MainTabs');
                      console.log('Fallback navigation successful');
                    } catch (fallbackError) {
                      console.error('Fallback navigation also failed:', fallbackError);
                    }
                  }
                }
              }
            }
          ]);
        }, 500); // Increased delay to ensure state update
      } else {
        Alert.alert("Invalid token", response.error || "Please check the code and try again.");
      }
    } catch (err: any) {
      console.error('Error in verifyToken:', err);
      Alert.alert("Error", err.message || "Network error. Please try again.");
    } finally {
      setVerifying(false);
    }
  };

  const resendToken = async () => {
    if (!currentPhone && !normalizedPhoneForApi) {
      Alert.alert("Missing phone", "Please enter your phone first.");
      return;
    }
    setResending(true);
    try {
      const response = await apiService.sendSMS(currentPhone || normalizedPhoneForApi);
      
      if (response.success) {
        setToken("");
        tokenRef.current?.focus();
        Alert.alert("Sent", response.message || "New token sent to your phone.");
      } else {
        Alert.alert("Error", response.error || "Failed to resend token.");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Network error. Please try again.");
    } finally {
      setResending(false);
    }
  };

  // ---------- Render ----------
  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.select({ ios: 24, android: 0 })}
      >
        {/* Home Navigation Button */}
        <View style={styles.homeNavContainer}>
          <TouchableOpacity
            style={styles.homeNavButton}
            onPress={() => navigation?.navigate?.("Home")}
          >
            <FontAwesome name="home" size={20} style={styles.homeNavIcon} />
            <Text style={styles.homeNavText}>Home</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.container}>
          <View style={styles.card}>
            <View style={styles.header}>
              <FontAwesome name="ship" size={42} style={styles.iconPrimary} />
              <Text style={styles.title}>Welcome Back</Text>
              <Text style={styles.subtitle}>
                Enter your phone number to receive a login token
              </Text>
            </View>

            {stage === "phone" ? (
              // --------- Phone Form ---------
              <View>
                <Text style={styles.label}>Phone Number</Text>
                <View style={styles.inputRow}>
                  <FontAwesome name="phone" size={18} style={styles.inputIcon} />
                  <TextInput
                    value={phone}
                    onChangeText={(t) => setPhone(formatMvPhone(t))}
                    keyboardType="phone-pad"
                    placeholder="+960 123 4567"
                    placeholderTextColor="#9aa0a6"
                    style={styles.input}
                    returnKeyType="send"
                    onSubmitEditing={sendToken}
                  />
                </View>
                <Text style={styles.helpText}>
                  You'll receive a 6-digit login token via SMS
                </Text>

                <TouchableOpacity
                  disabled={sending}
                  style={[styles.btn, styles.btnPrimary, sending && styles.btnDisabled]}
                  onPress={sendToken}
                >
                  {sending ? (
                    <ActivityIndicator />
                  ) : (
                    <View style={styles.btnRow}>
                      <FontAwesome name="paper-plane" size={16} />
                      <Text style={styles.btnText}>Send Login Token</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // --------- Token Form ---------
              <View>
                <View style={styles.hr} />
                <Text style={styles.label}>Enter 6-Digit Token</Text>
                <View style={styles.inputRow}>
                  <FontAwesome name="key" size={18} style={styles.inputIcon} />
                  <TextInput
                    ref={tokenRef}
                    value={token}
                    onChangeText={(t) => setToken(t.replace(/\D/g, "").substring(0, 6))}
                    keyboardType="number-pad"
                    placeholder="123456"
                    placeholderTextColor="#9aa0a6"
                    style={styles.input}
                    maxLength={6}
                    returnKeyType="done"
                    onSubmitEditing={verifyToken}
                  />
                </View>
                <Text style={styles.helpText}>Enter the token you received via SMS</Text>

                <TouchableOpacity
                  disabled={verifying}
                  style={[styles.btn, styles.btnSuccess, verifying && styles.btnDisabled]}
                  onPress={verifyToken}
                >
                  {verifying ? (
                    <ActivityIndicator />
                  ) : (
                    <View style={styles.btnRow}>
                      <FontAwesome name="check" size={16} />
                      <Text style={styles.btnText}>Verify Token</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  disabled={resending}
                  style={[styles.btn, styles.btnOutline, resending && styles.btnDisabled]}
                  onPress={resendToken}
                >
                  {resending ? (
                    <ActivityIndicator />
                  ) : (
                    <View style={styles.btnRow}>
                      <FontAwesome name="repeat" size={16} />
                      <Text style={[styles.btnText, styles.btnOutlineText]}>Resend Token</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.hr} />
            <Text style={styles.footerText}>
              Don't have an account?{" "}
              <Text
                style={styles.link}
                onPress={() => {
                  navigation?.navigate?.("Register");
                }}
              >
                Register here
              </Text>
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}



// ---------------- Styles ----------------
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f6f8fa" },
  flex: { flex: 1 },
  homeNavContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 50 : 20, // Adjust for safe area
    zIndex: 10,
    backgroundColor: "#f6f8fa",
    alignItems: "center",
  },
  homeNavButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e7ff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 8,
  },
  homeNavIcon: { color: "#2563eb" },
  homeNavText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2563eb",
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 18,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  header: { alignItems: "center", marginBottom: 12 },
  iconPrimary: { color: "#2563eb", marginBottom: 8 },
  title: { fontSize: 22, fontWeight: "700", color: "#1f2937" },
  subtitle: { fontSize: 13, color: "#6b7280", marginTop: 6, textAlign: "center" },

  label: { fontSize: 14, color: "#374151", marginBottom: 6, fontWeight: "600" },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 10,
    backgroundColor: "#fff",
  },
  inputIcon: { color: "#6b7280", marginRight: 8 },
  input: {
    flex: 1,
    height: 44,
    fontSize: 16,
    color: "#111827",
  },
  helpText: { fontSize: 12, color: "#6b7280", marginTop: 6, marginBottom: 12 },

  btn: {
    height: 46,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
  },
  btnRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 15, marginLeft: 8 },

  btnPrimary: { backgroundColor: "#2563eb" },
  btnSuccess: { backgroundColor: "#16a34a" },
  btnOutline: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#cbd5e1",
  },
  btnOutlineText: { color: "#334155" },
  btnDisabled: { opacity: 0.6 },

  hr: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 16,
  },

  footerText: { textAlign: "center", color: "#6b7280", fontSize: 12 },
  link: { color: "#2563eb", fontWeight: "700" },
});
