import 'package:creditmaster_domain/models/documents.dart';
import '../documents_module.dart';

class DocumentRepository {
  DocumentRepository({required DocumentsModule module}) : _module = module;

  final DocumentsModule _module;

  Future<List<DocumentDto>> listDocuments() => _module.fetchDocuments();

  Future<DocumentShareLinkDto> shareDocument({
    required String documentId,
    required List<String> recipients,
  }) {
    return _module.createShareLink(
        documentId: documentId, recipients: recipients);
  }
}
