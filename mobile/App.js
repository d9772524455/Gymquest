// Gym Quest — Expo Mobile App
// WebView wrapper + native QR scanner + Android back button

import React, { useState, useEffect, useRef } from "react";
import { View, Text, StyleSheet, StatusBar, Alert, BackHandler } from "react-native";
import { WebView } from "react-native-webview";
import { CameraView, useCameraPermissions } from "expo-camera";
import { API_URL } from './config';

export default function App() {
  const webviewRef = useRef(null);
  const [showQR, setShowQR] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [canGoBack, setCanGoBack] = useState(false);
  const canGoBackRef = useRef(false);

  useEffect(() => {
    canGoBackRef.current = canGoBack;
  }, [canGoBack]);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener("hardwareBackPress", () => {
      if (canGoBackRef.current && webviewRef.current) {
        webviewRef.current.goBack();
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, []);

  function handleBarCodeScanned({ data }) {
    setShowQR(false);
    // M8 — validate JWT format before passing to WebView
    if (typeof data !== "string" || !/^[\w-]+\.[\w-]+\.[\w-]+$/.test(data)) {
      Alert.alert("Неверный QR", "Отсканируйте QR-код Gym Quest");
      return;
    }
    // M1 — JSON.stringify properly escapes the payload for JS-string context
    webviewRef.current?.injectJavaScript(`
      window.handleQRCheckin && window.handleQRCheckin(${JSON.stringify(data)});
      true;
    `);
  }

  function onMessage(event) {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "openQR") {
        if (!permission?.granted) {
          requestPermission().then((p) => { if (p.granted) setShowQR(true); }).catch(() => {});
        } else {
          setShowQR(true);
        }
      }
    } catch {}
  }

  const injectedJS = `
    window.nativeBridge = {
      openQRScanner: () => window.ReactNativeWebView.postMessage(JSON.stringify({ type: "openQR" })),
    };
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
        </View>
        <View style={styles.qrClose}>
          <View onTouchEnd={() => setShowQR(false)} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
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
        onNavigationStateChange={(nav) => setCanGoBack(nav.canGoBack)}
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
  closeBtnText: { color: "#fff", fontSize: 20, fontWeight: "700", lineHeight: 24 },
});
