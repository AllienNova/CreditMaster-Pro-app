import React, { useState, useRef } from "react";
import {
  View,
  Text,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../src/hooks/useTheme";
import { withOpacity } from "../../src/constants/theme";
import { useAuthStore } from "../../src/store/authStore";

const { width } = Dimensions.get("window");

const ONBOARDING_SLIDES = [
  {
    id: "1",
    icon: "sparkles-outline",
    title: "Welcome to Fynvita",
    description:
      "Your complete financial vitality platform. Credit repair, smart budgeting, and investment intelligence in one app.",
    benefit: "\u2713 5-minute setup  \u2713 Bank-level security",
    color: "#10B981", // emerald-500
  },
  {
    id: "2",
    icon: "pulse-outline",
    title: "Your Financial Vitality Score",
    description:
      "Get a unified view of your financial health. Track credit, spending, savings, debt, and investments all in one score.",
    benefit: "Comprehensive 0-100 health score",
    color: "#3B82F6", // blue-500
  },
  {
    id: "3",
    icon: "search-outline",
    title: "Find & Fix Credit Errors",
    description:
      "Our AI scans your credit reports from all 3 bureaus to find errors that could be lowering your score.",
    benefit: "94% of users find at least one error",
    color: "#8B5CF6", // violet-500
  },
  {
    id: "4",
    icon: "wallet-outline",
    title: "Smart Money Management",
    description:
      "Track spending, manage subscriptions, and see your payday countdown. Take control of your cash flow.",
    benefit: "Average $200/mo saved on subscriptions",
    color: "#F59E0B", // amber-500
  },
  {
    id: "5",
    icon: "trending-up-outline",
    title: "Reach Your Goals Faster",
    description:
      "Whether it's buying a home, paying off debt, or building savings - we'll create a personalized plan for you.",
    benefit: "Users reach goals 40% faster",
    color: "#EC4899", // pink-500
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const { colors, spacing, borderRadius, fontSize, fontWeight } = useTheme();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

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
    // Signed OUT, this is the pre-auth welcome and login is the next step.
    // Signed IN — reachable by back-navigation or a deep link — sending them
    // to a login screen they are already past is the exact bug this carousel
    // caused when the root index pointed its onboarding branch here.
    //
    // Routes to "/" rather than "/(tabs)" so the root keeps ownership of the
    // signed-in destination; no loop, because the root only sends a visitor
    // here when there is no user.
    router.replace(isAuthenticated ? "/" : "/(auth)/login");
  };

  const renderSlide = ({ item }: { item: (typeof ONBOARDING_SLIDES)[0] }) => (
    <View
      style={{
        width,
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 40,
      }}
    >
      <View
        style={{
          width: 160,
          height: 160,
          borderRadius: 80,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 40,
          backgroundColor: withOpacity(item.color, 0.12),
        }}
      >
        <Ionicons name={item.icon as any} size={80} color={item.color} />
      </View>
      <Text
        style={{
          fontSize: 28,
          fontWeight: fontWeight.bold,
          color: colors.text,
          textAlign: "center",
          marginBottom: spacing.md,
        }}
      >
        {item.title}
      </Text>
      <Text
        style={{
          fontSize: fontSize.md,
          color: colors.textSecondary,
          textAlign: "center",
          lineHeight: 24,
          marginBottom: 20,
        }}
      >
        {item.description}
      </Text>
      <View
        style={{
          paddingHorizontal: 20,
          paddingVertical: spacing.lg / 2,
          borderRadius: 20,
          marginTop: spacing.sm,
          backgroundColor: withOpacity(item.color, 0.08),
        }}
      >
        <Text
          style={{
            fontSize: fontSize.sm,
            fontWeight: fontWeight.semibold,
            textAlign: "center",
            color: item.color,
          }}
        >
          {item.benefit}
        </Text>
      </View>
    </View>
  );

  const renderDots = () => (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        marginVertical: spacing.lg,
      }}
    >
      {ONBOARDING_SLIDES.map((_, index) => {
        const inputRange = [
          (index - 1) * width,
          index * width,
          (index + 1) * width,
        ];
        const dotWidth = scrollX.interpolate({
          inputRange,
          outputRange: [8, 24, 8],
          extrapolate: "clamp",
        });
        const opacity = scrollX.interpolate({
          inputRange,
          outputRange: [0.3, 1, 0.3],
          extrapolate: "clamp",
        });
        return (
          <Animated.View
            key={index}
            style={{
              height: 8,
              borderRadius: borderRadius.sm,
              marginHorizontal: spacing.xs,
              width: dotWidth,
              opacity,
              backgroundColor: ONBOARDING_SLIDES[currentIndex].color,
            }}
          />
        );
      })}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View
        style={{
          flexDirection: "row",
          justifyContent: "flex-end",
          padding: spacing.md,
          paddingTop: spacing.xxl,
        }}
      >
        <TouchableOpacity onPress={handleSkip}>
          <Text
            style={{
              fontSize: fontSize.md,
              color: colors.textSecondary,
              fontWeight: fontWeight.medium,
            }}
          >
            Skip
          </Text>
        </TouchableOpacity>
      </View>

      <FlatList
        ref={flatListRef}
        data={ONBOARDING_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: false },
        )}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {renderDots()}

      <View style={{ padding: spacing.lg, paddingBottom: 40 }}>
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            padding: spacing.md,
            borderRadius: borderRadius.lg,
            gap: spacing.sm,
            backgroundColor: ONBOARDING_SLIDES[currentIndex].color,
          }}
          onPress={handleNext}
        >
          <Text
            style={{
              fontSize: fontSize.lg,
              fontWeight: fontWeight.semibold,
              color: colors.white,
            }}
          >
            {currentIndex === ONBOARDING_SLIDES.length - 1
              ? "Get Started"
              : "Next"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.white} />
        </TouchableOpacity>

        {currentIndex === ONBOARDING_SLIDES.length - 1 && (
          <TouchableOpacity
            style={{ alignItems: "center", marginTop: spacing.md }}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text
              style={{ fontSize: fontSize.sm, color: colors.textSecondary }}
            >
              Already have an account?{" "}
              <Text
                style={{
                  color: colors.primary,
                  fontWeight: fontWeight.semibold,
                }}
              >
                Sign In
              </Text>
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
