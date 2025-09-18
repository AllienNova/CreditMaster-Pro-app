import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import type { CreditReport, ParsedCreditData, CreditItem, PersonalInfo } from '@/types';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

export interface ParsedCreditReport {
  bureau: 'experian' | 'equifax' | 'transunion';
  creditScore: number;
  personalInfo: PersonalInfo;
  accounts: CreditItem[];
  inquiries: CreditItem[];
  publicRecords: CreditItem[];
  collections: CreditItem[];
  rawText: string;
  confidence: number;
}

export class CreditReportParser {
  private static bureauPatterns = {
    experian: [
      /experian/i,
      /exp\s*credit/i,
      /experian\.com/i,
      /experian information solutions/i
    ],
    equifax: [
      /equifax/i,
      /eqf\s*credit/i,
      /equifax\.com/i,
      /equifax information services/i
    ],
    transunion: [
      /transunion/i,
      /trans\s*union/i,
      /transunion\.com/i,
      /trans union llc/i
    ]
  };

  private static scorePatterns = [
    /(?:fico|credit|score)[\s\w]*?:?\s*(\d{3})/i,
    /score[\s\w]*?(\d{3})/i,
    /(\d{3})\s*(?:fico|credit|score)/i,
    /your\s+(?:fico\s+)?score\s*:?\s*(\d{3})/i
  ];

