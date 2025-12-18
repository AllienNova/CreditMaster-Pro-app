import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../src/store/authStore';
import { lightTheme as theme } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

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

  const tierColors: Record<string, string> = {
    free: '#6B7280',
    basic: '#3B82F6',
    premium: '#8B5CF6',
    enterprise: '#F59E0B',
  };

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
            <Ionicons name="camera" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userEmail}>{user?.email || 'user@example.com'}</Text>
        <View style={[styles.tierBadge, { backgroundColor: `${tierColors[user?.subscription_tier || 'free']}20` }]}>
          <Text style={[styles.tierText, { color: tierColors[user?.subscription_tier || 'free'] }]}>
            {(user?.subscription_tier || 'free').charAt(0).toUpperCase() + (user?.subscription_tier || 'free').slice(1)} Plan
          </Text>
        </View>
      </View>

      {/* Upgrade Banner */}
      {user?.subscription_tier === 'free' && (
        <TouchableOpacity style={styles.upgradeBanner} onPress={() => router.push('/profile/subscription' as never)}>
          <View style={styles.upgradeIcon}>
            <Ionicons name="star" size={24} color="#F59E0B" />
          </View>
          <View style={styles.upgradeContent}>
            <Text style={styles.upgradeTitle}>Upgrade to Premium</Text>
            <Text style={styles.upgradeDesc}>Unlock AI-powered dispute letters & more</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
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
                  <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={22} color={theme.colors.textSecondary} />
                  <Text style={styles.menuItemLabel}>{item.label}</Text>
                </View>
                <View style={styles.menuItemRight}>
                  {item.badge && (
                    <View style={[styles.menuBadge, { backgroundColor: `${tierColors[item.badge]}20` }]}>
                      <Text style={[styles.menuBadgeText, { color: tierColors[item.badge] }]}>
                        {item.badge.charAt(0).toUpperCase() + item.badge.slice(1)}
                      </Text>
                    </View>
                  )}
                  {item.value && <Text style={styles.menuValue}>{item.value}</Text>}
                  <Ionicons name="chevron-forward" size={18} color={theme.colors.border} />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ))}

      {/* Sign Out Button */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color={theme.colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* App Version */}
      <Text style={styles.versionText}>CPFI v1.0.0</Text>
      <View style={{ height: 100 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: { padding: theme.spacing.lg, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: '700', color: theme.colors.text },
  profileCard: { alignItems: 'center', backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.lg, padding: theme.spacing.lg, marginBottom: theme.spacing.md },
  avatarContainer: { position: 'relative', marginBottom: theme.spacing.md },
  avatar: { width: 80, height: 80, borderRadius: 40 },
  avatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFFFFF' },
  editAvatarButton: { position: 'absolute', bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, backgroundColor: theme.colors.primary, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.colors.surface },
  userName: { fontSize: 20, fontWeight: '600', color: theme.colors.text },
  userEmail: { fontSize: 14, color: theme.colors.textSecondary, marginBottom: theme.spacing.sm },
  tierBadge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  tierText: { fontSize: 12, fontWeight: '600' },
  upgradeBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF3C7', marginHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginBottom: theme.spacing.md },
  upgradeIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: theme.spacing.md },
  upgradeContent: { flex: 1 },
  upgradeTitle: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  upgradeDesc: { fontSize: 12, color: theme.colors.textSecondary },
  menuSection: { marginBottom: theme.spacing.md },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginLeft: theme.spacing.lg, marginBottom: theme.spacing.xs, textTransform: 'uppercase' },
  menuCard: { backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.lg },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: theme.spacing.md },
  menuItemBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemLabel: { fontSize: 15, color: theme.colors.text, marginLeft: theme.spacing.md },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  menuBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, marginRight: 8 },
  menuBadgeText: { fontSize: 11, fontWeight: '600' },
  menuValue: { fontSize: 14, color: theme.colors.textSecondary, marginRight: 4 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surface, marginHorizontal: theme.spacing.md, borderRadius: theme.borderRadius.lg, padding: theme.spacing.md, marginTop: theme.spacing.md },
  signOutText: { fontSize: 16, fontWeight: '500', color: theme.colors.error, marginLeft: 8 },
  versionText: { textAlign: 'center', fontSize: 12, color: theme.colors.textSecondary, marginTop: theme.spacing.lg },
});

