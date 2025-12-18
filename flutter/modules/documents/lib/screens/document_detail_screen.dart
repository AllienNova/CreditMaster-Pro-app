import 'package:creditmaster_domain/models/documents.dart';
import 'package:flutter/material.dart';
import '../repositories/document_repository.dart';
import '../documents_module.dart';

class DocumentDetailScreen extends StatefulWidget {
  const DocumentDetailScreen({super.key, required this.document});

  final DocumentDto document;

  @override
  State<DocumentDetailScreen> createState() => _DocumentDetailScreenState();
}

class _DocumentDetailScreenState extends State<DocumentDetailScreen> {
  final _emailsController = TextEditingController();
  final _repository = DocumentRepository(module: DocumentsModule());
  bool _sharing = false;
  String? _shareStatus;

  @override
  void dispose() {
    _emailsController.dispose();
    super.dispose();
  }

  Future<void> _share() async {
    final emails = _emailsController.text
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    if (emails.isEmpty) {
      setState(() => _shareStatus = 'Enter at least one email');
      return;
    }
    setState(() {
      _sharing = true;
      _shareStatus = null;
    });
    try {
      await _repository.shareDocument(
          documentId: widget.document.id, recipients: emails);
      setState(() => _shareStatus = 'Secure link created');
    } catch (err) {
      setState(() => _shareStatus = 'Failed: $err');
    } finally {
      setState(() => _sharing = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final doc = widget.document;
    return Scaffold(
      appBar: AppBar(title: Text(doc.originalName)),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Type: ${doc.type.name}',
                style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            Text('Size: ${(doc.size / 1024).toStringAsFixed(1)} KB'),
            const SizedBox(height: 24),
            TextField(
              controller: _emailsController,
              decoration: const InputDecoration(
                labelText: 'Share with (emails, comma separated)',
                border: OutlineInputBorder(),
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            if (_shareStatus != null)
              Text(
                _shareStatus!,
                style: TextStyle(
                    color: _shareStatus!.startsWith('Failed')
                        ? Colors.red
                        : Colors.green),
              ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: _sharing ? null : _share,
              child: _sharing
                  ? const CircularProgressIndicator()
                  : const Text('Generate secure link'),
            ),
          ],
        ),
      ),
    );
  }
}