  static async parseFile(file: File): Promise<ParsedCreditReport> {
    try {
      let text = '';
      
      if (file.type === 'application/pdf') {
        text = await this.parsePDF(file);
      } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
        text = await this.parseWord(file);
      } else if (file.type === 'text/plain') {
        text = await this.parseText(file);
      } else {
        throw new Error('Unsupported file type. Please upload PDF, Word, or text files.');
      }

      return await this.parseText(text);
    } catch (error) {
      console.error('Credit report parsing error:', error);
      throw new Error(`Failed to parse credit report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async parsePDF(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  }

  private static async parseWord(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  }

  private static async parseText(file: File): Promise<string> {
    return await file.text();
  }

  private static async parseText(text: string): Promise<ParsedCreditReport> {
    const bureau = this.detectBureau(text);
    const creditScore = this.extractCreditScore(text);
    const personalInfo = this.extractPersonalInfo(text);
    const accounts = this.extractAccounts(text);
    const inquiries = this.extractInquiries(text);
    const publicRecords = this.extractPublicRecords(text);
    const collections = this.extractCollections(text);

    // Calculate confidence based on extracted data quality
    const confidence = this.calculateConfidence({
      bureau,
      creditScore,
      personalInfo,
      accounts,
      inquiries,
      publicRecords,
      collections
    });

    return {
      bureau,
      creditScore,
      personalInfo,
      accounts,
      inquiries,
      publicRecords,
      collections,
      rawText: text,
      confidence
    };
  }

  private static detectBureau(text: string): 'experian' | 'equifax' | 'transunion' {
    const lowerText = text.toLowerCase();
    
    for (const [bureau, patterns] of Object.entries(this.bureauPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(lowerText)) {
          return bureau as 'experian' | 'equifax' | 'transunion';
        }
      }
    }
    
    // Default to experian if no bureau detected
    return 'experian';
  }

  private static extractCreditScore(text: string): number {
    for (const pattern of this.scorePatterns) {
      const match = text.match(pattern);
      if (match) {
        const score = parseInt(match[1]);
        if (score >= 300 && score <= 850) {
          return score;
        }
      }
    }
    
    // Return 0 if no valid score found
    return 0;
  }

  private static extractPersonalInfo(text: string): PersonalInfo {
    const namePattern = /(?:name|consumer)[\s\w]*?:?\s*([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
    const ssnPattern = /(?:ssn|social)[\s\w]*?:?\s*(\d{3}-?\d{2}-?\d{4})/i;
    const dobPattern = /(?:dob|birth|born)[\s\w]*?:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i;
    const addressPattern = /(?:address|addr)[\s\w]*?:?\s*([^\n]+)/i;

    const nameMatch = text.match(namePattern);
    const ssnMatch = text.match(ssnPattern);
    const dobMatch = text.match(dobPattern);
    const addressMatch = text.match(addressPattern);

    return {
      name: nameMatch ? nameMatch[1].trim() : '',
      ssn: ssnMatch ? ssnMatch[1].replace(/-/g, '') : '',
      date_of_birth: dobMatch ? dobMatch[1] : '',
      addresses: addressMatch ? [this.parseAddress(addressMatch[1])] : [],
      employment: []
    };
  }

  private static parseAddress(addressText: string): any {
    // Simple address parsing - can be enhanced
    const parts = addressText.split(',').map(p => p.trim());
    return {
      street: parts[0] || '',
      city: parts[1] || '',
      state: parts[2]?.split(' ')[0] || '',
      zip_code: parts[2]?.split(' ')[1] || '',
      country: 'US'
    };
  }

  private static extractAccounts(text: string): CreditItem[] {
    const accounts: CreditItem[] = [];
    const accountPatterns = [
      /(?:account|acct)[\s\w]*?:?\s*([^\n]+)/gi,
      /(?:credit card|mortgage|auto loan|personal loan)[\s\w]*?([^\n]+)/gi
    ];

    // This is a simplified extraction - real implementation would be more sophisticated
    const lines = text.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Look for account indicators
      if (this.isAccountLine(line)) {
        const account = this.parseAccountLine(line, lines.slice(i, i + 5));
        if (account) {
          accounts.push(account);
        }
      }
    }

    return accounts;
  }

  private static isAccountLine(line: string): boolean {
    const accountIndicators = [
      /credit card/i,
      /mortgage/i,
      /auto loan/i,
      /personal loan/i,
      /installment/i,
      /revolving/i,
      /\$[\d,]+/,
      /balance/i,
      /payment/i
    ];

    return accountIndicators.some(pattern => pattern.test(line));
  }

  private static parseAccountLine(line: string, context: string[]): CreditItem | null {
    // Extract account information from line and context
    const creditorMatch = line.match(/^([A-Z\s&]+)/);
    const balanceMatch = line.match(/\$?([\d,]+)/);
    const statusMatch = line.match(/(current|late|charge.*off|collection)/i);

    if (!creditorMatch) return null;

    return {
      id: this.generateId(),
      user_id: '', // Will be set when saving
      report_id: '', // Will be set when saving
      item_type: 'account',
      creditor: creditorMatch[1].trim(),
      furnisher: creditorMatch[1].trim(),
      account_number: this.extractAccountNumber(line),
      account_type: this.determineAccountType(line),
      balance: balanceMatch ? parseInt(balanceMatch[1].replace(/,/g, '')) : null,
      original_balance: null,
      credit_limit: null,
      payment_status: statusMatch ? statusMatch[1].toLowerCase() : 'unknown',
      date_opened: null,
      date_closed: null,
      last_payment_date: null,
      first_reported_date: new Date().toISOString().split('T')[0],
      last_reported_date: new Date().toISOString().split('T')[0],
      status: 'active',
      dispute_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private static extractAccountNumber(line: string): string | null {
    const accountNumberPattern = /(?:acct|account)[\s#]*(\d{4,})/i;
    const match = line.match(accountNumberPattern);
    return match ? match[1] : null;
  }

  private static determineAccountType(line: string): string | null {
    const typePatterns = {
      'credit_card': /credit card|visa|mastercard|amex|discover/i,
      'mortgage': /mortgage|home loan/i,
      'auto_loan': /auto|car|vehicle/i,
      'personal_loan': /personal|installment/i,
      'student_loan': /student|education/i
    };

    for (const [type, pattern] of Object.entries(typePatterns)) {
      if (pattern.test(line)) {
        return type;
      }
    }

    return 'other';
  }

  private static extractInquiries(text: string): CreditItem[] {
    const inquiries: CreditItem[] = [];
    const inquiryPatterns = [
      /inquiry|inquiries/i,
      /credit check/i,
      /hard pull/i
    ];

    // Simplified inquiry extraction
    const lines = text.split('\n');
    let inInquirySection = false;

    for (const line of lines) {
      if (inquiryPatterns.some(pattern => pattern.test(line))) {
        inInquirySection = true;
        continue;
      }

      if (inInquirySection && this.isInquiryLine(line)) {
        const inquiry = this.parseInquiryLine(line);
        if (inquiry) {
          inquiries.push(inquiry);
        }
      }
    }

    return inquiries;
  }

  private static isInquiryLine(line: string): boolean {
    return /\d{2}\/\d{2}\/\d{4}/.test(line) && line.length > 10;
  }

  private static parseInquiryLine(line: string): CreditItem | null {
    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
    const creditorMatch = line.match(/^([A-Z\s&]+)/);

    if (!dateMatch || !creditorMatch) return null;

    return {
      id: this.generateId(),
      user_id: '',
      report_id: '',
      item_type: 'inquiry',
      creditor: creditorMatch[1].trim(),
      furnisher: null,
      account_number: null,
      account_type: null,
      balance: null,
      original_balance: null,
      credit_limit: null,
      payment_status: 'inquiry',
      date_opened: dateMatch[1],
      date_closed: null,
      last_payment_date: null,
      first_reported_date: dateMatch[1],
      last_reported_date: dateMatch[1],
      status: 'active',
      dispute_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private static extractPublicRecords(text: string): CreditItem[] {
    const publicRecords: CreditItem[] = [];
    const recordPatterns = [
      /bankruptcy/i,
      /tax lien/i,
      /judgment/i,
      /foreclosure/i
    ];

    const lines = text.split('\n');
    
    for (const line of lines) {
      for (const pattern of recordPatterns) {
        if (pattern.test(line)) {
          const record = this.parsePublicRecordLine(line);
          if (record) {
            publicRecords.push(record);
          }
        }
      }
    }

    return publicRecords;
  }

  private static parsePublicRecordLine(line: string): CreditItem | null {
    const typeMatch = line.match(/(bankruptcy|tax lien|judgment|foreclosure)/i);
    const amountMatch = line.match(/\$?([\d,]+)/);
    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);

    if (!typeMatch) return null;

    return {
      id: this.generateId(),
      user_id: '',
      report_id: '',
      item_type: 'public_record',
      creditor: typeMatch[1],
      furnisher: null,
      account_number: null,
      account_type: typeMatch[1].toLowerCase().replace(' ', '_'),
      balance: amountMatch ? parseInt(amountMatch[1].replace(/,/g, '')) : null,
      original_balance: null,
      credit_limit: null,
      payment_status: 'filed',
      date_opened: dateMatch ? dateMatch[1] : null,
      date_closed: null,
      last_payment_date: null,
      first_reported_date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
      last_reported_date: new Date().toISOString().split('T')[0],
      status: 'active',
      dispute_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private static extractCollections(text: string): CreditItem[] {
    const collections: CreditItem[] = [];
    const collectionPatterns = [
      /collection/i,
      /debt collector/i,
      /recovery/i
    ];

    const lines = text.split('\n');
    
    for (const line of lines) {
      for (const pattern of collectionPatterns) {
        if (pattern.test(line)) {
          const collection = this.parseCollectionLine(line);
          if (collection) {
            collections.push(collection);
          }
        }
      }
    }

    return collections;
  }

  private static parseCollectionLine(line: string): CreditItem | null {
    const creditorMatch = line.match(/^([A-Z\s&]+)/);
    const amountMatch = line.match(/\$?([\d,]+)/);
    const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);

    if (!creditorMatch) return null;

    return {
      id: this.generateId(),
      user_id: '',
      report_id: '',
      item_type: 'collection',
      creditor: creditorMatch[1].trim(),
      furnisher: creditorMatch[1].trim(),
      account_number: null,
      account_type: 'collection',
      balance: amountMatch ? parseInt(amountMatch[1].replace(/,/g, '')) : null,
      original_balance: null,
      credit_limit: null,
      payment_status: 'collection',
      date_opened: dateMatch ? dateMatch[1] : null,
      date_closed: null,
      last_payment_date: null,
      first_reported_date: dateMatch ? dateMatch[1] : new Date().toISOString().split('T')[0],
      last_reported_date: new Date().toISOString().split('T')[0],
      status: 'active',
      dispute_history: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  private static calculateConfidence(data: any): number {
    let score = 0;
    let maxScore = 0;

    // Bureau detection (20 points)
    maxScore += 20;
    if (data.bureau !== 'experian') score += 20; // Default bureau gets no points

    // Credit score (25 points)
    maxScore += 25;
    if (data.creditScore > 0) score += 25;

    // Personal info (20 points)
    maxScore += 20;
    if (data.personalInfo.name) score += 5;
    if (data.personalInfo.ssn) score += 5;
    if (data.personalInfo.date_of_birth) score += 5;
    if (data.personalInfo.addresses.length > 0) score += 5;

    // Credit items (35 points)
    maxScore += 35;
    if (data.accounts.length > 0) score += 15;
    if (data.inquiries.length > 0) score += 5;
    if (data.publicRecords.length > 0) score += 5;
    if (data.collections.length > 0) score += 10;

    return Math.round((score / maxScore) * 100);
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }
}

// Enhanced parsing for specific bureau formats
export class BureauSpecificParser {
  static async parseExperian(text: string): Promise<Partial<ParsedCreditReport>> {
    // Experian-specific parsing logic
    return {};
  }

  static async parseEquifax(text: string): Promise<Partial<ParsedCreditReport>> {
    // Equifax-specific parsing logic
    return {};
  }

  static async parseTransUnion(text: string): Promise<Partial<ParsedCreditReport>> {
    // TransUnion-specific parsing logic
    return {};
  }
}

