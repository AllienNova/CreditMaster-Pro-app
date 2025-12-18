/**
 * CPFI Financial Navigation Layout
 */

import { Stack } from 'expo-router';
import { lightTheme as theme } from '../../src/constants/theme';

export default function FinancialLayout() {
  const headerOptions = {
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerTitleStyle: { fontWeight: '600' as const },
    headerShadowVisible: false,
  };

  return (
    <Stack screenOptions={headerOptions}>
      <Stack.Screen
        name="index"
        options={{ title: 'Finances', headerShown: false }}
      />
      <Stack.Screen
        name="overview"
        options={{ title: 'Financial Overview', headerShown: false }}
      />
      <Stack.Screen
        name="accounts"
        options={{ title: 'Accounts', headerShown: false }}
      />
      <Stack.Screen
        name="account-detail"
        options={{ title: 'Account Details', headerShown: false }}
      />
      <Stack.Screen
        name="transactions"
        options={{ title: 'Transactions', headerShown: false }}
      />
      <Stack.Screen
        name="budgets"
        options={{ title: 'Budgets', headerShown: false }}
      />
      <Stack.Screen
        name="budget-detail"
        options={{ title: 'Budget Details', headerShown: false }}
      />
      <Stack.Screen
        name="goals"
        options={{ title: 'Goals', headerShown: false }}
      />
      <Stack.Screen
        name="goal-detail"
        options={{ title: 'Goal Details', headerShown: false }}
      />
      <Stack.Screen
        name="debt"
        options={{ title: 'Debt Payoff', headerShown: false }}
      />
      <Stack.Screen
        name="bills"
        options={{ title: 'Bills & Payments', headerShown: false }}
      />
      <Stack.Screen
        name="insights"
        options={{ title: 'Spending Insights', headerShown: false }}
      />
      <Stack.Screen
        name="cash-flow"
        options={{ title: 'Cash Flow', headerShown: false }}
      />
      <Stack.Screen
        name="net-worth"
        options={{ title: 'Net Worth', headerShown: false }}
      />
      <Stack.Screen
        name="investments"
        options={{ title: 'Investments', headerShown: false }}
      />
      <Stack.Screen
        name="savings"
        options={{ title: 'Savings', headerShown: false }}
      />
      <Stack.Screen
        name="spending"
        options={{ title: 'Spending Analysis', headerShown: false }}
      />
      <Stack.Screen
        name="income"
        options={{ title: 'Income', headerShown: false }}
      />
      <Stack.Screen
        name="reports"
        options={{ title: 'Reports', headerShown: false }}
      />
    </Stack>
  );
}
