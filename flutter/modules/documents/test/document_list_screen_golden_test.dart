import 'package:creditmaster_domain/models/documents.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:golden_toolkit/golden_toolkit.dart';
import 'package:creditmaster_documents_module/screens/document_list_screen.dart';
import 'package:creditmaster_documents_module/documents_module.dart';

class _FakeDocumentsModule extends DocumentsModule {
  _FakeDocumentsModule();

  @override
  Future<List<DocumentDto>> fetchDocuments() async => [
        DocumentDto(
          id: 'doc_1',
          userId: 'user',
          type: DocumentTypeDto.creditReport,
          originalName: 'Experian Report.pdf',
          size: 204800,
          mimeType: 'application/pdf',
          url: 'https://example.com',
          uploadedAt: DateTime(2025, 1, 1),
        ),
      ];
}

void main() {
  testGoldens('DocumentListScreen renders list tile', (tester) async {
    final builder = Builder(
        builder: (_) => DocumentListScreen(module: _FakeDocumentsModule()));
    await tester.pumpWidgetBuilder(builder);
    await screenMatchesGolden(tester, 'documents/list_screen');
  });
}
