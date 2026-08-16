import { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { PRIMARY_NAV } from "@/navigation/primary-nav";

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

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      testID="more-screen"
    >
      <Text style={styles.title}>All features</Text>

      {PRIMARY_NAV.map((group) => {
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
