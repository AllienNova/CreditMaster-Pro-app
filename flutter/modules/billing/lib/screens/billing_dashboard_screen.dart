import 'package:flutter/material.dart';
import 'package:creditmaster_domain/models/billing.dart';
import '../billing_module.dart';

class BillingDashboardScreen extends StatefulWidget {
  const BillingDashboardScreen({super.key, required this.module});

  final BillingModule module;

  @override
  State<BillingDashboardScreen> createState() => _BillingDashboardScreenState();
}

class _BillingDashboardScreenState extends State<BillingDashboardScreen> {
  BillingProfileDto? _profile;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final data = await widget.module.fetchProfile();
      setState(() => _profile = data);
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_loading) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }
    if (_error != null || _profile == null) {
      return Scaffold(
        body: Center(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(_error ?? 'Unknown error'),
              const SizedBox(height: 12),
              ElevatedButton(onPressed: _load, child: const Text('Retry')),
            ],
          ),
        ),
      );
    }

    final profile = _profile!;
    return Scaffold(
      appBar: AppBar(title: const Text('Billing overview')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: ListTile(
              title: Text('Plan: ${profile.planId}'),
              subtitle: Text('Status: ${profile.status}'),
            ),
          ),
          const SizedBox(height: 16),
          ...profile.invoices.map((invoice) => Card(
                child: ListTile(
                  title: Text('Invoice ${invoice.id}'),
                  subtitle: Text(invoice.status),
                  trailing: Text('\$${invoice.amount.toStringAsFixed(2)}'),
                ),
              )),
        ],
      ),
    );
  }
}
