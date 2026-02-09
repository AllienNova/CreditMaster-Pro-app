import { View, Text, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { useMemo } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { useTheme } from '../../src/hooks/useTheme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const { colors, spacing, borderRadius, fontSize, fontWeight, withOpacity } = useTheme();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: () => { logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  const menuSections = [
    {
      title: 'Account',
      items: [
        { icon: 'person-outline', label: 'Edit Profile', route: '/profile/edit' },
        { icon: 'card-outline', label: 'Subscription', route: '/profile/subscription', badge: user?.subscription_tier },
        { icon: 'notifications-outline', label: 'Notifications', route: '/profile/notifications' },
        { icon: 'lock-closed-outline', label: 'Security', route: '/profile/security' },
      ],
    },
    {
      title: 'Support',
      items: [
        { icon: 'help-circle-outline', label: 'Help Center', route: '/support/help' },
        { icon: 'chatbubble-outline', label: 'Contact Us', route: '/support/contact' },
        { icon: 'document-text-outline', label: 'Terms of Service', route: '/support/terms' },
        { icon: 'shield-outline', label: 'Privacy Policy', route: '/support/privacy' },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: 'moon-outline', label: 'Dark Mode', route: '/settings/theme', toggle: true },
        { icon: 'language-outline', label: 'Language', route: '/settings/language', value: 'English' },
        { icon: 'information-circle-outline', label: 'About', route: '/settings/about' },
      ],
    },
  ];

  const tierColors: Record<string, string> = useMemo(() => ({
    free: colors.gray500,
    basic: colors.primary,
    premium: colors.accent,
    enterprise: colors.warning,
  }), [colors]);

  const styles = useMemo(() => ({
    container: { flex: 1, backgroundColor: colors.background } as const,
    header: { padding: spacing.lg, paddingTop: 60 } as const,
    title: { fontSize: 28, fontWeight: fontWeight.bold, color: colors.text } as const,
    profileCard: { alignItems: 'center' as const, backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: borderRadius.lg, padding: spacing.lg, marginBottom: spacing.md },
    avatarContainer: { position: 'relative' as const, marginBottom: spacing.md },
    avatar: { width: 80, height: 80, borderRadius: 40 },
    avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: 'center' as const, justifyContent: 'center' as const },
    avatarText: { fontSize: 32, fontWeight: fontWeight.bold, color: colors.white },
    editAvatarButton: { position: 'absolute' as const, bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center' as const, justifyContent: 'center' as const, borderWidth: 2, borderColor: colors.surface },
    userName: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.text },
    userEmail: { fontSize: fontSize.sm, color: colors.textSecondary, marginBottom: spacing.sm },
    tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
    tierText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },
    upgradeBanner: { flexDirection: 'row' as const, alignItems: 'center' as const, backgroundColor: withOpacity(colors.warning, 0.15), marginHorizontal: spacing.md, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md },
    upgradeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.white, alignItems: 'center' as const, justifyContent: 'center' as const, marginRight: spacing.md },
    upgradeContent: { flex: 1 },
    upgradeTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text },
    upgradeDesc: { fontSize: fontSize.xs, color: colors.textSecondary },
    menuSection: { marginBottom: spacing.md },
    sectionTitle: { fontSize: 13, fontWeight: fontWeight.semibold, color: colors.textSecondary, marginLeft: spacing.lg, marginBottom: spacing.xs, textTransform: 'uppercase' as const },
    menuCard: { backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: borderRadius.lg },
    menuItem: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, padding: spacing.md },
    menuItemBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
    menuItemLeft: { flexDirection: 'row' as const, alignItems: 'center' as const },
    menuItemLabel: { fontSize: 15, color: colors.text, marginLeft: spacing.md },
    menuItemRight: { flexDirection: 'row' as const, alignItems: 'center' as const },
    menuBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
    menuBadgeText: { fontSize: 11, fontWeight: fontWeight.semibold },
    menuValue: { fontSize: fontSize.sm, color: colors.textSecondary, marginRight: 4 },
    signOutButton: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: colors.surface, marginHorizontal: spacing.md, borderRadius: borderRadius.lg, padding: spacing.md, marginTop: spacing.md },
    signOutText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.error, marginLeft: 8 },
    versionText: { textAlign: 'center' as const, fontSize: fontSize.xs, color: colors.textSecondary, marginTop: spacing.lg },
  }), [colors, spacing, borderRadius, fontSize, fontWeight, withOpacity]);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      {/* Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'U'}</Text>
            </View>
          )}
          <TouchableOpacity style={styles.editAvatarButton}>
            <Ionicons name="camera" size={16} color={colors.white} />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
        <View style={[styles.tierBadge, { backgroundColor: withOpacity(tierColors[user?.subscription_tier || 'free'], 0.12) }]}>
          <Text style={[styles.tierText, { color: tierColors[user?.subscription_tier || 'free'] }]}>
            {(user?.subscription_tier || 'free').charAt(0).toUpperCase() + (user?.subscription_tier || 'free').slice(1)} Plan
          </Text>
        </View>
      </View>

      {/* Upgrade Banner */}
      {user?.subscription_tier === 'free' && (
        <TouchableOpacity style={styles.upgradeBanner} onPress={() => router.push('/profile/subscription' as never)}>
          <View style={styles.upgradeIcon}>
            <Ionicons name="star" size={24} color={colors.warning} />
          </View>
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
            <Text style={styles.upgradeDesc}>Unlock AI-powered dispute letters & more</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      )}

      {/* Menu Sections */}
      {menuSections.map((section, sectionIndex) => (
        <View key={sectionIndex} style={styles.menuSection}>
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.menuCard}>
            {section.items.map((item, itemIndex) => (
              <TouchableOpacity
                key={itemIndex}
                style={[styles.menuItem, itemIndex < section.items.length - 1 && styles.menuItemBorder]}
                onPress={() => router.push(item.route as never)}
              >
                <View style={styles.menuItemLeft}>
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={colors.textSecondary} />
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                </View>
                <View style={styles.menuItemRight}>
                  {'badge' in item && item.badge && (
                    <View style={[styles.menuBadge, { backgroundColor: withOpacity(tierColors[item.badge], 0.12) }]}>
                      <Text style={[styles.menuBadgeText, { color: tierColors[item.badge] }]}>
                        {item.badge.charAt(0).toUpperCase() + item.badge.slice(1)}
                      </Text>
                    </View>
                  )}
                  {'value' in item && item.value && <Text style={styles.menuValue}>{item.value}</Text>}
                  <Ionicons name="chevron-forward" size={18} color={colors.border} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.versionText}>Fynvita v1.0.0</Text>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}
