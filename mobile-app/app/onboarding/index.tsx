import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, FlatList, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { lightTheme } from '../../src/constants/theme';

const { width } = Dimensions.get('window');

const ONBOARDING_SLIDES = [
  {
    id: '1',
    icon: 'shield-checkmark-outline',
    title: 'Monitor Your Credit',
    description: 'Track your credit scores from all 3 bureaus in real-time. Get alerts when something changes.',
    color: '#4CAF50',
  },
  {
    id: '2',
    icon: 'document-text-outline',
    title: 'Dispute Errors',
    description: 'AI-powered dispute letters help you challenge inaccurate items and improve your score.',
    color: '#2196F3',
  },
  {
    id: '3',
    icon: 'trending-up-outline',
    title: 'Build Your Credit',
    description: 'Get personalized recommendations and tools to build a stronger credit profile.',
    color: '#FF9800',
  },
  {
    id: '4',
    icon: 'school-outline',
    title: 'Student Loan Help',
    description: 'Navigate federal programs, calculate savings, and manage your student debt effectively.',
    color: '#9C27B0',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;

  const handleNext = () => {
    if (currentIndex < ONBOARDING_SLIDES.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      handleGetStarted();
    }
  };

  const handleSkip = () => {
    handleGetStarted();
  };

  const handleGetStarted = () => {
    router.replace('/(auth)/login');
  };

  const renderSlide = ({ item }: { item: typeof ONBOARDING_SLIDES[0] }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Ionicons name={item.icon as any} size={80} color={item.color} />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  const renderDots = () => (
    <View style={styles.dotsContainer}>
      {ONBOARDING_SLIDES.map((_, index) => {
        const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: 'clamp',
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={index}
            style={[styles.dot, { width: dotWidth, opacity, backgroundColor: ONBOARDING_SLIDES[currentIndex].color }]}
          />
        );
      })}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={item => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
        onMomentumScrollEnd={event => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {renderDots()}

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: ONBOARDING_SLIDES[currentIndex].color }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>
            {currentIndex === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#FFFFFF" />
        </TouchableOpacity>

        {currentIndex === ONBOARDING_SLIDES.length - 1 && (
          <TouchableOpacity style={styles.loginLink} onPress={() => router.push('/(auth)/login')}>
            <Text style={styles.loginText}>Already have an account? <Text style={styles.loginTextBold}>Sign In</Text></Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: lightTheme.colors.background },
  header: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16, paddingTop: 48 },
  skipText: { fontSize: 16, color: lightTheme.colors.textSecondary },
  slide: { width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  iconContainer: { width: 160, height: 160, borderRadius: 80, alignItems: 'center', justifyContent: 'center', marginBottom: 40 },
  title: { fontSize: 28, fontWeight: '700', color: lightTheme.colors.text, textAlign: 'center', marginBottom: 16 },
  description: { fontSize: 16, color: lightTheme.colors.textSecondary, textAlign: 'center', lineHeight: 24 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginVertical: 24 },
  dot: { height: 8, borderRadius: 4, marginHorizontal: 4 },
  footer: { padding: 24, paddingBottom: 40 },
  button: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  buttonText: { fontSize: 18, fontWeight: '600', color: '#FFFFFF' },
  loginLink: { alignItems: 'center', marginTop: 16 },
  loginText: { fontSize: 14, color: lightTheme.colors.textSecondary },
  loginTextBold: { color: lightTheme.colors.primary, fontWeight: '600' },
});

