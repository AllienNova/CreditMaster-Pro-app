import 'package:creditmaster_domain/models/documents.dart';
import 'package:flutter/material.dart';
import '../documents_module.dart';
import 'document_detail_screen.dart';

class DocumentListScreen extends StatefulWidget {
  const DocumentListScreen({super.key, required this.module});

  final DocumentsModule module;

  @override
  State<DocumentListScreen> createState() => _DocumentListScreenState();
}

class _DocumentListScreenState extends State<DocumentListScreen> {
  late Future<List<DocumentDto>> _future;

  @override
  void initState() {
    super.initState();
    _future = widget.module.fetchDocuments();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      body: FutureBuilder<List<DocumentDto>>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          final documents = snapshot.data ?? const [];
          return ListView.separated(
            itemCount: documents.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, index) {
              final doc = documents[index];
              return ListTile(
                title: Text(doc.originalName),
                subtitle: Text(doc.mimeType),
                trailing: Text('${(doc.size / 1024).toStringAsFixed(1)} KB'),
                onTap: () => Navigator.of(context).push(
                  MaterialPageRoute(
                      builder: (_) => DocumentDetailScreen(document: doc)),
                ),
              );
            },
          );
        },
      ),
    );
  }
}
