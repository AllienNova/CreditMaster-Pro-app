/**
 * @jest-environment node
 */
describe('Dispute Letter Generator', () => {
  describe('Template Selection', () => {
    const templates = {
      'not_mine': 'I am writing to dispute the following account that does not belong to me.',
      'incorrect_balance': 'I am writing to dispute the incorrect balance reported on my account.',
      'paid_collection': 'I am writing to dispute a collection that has been paid in full.',
      'late_payment': 'I am writing to dispute a late payment that was reported in error.',
      'identity_theft': 'I am a victim of identity theft and am disputing fraudulent accounts.',
    };

    it('should have template for not_mine disputes', () => {
      expect(templates['not_mine']).toContain('does not belong to me');
    });

    it('should have template for incorrect_balance disputes', () => {
      expect(templates['incorrect_balance']).toContain('incorrect balance');
    });

    it('should have template for identity_theft disputes', () => {
      expect(templates['identity_theft']).toContain('victim of identity theft');
    });
  });

  describe('Letter Generation', () => {
    interface DisputeData {
      bureau: string;
      accountName: string;
      accountNumber: string;
      reason: string;
      consumerName: string;
      consumerAddress: string;
    }

    const generateLetter = (data: DisputeData) => {
      const bureauAddresses: Record<string, string> = {
        experian: 'P.O. Box 4500, Allen, TX 75013',
        equifax: 'P.O. Box 740256, Atlanta, GA 30374',
        transunion: 'P.O. Box 2000, Chester, PA 19016',
      };

      return {
        to: bureauAddresses[data.bureau] || '',
        from: `${data.consumerName}\n${data.consumerAddress}`,
        date: new Date().toISOString().split('T')[0],
        subject: `Dispute of ${data.accountName}`,
        body: `Account: ${data.accountName} (${data.accountNumber})\nReason: ${data.reason}`,
        hasValidBureau: !!bureauAddresses[data.bureau],
      };
    };

    it('should generate letter with correct bureau address', () => {
      const letter = generateLetter({
        bureau: 'experian',
        accountName: 'Test Bank',
        accountNumber: '****1234',
        reason: 'Account not mine',
        consumerName: 'John Doe',
        consumerAddress: '123 Main St',
      });
      expect(letter.to).toContain('Allen, TX');
      expect(letter.hasValidBureau).toBe(true);
    });

    it('should include account details in body', () => {
      const letter = generateLetter({
        bureau: 'equifax',
        accountName: 'Credit Card Co',
        accountNumber: '****5678',
        reason: 'Incorrect balance',
        consumerName: 'Jane Doe',
        consumerAddress: '456 Oak Ave',
      });
      expect(letter.body).toContain('Credit Card Co');
      expect(letter.body).toContain('****5678');
    });

    it('should handle invalid bureau', () => {
      const letter = generateLetter({
        bureau: 'invalid',
        accountName: 'Test',
        accountNumber: '1234',
        reason: 'Test',
        consumerName: 'Test',
        consumerAddress: 'Test',
      });
      expect(letter.hasValidBureau).toBe(false);
    });
  });

  describe('Document Formatting', () => {
    const formatDocument = (text: string, format: 'pdf' | 'docx' | 'txt') => {
      const baseContent = text.trim();
      
      return {
        format,
        content: baseContent,
        mimeType: format === 'pdf' ? 'application/pdf' 
          : format === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
          : 'text/plain',
        extension: `.${format}`,
      };
    };

    it('should format as PDF with correct mime type', () => {
      const doc = formatDocument('Test content', 'pdf');
      expect(doc.mimeType).toBe('application/pdf');
      expect(doc.extension).toBe('.pdf');
    });

    it('should format as DOCX with correct mime type', () => {
      const doc = formatDocument('Test content', 'docx');
      expect(doc.mimeType).toContain('wordprocessingml');
    });

    it('should format as TXT with correct mime type', () => {
      const doc = formatDocument('Test content', 'txt');
      expect(doc.mimeType).toBe('text/plain');
    });
  });

  describe('Letter Tracking', () => {
    interface LetterStatus {
      id: string;
      sentDate: string;
      bureau: string;
      status: 'draft' | 'sent' | 'delivered' | 'response_received';
      responseDeadline: string;
    }

    const calculateResponseDeadline = (sentDate: string) => {
      const date = new Date(sentDate);
      date.setDate(date.getDate() + 30); // 30 days to respond
      return date.toISOString().split('T')[0];
    };

    const getDaysRemaining = (deadline: string) => {
      const now = new Date();
      const deadlineDate = new Date(deadline);
      const diff = deadlineDate.getTime() - now.getTime();
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    };

    it('should calculate 30-day response deadline', () => {
      const deadline = calculateResponseDeadline('2024-01-01');
      expect(deadline).toBe('2024-01-31');
    });

    it('should calculate days remaining correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 15);
      const deadline = futureDate.toISOString().split('T')[0];
      const remaining = getDaysRemaining(deadline);
      expect(remaining).toBeGreaterThanOrEqual(14);
      expect(remaining).toBeLessThanOrEqual(16);
    });
  });

  describe('Batch Processing', () => {
    it('should group disputes by bureau', () => {
      const disputes = [
        { id: '1', bureau: 'experian' },
        { id: '2', bureau: 'equifax' },
        { id: '3', bureau: 'experian' },
        { id: '4', bureau: 'transunion' },
      ];

      const grouped = disputes.reduce((acc, d) => {
        if (!acc[d.bureau]) acc[d.bureau] = [];
        acc[d.bureau].push(d);
        return acc;
      }, {} as Record<string, typeof disputes>);

      expect(grouped['experian'].length).toBe(2);
      expect(grouped['equifax'].length).toBe(1);
      expect(grouped['transunion'].length).toBe(1);
    });
  });
});

