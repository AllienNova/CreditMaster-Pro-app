import React from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const LoadingScreen = () => {
  return (
    <LinearGradient
      colors={['#667eea', '#764ba2']}
      style={styles.container}
    >
      <View style={styles.content}>
        <Text style={styles.title}>CreditMaster Pro</Text>
        <Text style={styles.subtitle}>AI-Powered Credit Repair</Text>
        <ActivityIndicator 
          size="large" 
          color="#ffffff" 
          style={styles.loader}
        />
        <Text style={styles.loadingText}>Loading your credit profile...</Text>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#ffffff',
    opacity: 0.9,
    marginBottom: 48,
    textAlign: 'center',
  },
  loader: {
    marginBottom: 24,
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
    opacity: 0.8,
    textAlign: 'center',
  },
});

export default LoadingScreen;

