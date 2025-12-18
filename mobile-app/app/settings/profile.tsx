/**
 * CPFI Profile Settings Screen
 * Edit user profile information
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { lightTheme as theme } from '../../src/constants/theme';
import { Card } from '../../src/components/Card';

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
}

export default function ProfileSettingsScreen() {
  const [profile, setProfile] = useState<ProfileData>({
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '(555) 123-4567',
    dateOfBirth: '1990-01-15',
    address: '123 Main Street',
    city: 'San Francisco',
    state: 'CA',
    zipCode: '94102',
  });
  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
    // Save profile logic here
  };

  const renderField = (label: string, key: keyof ProfileData, placeholder: string) => (
    <View style={styles.fieldContainer}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {isEditing ? (
        <TextInput
          style={styles.input}
          value={profile[key]}
          onChangeText={(text) => setProfile({ ...profile, [key]: text })}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textSecondary}
        />
      ) : (
        <Text style={styles.fieldValue}>{profile[key]}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <TouchableOpacity onPress={() => isEditing ? handleSave() : setIsEditing(true)}>
            <Text style={styles.editButton}>{isEditing ? 'Save' : 'Edit'}</Text>
          </TouchableOpacity>
        </View>

        {/* Profile Photo */}
        <View style={styles.photoSection}>
          <View style={styles.photoContainer}>
            <Image source={{ uri: 'https://via.placeholder.com/100' }} style={styles.photo} />
            {isEditing && (
              <TouchableOpacity style={styles.photoEditButton}>
                <Ionicons name="camera" size={16} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
          <Text style={styles.photoName}>{profile.firstName} {profile.lastName}</Text>
          <Text style={styles.photoEmail}>{profile.email}</Text>
        </View>

        {/* Personal Information */}
        <Text style={styles.sectionTitle}>Personal Information</Text>
        <Card style={styles.card}>
          {renderField('First Name', 'firstName', 'Enter first name')}
          <View style={styles.divider} />
          {renderField('Last Name', 'lastName', 'Enter last name')}
          <View style={styles.divider} />
          {renderField('Email', 'email', 'Enter email')}
          <View style={styles.divider} />
          {renderField('Phone', 'phone', 'Enter phone number')}
          <View style={styles.divider} />
          {renderField('Date of Birth', 'dateOfBirth', 'YYYY-MM-DD')}
        </Card>

        {/* Address */}
        <Text style={styles.sectionTitle}>Address</Text>
        <Card style={styles.card}>
          {renderField('Street Address', 'address', 'Enter street address')}
          <View style={styles.divider} />
          {renderField('City', 'city', 'Enter city')}
          <View style={styles.divider} />
          <View style={styles.rowFields}>
            <View style={[styles.fieldContainer, { flex: 1, marginRight: 8 }]}>
              <Text style={styles.fieldLabel}>State</Text>
              {isEditing ? (
                <TextInput style={styles.input} value={profile.state} onChangeText={(text) => setProfile({ ...profile, state: text })} placeholder="State" placeholderTextColor={theme.colors.textSecondary} />
              ) : (
                <Text style={styles.fieldValue}>{profile.state}</Text>
              )}
            </View>
            <View style={[styles.fieldContainer, { flex: 1 }]}>
              <Text style={styles.fieldLabel}>ZIP Code</Text>
              {isEditing ? (
                <TextInput style={styles.input} value={profile.zipCode} onChangeText={(text) => setProfile({ ...profile, zipCode: text })} placeholder="ZIP" placeholderTextColor={theme.colors.textSecondary} keyboardType="numeric" />
              ) : (
                <Text style={styles.fieldValue}>{profile.zipCode}</Text>
              )}
            </View>
          </View>
        </Card>

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color="#EF4444" />
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollView: { flex: 1, padding: theme.spacing.lg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.lg },
  backButton: { padding: 4 },
  title: { fontSize: 20, fontWeight: '700', color: theme.colors.text },
  editButton: { fontSize: 16, fontWeight: '600', color: theme.colors.primary },
  photoSection: { alignItems: 'center', marginBottom: theme.spacing.xl },
  photoContainer: { position: 'relative' },
  photo: { width: 100, height: 100, borderRadius: 50, backgroundColor: theme.colors.surface },
  photoEditButton: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center' },
  photoName: { fontSize: 20, fontWeight: '600', color: theme.colors.text, marginTop: theme.spacing.md },
  photoEmail: { fontSize: 14, color: theme.colors.textSecondary, marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'uppercase', marginBottom: theme.spacing.sm },
  card: { marginBottom: theme.spacing.lg },
  fieldContainer: { paddingVertical: 8 },
  fieldLabel: { fontSize: 12, color: theme.colors.textSecondary, marginBottom: 4 },
  fieldValue: { fontSize: 16, color: theme.colors.text },
  input: { fontSize: 16, color: theme.colors.text, padding: 8, backgroundColor: theme.colors.background, borderRadius: 8 },
  divider: { height: 1, backgroundColor: theme.colors.border, marginVertical: 4 },
  rowFields: { flexDirection: 'row' },
  deleteButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, marginTop: theme.spacing.lg },
  deleteText: { fontSize: 16, fontWeight: '500', color: '#EF4444', marginLeft: 8 },
});

