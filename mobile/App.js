// Gym Quest — Expo Mobile App
// WebView wrapper + native QR scanner + push notifications + geolocation
// Install: npx create-expo-app gymquest-mobile && copy this as App.js

import React, { useState, useEffect, useRef } from "react";
import { View, StyleSheet, StatusBar, Alert, Platform, BackHandler } from "react-native";
import { WebView } from "react-native-webview";
import * as Notifications from "expo-notifications";
import * as Location from "expo-location";
import { CameraView, useCameraPermissions } from "expo-camera";

// ─── CONFIG ──────────────────────────────────────────────

const API_URL = "https://gymquest.ru"; // Change to your domain
const CLUB_LOCATION = null; // Set per club: { lat: 55.7558, lng: 37.6173, radius: 50 }

// ─── PUSH NOTIFICATIONS ─────────────────────────────────

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

async function registerForPush() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") return null;
  const token = (await Notifications.getExpoPushTokenAsync()).data;
  return token;
}

// ─── MAIN APP ────────────────────────────────────────────

export default function App() {
  const webviewRef = useRef(null);
  const [showQR, setShowQR] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    registerForPush().catch(() => {});
    let geoInterval = null;
    setupGeofence().then(id => { geoInterval = id; });

    // Android back button
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    });

    return () => {
      backHandler.remove();
      if (geoInterval) clearInterval(geoInterval);
    };
  }, []);

  // ─── GEOFENCE ────────────────────────────────────────

  async function setupGeofence() {
    if (!CLUB_LOCATION) return;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    // Check location every 5 minutes
    const intervalId = setInterval(async () => {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const dist = getDistance(loc.coords.latitude, loc.coords.longitude, CLUB_LOCATION.lat, CLUB_LOCATION.lng);
        if (dist <= CLUB_LOCATION.radius) {
          await Notifications.scheduleNotificationAsync({
            content: { title: "Gym Quest ⚔️", body: "Ты рядом с залом! Зайди и получи XP 🎮" },
            trigger: null,
          });
        }
      } catch {}
    }, 5 * 60 * 1000);
    return intervalId;
  }

  function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ─── QR SCANNER ──────────────────────────────────────

  function handleBarCodeScanned({ data }) {
    setShowQR(false);
    // Send QR token to webview
    webviewRef.current?.injectJavaScript(`
      window.handleQRCheckin && window.handleQRCheckin("${data}");
      true;
    `);
  }

  // ─── WEBVIEW MESSAGE HANDLER ─────────────────────────

  function onMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      switch (msg.type) {
        case "openQR":
          if (!permission?.granted) {
            requestPermission().then(p => { if (p.granted) setShowQR(true); });
          } else {
            setShowQR(true);
          }
          break;
        case "notification":
          Notifications.scheduleNotificationAsync({
            content: { title: msg.title || "Gym Quest", body: msg.body },
            trigger: null,
          });
          break;
        case "haptic":
          // Could add expo-haptics here
          break;
      }
    } catch {}
  }

  // ─── JS TO INJECT INTO WEBVIEW ───────────────────────

  const injectedJS = `
    // Bridge: webview → native
    window.nativeBridge = {
      openQRScanner: () => window.ReactNativeWebView.postMessage(JSON.stringify({ type: "openQR" })),
      sendNotification: (title, body) => window.ReactNativeWebView.postMessage(JSON.stringify({ type: "notification", title, body })),
    };
    // QR callback (called from native after scan)
    window.handleQRCheckin = async (token) => {
      try {
        const tk = localStorage.getItem("hq_token");
        const res = await fetch("/api/qr-checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": "Bearer " + tk },
          body: JSON.stringify({ qr_token: token })
        }).then(r => r.json());
        if (res.xp_earned) {
          alert("QR Чекин! +" + res.xp_earned + " XP");
          location.reload();
        } else {
          alert("Ошибка: " + (res.error || "Неизвестная"));
        }
      } catch(e) { alert("Ошибка QR: " + e.message); }
    };
    true;
  `;

  // ─── RENDER ──────────────────────────────────────────

  if (showQR) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <CameraView
          style={StyleSheet.absoluteFillObject}
          onBarcodeScanned={handleBarCodeScanned}
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        />
        <View style={styles.qrOverlay}>
          <View style={styles.qrFrame} />
          <View style={styles.qrText}>
            <View style={styles.qrTextBg}>
              <StatusBar barStyle="light-content" />
            </View>
          </View>
        </View>
        <View style={styles.qrClose}>
          <View
            onTouchEnd={() => setShowQR(false)}
            style={styles.closeBtn}
          >
            {/* Close button rendered via WebView text */}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0c0e14" />
      <WebView
        ref={webviewRef}
        source={{ uri: `${API_URL}/app/` }}
        style={styles.webview}
        injectedJavaScript={injectedJS}
        onMessage={onMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        allowsBackForwardNavigationGestures
        renderLoading={() => (
          <View style={styles.loading}>
            {/* Loading handled by webview */}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0c0e14" },
  webview: { flex: 1, backgroundColor: "#0c0e14" },
  loading: { ...StyleSheet.absoluteFillObject, backgroundColor: "#0c0e14", justifyContent: "center", alignItems: "center" },
  qrOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  qrFrame: { width: 250, height: 250, borderWidth: 3, borderColor: "#00e5ff", borderRadius: 20 },
  qrClose: { position: "absolute", top: 60, right: 20 },
  closeBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center" },
});
