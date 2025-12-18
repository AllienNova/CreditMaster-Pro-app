import 'package:creditmaster_domain/models/billing.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';
import 'package:creditmaster_billing_module/screens/billing_dashboard_screen.dart';
import 'package:creditmaster_billing_module/billing_module.dart';

class _FakeBillingModule extends BillingModule {
  _FakeBillingModule();

  @override
  Future<BillingProfileDto> fetchProfile() async => BillingProfileDto(
        planId: 'pro',
        status: 'active',
        cancelAtPeriodEnd: false,
        currentPeriodStart: DateTime(2025, 1, 1),
        currentPeriodEnd: DateTime(2025, 2, 1),
        invoices: [
          BillingInvoiceDto(
            id: 'inv_1',
            amount: 99,
            status: 'paid',
            created: DateTime(2025, 1, 1),
          ),
        ],
      );
}

void main() {
  testGoldens('BillingDashboardScreen shows active plan', (tester) async {
    final builder = Builder(builder: (_) => BillingDashboardScreen(module: _FakeBillingModule()));
    await tester.pumpWidgetBuilder(builder);
    await screenMatchesGolden(tester, 'billing/dashboard_screen');
  });
}
