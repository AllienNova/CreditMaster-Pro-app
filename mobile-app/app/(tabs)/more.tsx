import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY_NAV } from "@/navigation/primary-nav";
import { userProfileApi } from "@/services/api/user";
import { useAuthStore } from "@/store/authStore";

/**
 * The "More" tab — the app's feature directory.
 *
 * The tab bar holds nine destinations against 24 feature areas and 231
 * screens, so everything else was reachable only where some screen happened to
 * link it inline. 131 of 231 screens were not reachable at all: the whole of
 * trading, tax, the marketplace, rewards and most of financial.
 *
 * Groups start COLLAPSED. Expanded, this is 102 rows, which is a list to
 * scroll past rather than a menu to choose from.
 */
export default function MoreScreen() {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const userId = useAuthStore((s) => s.user?.id);

  // Role decides only what is SHOWN, never what is ALLOWED. Verified, not
  // assumed: all 13 src/app/api/admin/**/route.ts files wrap their handlers in
  // `withRole` (src/lib/auth/api-guard.ts:270), which validates the JWT,
  // resolves the role from the DATABASE via resolveRoleFromDb — that file
  // documents at :10 that the `role` claim and user_metadata/app_metadata are
  // never trusted — enforces MFA, and returns 403 unless isAtLeast passes. So
  // a non-admin who guesses /admin/* gets a 403-shaped empty screen; hiding
  // the group removes clutter and the hint that an admin surface exists.
  //
  // Re-run on FOCUS, not once on mount. This tab stays mounted across a
  // sign-out/sign-in and across transient failures: fetched once, an admin who
  // signed in afterwards would never see the group, one network blip would
  // hide it for the rest of the session, and a role changed server-side would
  // never be picked up. Keyed on the user id so a session change refetches.
  useFocusEffect(
    useCallback(() => {
      let active = true;
      if (!userId) {
        setIsAdmin(false);
        return;
      }
      userProfileApi
        .getProfile()
        .then((res) => {
          if (!active) return;
          const role = res.data?.role;
          // Exact match, deliberately. profiles.role is
          // `TEXT CHECK (role IN ('user','premium','admin','super_admin'))`
          // (migration 20250203_user_settings.sql:80) — a closed lowercase
          // set, so case-normalising would only hide a real schema change.
          setIsAdmin(role === "admin" || role === "super_admin");
        })
        .catch(() => {
          // Fail CLOSED: an unreadable profile shows the non-admin directory.
          if (active) setIsAdmin(false);
        });
      return () => {
        active = false;
      };
    }, [userId]),
  );

  const groups = PRIMARY_NAV.filter((g) => !g.requiresRole || isAdmin);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="more-screen"
    >
      <Text style={styles.title}>All features</Text>

      {groups.map((group) => {
        const isOpen = open === group.label;
        return (
          <View key={group.label} style={styles.group}>
            <Pressable
              onPress={() => setOpen(isOpen ? null : group.label)}
              accessibilityRole="button"
              accessibilityLabel={group.label}
              accessibilityState={{ expanded: isOpen }}
              style={styles.groupHeader}
            >
              <Ionicons
                name={group.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color="#059669"
              />
              <Text style={styles.groupLabel}>{group.label}</Text>
              <Text style={styles.count}>{group.items.length}</Text>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={18}
                color="#94a3b8"
              />
            </Pressable>

            {isOpen &&
              group.items.map((item) => (
                <Pressable
                  key={item.href}
                  onPress={() => router.push(item.href as never)}
                  accessibilityRole="link"
                  accessibilityLabel={item.label}
                  style={styles.item}
                >
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  <Ionicons name="chevron-forward" size={16} color="#cbd5e1" />
                </Pressable>
              ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16, color: "#0f172a" },
  group: {
    backgroundColor: "#fff",
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  groupLabel: { flex: 1, fontSize: 16, fontWeight: "600", color: "#0f172a" },
  count: { fontSize: 12, color: "#94a3b8" },
  item: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#e2e8f0",
  },
  itemLabel: { fontSize: 15, color: "#334155" },
});
