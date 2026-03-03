# Tax Module Compliance Checklist

This document outlines the compliance requirements, disclaimers, and regulatory considerations for the Fynvita Tax Optimization module.

## Required Disclaimers

### User-Facing Disclaimers

The following disclaimers MUST be displayed to users:

#### Primary Disclaimer (Dashboard)

> **Important:** Tax recommendations are for informational purposes only and do not constitute tax, legal, or financial advice. Consult a qualified tax professional before making any tax-related decisions.

#### Document Processing Disclaimer

> Extracted data from tax documents should be verified for accuracy. AI-powered extraction may contain errors. Always compare extracted values against your original documents.

#### Scenario Modeling Disclaimer

> These calculations are estimates for planning purposes only. Actual tax liability may vary based on your complete tax situation. Consult a qualified tax professional before making tax decisions.

#### Year-End Actions Disclaimer

> Tax strategies and deadlines are based on current tax law as of [current year]. Tax laws are subject to change. Verify all deadlines and strategies with a tax professional.

## Disclaimer Placement Requirements

| Location                   | Disclaimer Type     | Dismissible   |
| -------------------------- | ------------------- | ------------- |
| Tax Dashboard (top banner) | Primary             | Yes (session) |
| Document Upload Results    | Document Processing | No            |
| Scenario Modeler           | Scenario Modeling   | No            |
| Tax Calendar               | Year-End Actions    | No            |
| All Recommendation Cards   | Primary (footer)    | No            |
| Mobile App Tax Screen      | Primary             | Yes (session) |

## Data Protection Requirements

### Personal Data Handling

- [ ] All tax data encrypted at rest (AES-256)
- [ ] TLS 1.3 for data in transit
- [ ] Row-Level Security (RLS) on all tax tables
- [ ] No PII in application logs
- [ ] Secure deletion of processing artifacts
- [ ] Document storage in encrypted buckets

### Data Retention

| Data Type         | Retention Period          | Deletion Method         |
| ----------------- | ------------------------- | ----------------------- |
| Tax Documents     | User-controlled           | Hard delete on request  |
| Extracted Data    | 7 years (IRS requirement) | Soft delete, then purge |
| Audit Logs        | 7 years                   | Archive after 1 year    |
| Processing Logs   | 30 days                   | Auto-purge              |
| Raw OCR Responses | 7 days                    | Auto-purge              |

### User Rights (GDPR/CCPA)

- [ ] Right to access all tax data
- [ ] Right to export data (JSON/PDF)
- [ ] Right to deletion (with retention exceptions)
- [ ] Right to correction
- [ ] Data portability

## Audit Trail Requirements

### Actions to Log

All of the following actions MUST be logged to `tax_audit_log`:

- [ ] Tax profile creation/update
- [ ] Tax analysis runs
- [ ] Document uploads
- [ ] Document deletions
- [ ] Recommendation views
- [ ] Recommendation acknowledgments
- [ ] Scenario model runs
- [ ] Settings changes

### Log Entry Format

```json
{
  "user_id": "uuid",
  "action_type": "document_uploaded",
  "entity_type": "tax_document",
  "entity_id": "uuid",
  "old_values": null,
  "new_values": {
    "documentType": "w2",
    "confidence": 0.95
  },
  "ip_address": "hashed",
  "user_agent": "anonymized",
  "created_at": "2024-01-15T10:30:00Z"
}
```

## Tax Law Compliance

### IRS Circular 230 Compliance

The Tax Optimization module does NOT provide tax advice as defined by IRS Circular 230. All recommendations are:

- For informational purposes only
- Not intended to be used to avoid tax penalties
- Not a substitute for professional tax advice

### State-Specific Considerations

- [ ] California Consumer Privacy Act (CCPA) compliance
- [ ] New York SHIELD Act compliance
- [ ] State-specific tax disclaimer requirements

## Security Checklist

### Authentication & Authorization

- [ ] All tax endpoints require authentication
- [ ] JWT token validation on every request
- [ ] Rate limiting on API endpoints
- [ ] CSRF protection on forms

### Document Security

- [ ] File type validation (PDF, PNG, JPG only)
- [ ] File size limits enforced (10MB max)
- [ ] Malware scanning on uploads
- [ ] Secure presigned URLs for document access
- [ ] Documents not publicly accessible

### API Security

- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS prevention (output encoding)
- [ ] No sensitive data in URLs

## Testing Requirements

### Before Release

- [ ] Unit tests for tax calculations
- [ ] Integration tests for API endpoints
- [ ] E2E tests for document upload flow
- [ ] Security penetration testing
- [ ] Accessibility testing (WCAG 2.1 AA)

### Tax Calculation Accuracy

- [ ] Verify federal tax brackets match IRS publications
- [ ] Verify state tax rates match state DOR
- [ ] Verify FICA rates and wage base
- [ ] Verify contribution limits
- [ ] Cross-reference with TurboTax/H&R Block for sample scenarios

## Annual Maintenance

### Tax Year Updates (December/January)

- [ ] Update federal tax brackets
- [ ] Update state tax brackets
- [ ] Update contribution limits (401k, IRA, HSA)
- [ ] Update FICA wage base
- [ ] Update standard deductions
- [ ] Update NIIT thresholds
- [ ] Review and update disclaimers

### Legislative Changes

- [ ] Monitor IRS announcements
- [ ] Track tax law changes
- [ ] Update affected calculations
- [ ] Notify users of significant changes

## Incident Response

### Data Breach Protocol

1. Identify and contain the breach
2. Assess scope and affected users
3. Notify affected users within 72 hours
4. Notify relevant authorities (state AGs, FTC)
5. Document incident and response
6. Implement remediation measures

### Contact Information

- Security Team: security@fynvita.com
- Privacy Officer: privacy@fynvita.com
- Legal: legal@fynvita.com

## Compliance Sign-Off

| Requirement             | Owner           | Date | Status |
| ----------------------- | --------------- | ---- | ------ |
| Disclaimers implemented | Dev Team        |      | ☐      |
| RLS policies applied    | Dev Team        |      | ☐      |
| Audit logging complete  | Dev Team        |      | ☐      |
| Security review         | Security Team   |      | ☐      |
| Legal review            | Legal Team      |      | ☐      |
| Privacy review          | Privacy Officer |      | ☐      |

---

_Last Updated: January 2026_
_Version: 1.0_
