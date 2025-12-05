import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert, TextInput, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../../constants/theme';

export default function SecurityScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwords, setPasswords] = useState({ current: '', new: '', confirm: '' });

  const securityItems = [
    { icon: 'finger-print', title: 'Biometric Login', desc: 'Use Face ID or fingerprint to login', value: biometricEnabled, onToggle: setBiometricEnabled },
    { icon: 'key', title: 'Two-Factor Authentication', desc: 'Add extra security with 2FA', value: twoFactorEnabled, onToggle: setTwoFactorEnabled },
    { icon: 'notifications', title: 'Login Alerts', desc: 'Get notified of new logins', value: loginAlerts, onToggle: setLoginAlerts },
  ];

  const sessions = [
    { device: 'iPhone 14 Pro', location: 'New York, NY', time: 'Active now', current: true },
    { device: 'MacBook Pro', location: 'New York, NY', time: '2 hours ago', current: false },
    { device: 'Windows PC', location: 'Boston, MA', time: '3 days ago', current: false },
  ];

  const handleChangePassword = () => {
    if (passwords.new !== passwords.confirm) {
      Alert.alert('Error', 'New passwords do not match');
      return;
    }
    if (passwords.new.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters');
      return;
    }
    Alert.alert('Success', 'Password changed successfully');
    setShowPasswordModal(false);
    setPasswords({ current: '', new: '', confirm: '' });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Security</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Password</Text>
        <TouchableOpacity style={styles.passwordRow} onPress={() => setShowPasswordModal(true)}>
          <View style={styles.passwordLeft}>
            <Ionicons name="lock-closed" size={20} color={lightTheme.colors.primary} />
            <View>
              <Text style={styles.passwordTitle}>Change Password</Text>
              <Text style={styles.passwordDesc}>Last changed 30 days ago</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Options</Text>
        {securityItems.map((item, idx) => (
          <View key={idx} style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name={item.icon as any} size={20} color={lightTheme.colors.primary} />
              <View>
                <Text style={styles.settingTitle}>{item.title}</Text>
                <Text style={styles.settingDesc}>{item.desc}</Text>
              </View>
            </View>
            <Switch value={item.value} onValueChange={item.onToggle} trackColor={{ false: '#ddd', true: lightTheme.colors.primary }} />
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Active Sessions</Text>
          <TouchableOpacity onPress={() => Alert.alert('Sign Out All', 'Sign out from all other devices?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Out', style: 'destructive', onPress: () => {} }
          ])}>
            <Text style={styles.signOutAll}>Sign out all</Text>
          </TouchableOpacity>
        </View>
        {sessions.map((session, idx) => (
          <View key={idx} style={styles.sessionRow}>
            <View style={styles.sessionIcon}>
              <Ionicons name={session.device.includes('iPhone') ? 'phone-portrait' : 'laptop'} size={20} color="#666" />
            </View>
            <View style={styles.sessionInfo}>
              <Text style={styles.sessionDevice}>{session.device} {session.current && <Text style={styles.currentBadge}>(This device)</Text>}</Text>
              <Text style={styles.sessionDetails}>{session.location} • {session.time}</Text>
            </View>
            {!session.current && (
              <TouchableOpacity><Ionicons name="close-circle" size={20} color="#CC0000" /></TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security Log</Text>
        <TouchableOpacity style={styles.linkRow}>
          <Text style={styles.linkText}>View login history</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.linkRow}>
          <Text style={styles.linkText}>Download account data</Text>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      <Modal visible={showPasswordModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <TextInput style={styles.modalInput} placeholder="Current Password" secureTextEntry value={passwords.current}
              onChangeText={(t) => setPasswords({ ...passwords, current: t })} />
            <TextInput style={styles.modalInput} placeholder="New Password" secureTextEntry value={passwords.new}
              onChangeText={(t) => setPasswords({ ...passwords, new: t })} />
            <TextInput style={styles.modalInput} placeholder="Confirm New Password" secureTextEntry value={passwords.confirm}
              onChangeText={(t) => setPasswords({ ...passwords, confirm: t })} />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowPasswordModal(false)}>
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSave} onPress={handleChangePassword}>
                <Text style={styles.modalSaveText}>Change</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#fff' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 12 },
  signOutAll: { color: '#CC0000', fontSize: 14, fontWeight: '500' },
  passwordRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  passwordLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  passwordTitle: { fontSize: 14, fontWeight: '600' },
  passwordDesc: { fontSize: 12, color: '#666' },
  settingRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  settingTitle: { fontSize: 14, fontWeight: '600' },
  settingDesc: { fontSize: 12, color: '#666' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  sessionIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f0f0f0', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  sessionInfo: { flex: 1 },
  sessionDevice: { fontSize: 14, fontWeight: '600' },
  currentBadge: { color: '#00AA00', fontSize: 12 },
  sessionDetails: { fontSize: 12, color: '#666' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  linkText: { fontSize: 14, color: lightTheme.colors.primary },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  modalInput: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalCancel: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: '#f0f0f0', alignItems: 'center' },
  modalCancelText: { color: '#666', fontWeight: '600' },
  modalSave: { flex: 1, padding: 14, borderRadius: 8, backgroundColor: lightTheme.colors.primary, alignItems: 'center' },
  modalSaveText: { color: '#fff', fontWeight: '600' },
});

