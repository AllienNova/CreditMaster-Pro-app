import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../../constants/theme';

export default function EditProfileScreen() {
  const [profile, setProfile] = useState({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    address: '123 Main Street',
    city: 'New York',
    state: 'NY',
    zip: '10001',
    dateOfBirth: '1985-06-15',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Profile updated successfully', [{ text: 'OK', onPress: () => router.back() }]);
    }, 1000);
  };

  const InputField = ({ label, value, field, keyboardType = 'default', autoCapitalize = 'words' }: any) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={(text) => setProfile({ ...profile, [field]: text })}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor="#999"
      />
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveButton, loading && styles.saveButtonDisabled]}>
            {loading ? 'Saving...' : 'Save'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <View style={styles.avatarContainer}>
          <Image source={{ uri: 'https://via.placeholder.com/100' }} style={styles.avatar} />
          <TouchableOpacity style={styles.cameraButton}>
            <Ionicons name="camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity><Text style={styles.changePhotoText}>Change Photo</Text></TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <InputField label="First Name" value={profile.firstName} field="firstName" />
          </View>
          <View style={styles.halfInput}>
            <InputField label="Last Name" value={profile.lastName} field="lastName" />
          </View>
        </View>
        <InputField label="Email" value={profile.email} field="email" keyboardType="email-address" autoCapitalize="none" />
        <InputField label="Phone" value={profile.phone} field="phone" keyboardType="phone-pad" />
        <InputField label="Date of Birth" value={profile.dateOfBirth} field="dateOfBirth" />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Address</Text>
        <InputField label="Street Address" value={profile.address} field="address" />
        <InputField label="City" value={profile.city} field="city" />
        <View style={styles.row}>
          <View style={styles.halfInput}>
            <InputField label="State" value={profile.state} field="state" />
          </View>
          <View style={styles.halfInput}>
            <InputField label="ZIP Code" value={profile.zip} field="zip" keyboardType="numeric" />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Identity Verification</Text>
        <View style={styles.verificationCard}>
          <View style={styles.verificationIcon}>
            <Ionicons name="shield-checkmark" size={24} color="#00AA00" />
          </View>
          <View style={styles.verificationContent}>
            <Text style={styles.verificationTitle}>Identity Verified</Text>
            <Text style={styles.verificationText}>Your identity was verified on Jan 10, 2024</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={20} color="#CC0000" />
        <Text style={styles.deleteButtonText}>Delete Account</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, paddingTop: 50, backgroundColor: '#fff' },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  saveButton: { color: lightTheme.colors.primary, fontSize: 16, fontWeight: '600' },
  saveButtonDisabled: { opacity: 0.5 },
  avatarSection: { alignItems: 'center', padding: 24, backgroundColor: '#fff', marginBottom: 16 },
  avatarContainer: { position: 'relative' },
  avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#ddd' },
  cameraButton: { position: 'absolute', bottom: 0, right: 0, backgroundColor: lightTheme.colors.primary, padding: 8, borderRadius: 16, borderWidth: 2, borderColor: '#fff' },
  changePhotoText: { color: lightTheme.colors.primary, fontSize: 14, fontWeight: '600', marginTop: 12 },
  section: { backgroundColor: '#fff', padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 16, color: '#333' },
  row: { flexDirection: 'row', gap: 12 },
  halfInput: { flex: 1 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 12, color: '#666', marginBottom: 6, fontWeight: '500' },
  input: { backgroundColor: '#f5f5f5', borderRadius: 8, padding: 12, fontSize: 16, borderWidth: 1, borderColor: '#eee' },
  verificationCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', padding: 16, borderRadius: 12 },
  verificationIcon: { marginRight: 12 },
  verificationContent: { flex: 1 },
  verificationTitle: { fontSize: 14, fontWeight: '600', color: '#2E7D32' },
  verificationText: { fontSize: 12, color: '#666', marginTop: 2 },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, marginVertical: 24, gap: 8 },
  deleteButtonText: { color: '#CC0000', fontSize: 16, fontWeight: '600' },
});

