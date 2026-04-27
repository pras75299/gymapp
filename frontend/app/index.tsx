import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  StatusBar,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../src/contexts/AuthContext";
import { colors, radius, space, type, layout, shadows } from "../src/theme";

export default function HomePage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleScanPress = () => {
    router.push("/qr-scanner");
  };

  return (
    <ImageBackground
      source={require("../assets/images/background-gym.png")}
      style={styles.bg}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" />
      <View style={styles.scrim} />
      <View style={styles.gradientBottom} />

      <View style={styles.container}>
        <View style={styles.topRow}>
          <View style={styles.brandMark}>
            <View style={styles.brandDot} />
            <Text style={styles.brandText}>VEER · GYM</Text>
          </View>
          <Text style={styles.unit}>NO. 001</Text>
        </View>

        <View style={styles.heroBlock}>
          <Text style={styles.eyebrow}>Members entry / day pass</Text>
          <Text style={styles.headline}>
            Train{"\n"}
            <Text style={styles.headlineAccent}>without</Text>
            {"\n"}friction.
          </Text>
          <Text style={styles.lede}>
            Scan the gym QR. Pick a pass. Pay. Walk in. Your entry code is on
            your phone.
          </Text>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleScanPress}
            activeOpacity={0.85}
          >
            <Ionicons
              name="qr-code"
              size={20}
              color={colors.accentInk}
              style={styles.btnIcon}
            />
            <Text style={styles.primaryBtnText}>Scan QR Code</Text>
            <Ionicons
              name="arrow-forward"
              size={18}
              color={colors.accentInk}
            />
          </TouchableOpacity>

          {isSignedIn && (
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push("/my-passes")}
              activeOpacity={0.85}
            >
              <Ionicons
                name="card-outline"
                size={18}
                color={colors.text}
                style={styles.btnIcon}
              />
              <Text style={styles.secondaryBtnText}>My Active Passes</Text>
              <View style={styles.indicator} />
            </TouchableOpacity>
          )}

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>01</Text>
              <Text style={styles.metaText}>Scan</Text>
            </View>
            <View style={styles.metaDash} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>02</Text>
              <Text style={styles.metaText}>Pay</Text>
            </View>
            <View style={styles.metaDash} />
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>03</Text>
              <Text style={styles.metaText}>Enter</Text>
            </View>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
    width: "100%",
    backgroundColor: colors.bg,
  },
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(8,8,9,0.72)",
  },
  gradientBottom: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 240,
    backgroundColor: colors.bg,
    opacity: 0.85,
  },
  container: {
    flex: 1,
    paddingHorizontal: layout.screenPadding,
    paddingTop: layout.topPadding,
    paddingBottom: layout.bottomPadding,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandMark: {
    flexDirection: "row",
    alignItems: "center",
  },
  brandDot: {
    width: 10,
    height: 10,
    backgroundColor: colors.accent,
    marginRight: space.sm,
  },
  brandText: {
    ...type.label,
    color: colors.text,
    fontWeight: "700",
  },
  unit: {
    ...type.label,
    color: colors.textMuted,
  },
  heroBlock: {
    marginTop: space.xxxl,
  },
  eyebrow: {
    ...type.eyebrow,
    marginBottom: space.lg,
  },
  headline: {
    ...type.display,
    color: colors.text,
    fontSize: 64,
    lineHeight: 60,
  },
  headlineAccent: {
    color: colors.accent,
    fontStyle: "italic",
  },
  lede: {
    ...type.body,
    color: colors.textMuted,
    marginTop: space.lg,
    maxWidth: 320,
  },
  actions: {
    width: "100%",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingVertical: 18,
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    marginBottom: space.md,
    ...shadows.glow,
  },
  primaryBtnText: {
    ...type.label,
    fontSize: 16,
    color: colors.accentInk,
    fontWeight: "800",
    flex: 1,
    marginLeft: space.md,
  },
  btnIcon: {
    marginRight: 0,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.xl,
    paddingVertical: 16,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: "rgba(20,20,22,0.85)",
  },
  secondaryBtnText: {
    ...type.label,
    fontSize: 14,
    color: colors.text,
    flex: 1,
    marginLeft: space.md,
    fontWeight: "700",
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: space.xl,
  },
  metaItem: {
    alignItems: "center",
    flexDirection: "row",
  },
  metaLabel: {
    ...type.label,
    fontSize: 11,
    color: colors.accent,
    marginRight: space.xs,
  },
  metaText: {
    ...type.label,
    fontSize: 11,
    color: colors.textMuted,
  },
  metaDash: {
    width: 18,
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: space.md,
  },
});
