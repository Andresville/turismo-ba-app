import React from "react";
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/colors";
import { useTranslation } from "../locales/i18n";
import { ThemedText } from "./themed-text";

interface OfflineBannerProps {
  isOffline: boolean;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ isOffline }) => {
  const theme = useAppTheme();
  const { t } = useTranslation();

  if (!isOffline) return null;

  return (
    <View style={[styles.bannerContainer, { backgroundColor: theme.colors.tertiary }]}>
      <Ionicons name="cloud-offline-outline" size={16} color="#fff" style={styles.bannerIcon} />
      <ThemedText style={styles.bannerText}>
        {t("common.datosGuardados")}
      </ThemedText>
    </View>
  );
};

interface ErrorStateProps {
  message?: string;
  onRetry: () => void;
  loading?: boolean;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry, loading = false }) => {
  const theme = useAppTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.errorContainer}>
      <Ionicons
        name="wifi-outline"
        size={50}
        color={theme.colors.textSecondary}
        style={styles.errorIcon}
      />
      <ThemedText type="subtitle" style={styles.errorTitle}>
        {t("common.noInternet")}
      </ThemedText>
      {message && (
        <ThemedText style={[styles.errorDesc, { color: theme.colors.textSecondary }]}>
          {message}
        </ThemedText>
      )}
      <TouchableOpacity
        style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
        onPress={onRetry}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <>
            <Ionicons name="refresh-outline" size={16} color="#fff" style={styles.buttonIcon} />
            <ThemedText style={styles.retryButtonText}>
              {t("common.reintentar")}
            </ThemedText>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  bannerContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    width: "100%",
  },
  bannerIcon: {
    marginRight: 6,
  },
  bannerText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
    textAlign: "center",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  errorIcon: {
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  errorDesc: {
    fontSize: 14,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonIcon: {
    marginRight: 6,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
});
