import React, { useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import colors from "@/constants/colors";

interface Props {
  onScanned: (value: string) => void;
  hint?: string;
  allowManual?: boolean;
  multiScan?: boolean;
}

let CameraModule: any = null;
let useCameraPermissionsHook: any = null;

try {
  const cam = require("expo-camera");
  CameraModule = cam.CameraView;
  useCameraPermissionsHook = cam.useCameraPermissions;
} catch {
  // expo-camera not available
}

function NativeScanner({ onScanned, hint, multiScan }: Props) {
  const [permission, requestPermission] = useCameraPermissionsHook();
  const [scanned, setScanned] = useState(false);
  const [flashLabel, setFlashLabel] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manual, setManual] = useState("");

  if (!permission) {
    return (
      <View style={s.center}>
        <ActivityIndicator color={colors.light.primary} />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={s.center}>
        <Text style={s.hintText}>Camera access needed to scan QR codes</Text>
        <Pressable style={s.btn} onPress={requestPermission}>
          <Text style={s.btnText}>Grant Camera Access</Text>
        </Pressable>
        <Pressable style={s.linkBtn} onPress={() => setShowManual(true)}>
          <Text style={s.linkText}>Enter code manually</Text>
        </Pressable>
        {showManual && (
          <View style={s.manualWrap}>
            <TextInput
              style={s.input}
              value={manual}
              onChangeText={setManual}
              placeholder="Enter QR code value"
              placeholderTextColor={colors.light.mutedForeground}
              autoCorrect={false}
              autoCapitalize="none"
            />
            <Pressable
              style={[s.btn, !manual && s.btnDisabled]}
              onPress={() => manual && onScanned(manual)}
              disabled={!manual}
            >
              <Text style={s.btnText}>Confirm</Text>
            </Pressable>
          </View>
        )}
      </View>
    );
  }

  if (showManual) {
    return (
      <View style={s.center}>
        <Text style={s.hintText}>Enter code manually</Text>
        <TextInput
          style={s.input}
          value={manual}
          onChangeText={setManual}
          placeholder="QR code value"
          placeholderTextColor={colors.light.mutedForeground}
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus
        />
        <Pressable
          style={[s.btn, !manual && s.btnDisabled]}
          onPress={() => manual && onScanned(manual)}
          disabled={!manual}
        >
          <Text style={s.btnText}>Confirm</Text>
        </Pressable>
        <Pressable style={s.linkBtn} onPress={() => setShowManual(false)}>
          <Text style={s.linkText}>Use camera instead</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={s.scannerWrap}>
      <CameraModule
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={
          scanned
            ? undefined
            : ({ data }: { data: string }) => {
                setScanned(true);
                onScanned(data);
                if (multiScan) {
                  const short = data.length > 20 ? data.slice(0, 20) + "…" : data;
                  setFlashLabel(short);
                  setTimeout(() => {
                    setScanned(false);
                    setFlashLabel(null);
                  }, 1500);
                }
              }
        }
      />
      <View style={s.overlay}>
        <View style={s.reticle} />
        {flashLabel ? (
          <View style={s.flashBadge}>
            <Text style={s.flashBadgeText}>✓ Scanned</Text>
          </View>
        ) : hint ? (
          <Text style={s.scanHint}>{hint}</Text>
        ) : null}
      </View>
      {scanned && !multiScan && (
        <Pressable style={s.rescanBtn} onPress={() => setScanned(false)}>
          <Text style={s.btnText}>Scan again</Text>
        </Pressable>
      )}
      <Pressable style={s.manualLink} onPress={() => setShowManual(true)}>
        <Text style={s.manualLinkText}>Type manually</Text>
      </Pressable>
    </View>
  );
}

function WebScanner({ onScanned, hint }: Props) {
  const [value, setValue] = useState("");
  return (
    <View style={s.center}>
      <Text style={s.hintText}>{hint ?? "Enter QR code value"}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={setValue}
        placeholder="QR code value"
        placeholderTextColor={colors.light.mutedForeground}
        autoCorrect={false}
        autoCapitalize="none"
      />
      <Pressable
        style={[s.btn, !value && s.btnDisabled]}
        onPress={() => value && onScanned(value)}
        disabled={!value}
      >
        <Text style={s.btnText}>Confirm</Text>
      </Pressable>
    </View>
  );
}

export default function QRScanner(props: Props) {
  if (Platform.OS === "web" || !CameraModule) {
    return <WebScanner {...props} />;
  }
  return <NativeScanner {...props} multiScan={props.multiScan} />;
}

const s = StyleSheet.create({
  center: { padding: 24, alignItems: "center", gap: 12 },
  scannerWrap: { width: "100%", aspectRatio: 1, position: "relative" },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  reticle: {
    width: 200,
    height: 200,
    borderWidth: 2,
    borderColor: colors.light.primary,
    borderRadius: 12,
    backgroundColor: "transparent",
  },
  scanHint: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  flashBadge: {
    marginTop: 12,
    backgroundColor: colors.light.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  flashBadgeText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  rescanBtn: {
    position: "absolute",
    bottom: 16,
    alignSelf: "center",
    backgroundColor: colors.light.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: colors.radius,
  },
  manualLink: {
    position: "absolute",
    bottom: 60,
    alignSelf: "center",
  },
  manualLinkText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    textDecorationLine: "underline",
  },
  hintText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: colors.light.foreground,
    textAlign: "center",
  },
  input: {
    width: "100%",
    height: 48,
    borderWidth: 1,
    borderColor: colors.light.border,
    borderRadius: colors.radius,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: colors.light.foreground,
    backgroundColor: colors.light.card,
  },
  btn: {
    width: "100%",
    height: 48,
    borderRadius: colors.radius,
    backgroundColor: colors.light.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  btnDisabled: { opacity: 0.4 },
  btnText: {
    color: "#fff",
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  linkBtn: { padding: 4 },
  linkText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: colors.light.primary,
  },
  manualWrap: { width: "100%", gap: 10, marginTop: 8 },
});
