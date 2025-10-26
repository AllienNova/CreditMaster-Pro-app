/**
 * GDPR and CCPA Compliance Service
 * 
 * Implements:
 * - Right to access (GDPR Art. 15, CCPA §1798.110)
 * - Right to rectification (GDPR Art. 16)
 * - Right to erasure / deletion (GDPR Art. 17, CCPA §1798.105)
 * - Right to data portability (GDPR Art. 20, CCPA §1798.100)
 * - Right to opt-out (CCPA §1798.120)
 * - Consent management
 * - Data breach notification
 */

export interface UserDataExport {
  userId: string;
  exportDate: Date;
  data: {
    profile: any;
    creditReports: any[];
    disputes: any[];
    aiInteractions: any[];
    logs: any[];
  };
  format: 'json' | 'csv' | 'xml';
}

export interface ConsentRecord {
  userId: string;
  consentType: 'marketing' | 'analytics' | 'ai_processing' | 'data_sharing';
  granted: boolean;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
}

export interface DataDeletionRequest {
  userId: string;
  requestDate: Date;
  reason?: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  completionDate?: Date;
}

export interface DataBreachNotification {
  breachId: string;
  discoveredDate: Date;
  notifiedDate: Date;
  affectedUsers: string[];
  dataTypes: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  mitigationSteps: string[];
}

/**
 * GDPR Compliance Service
 */
class GDPRComplianceService {
  /**
   * Right to Access (GDPR Art. 15)
   * User can request all their personal data
   */
  async exportUserData(userId: string, format: 'json' | 'csv' | 'xml' = 'json'): Promise<UserDataExport> {
    // In production, fetch from database
    const userData: UserDataExport = {
      userId,
      exportDate: new Date(),
      format,
      data: {
        profile: await this.getUserProfile(userId),
        creditReports: await this.getUserCreditReports(userId),
        disputes: await this.getUserDisputes(userId),
        aiInteractions: await this.getUserAIInteractions(userId),
        logs: await this.getUserLogs(userId),
      },
    };
    
    return userData;
  }
  
  /**
   * Right to Rectification (GDPR Art. 16)
   * User can request correction of inaccurate data
   */
  async rectifyUserData(userId: string, corrections: Record<string, any>): Promise<boolean> {
    // In production, update database
    console.log(`Rectifying data for user ${userId}:`, corrections);
    return true;
  }
  
  /**
   * Right to Erasure (GDPR Art. 17)
   * User can request deletion of their data
   */
  async deleteUserData(userId: string, reason?: string): Promise<DataDeletionRequest> {
    const request: DataDeletionRequest = {
      userId,
      requestDate: new Date(),
      reason,
      status: 'pending',
    };
    
    // In production:
    // 1. Create deletion request
    // 2. Verify user identity
    // 3. Check legal obligations (e.g., financial records retention)
    // 4. Schedule deletion job
    // 5. Anonymize or delete data
    // 6. Notify user of completion
    
    console.log(`Data deletion request created for user ${userId}`);
    return request;
  }
  
  /**
   * Right to Data Portability (GDPR Art. 20)
   * User can receive their data in a structured, machine-readable format
   */
  async portUserData(userId: string, targetFormat: 'json' | 'csv' | 'xml'): Promise<string> {
    const userData = await this.exportUserData(userId, targetFormat);
    
    switch (targetFormat) {
      case 'json':
        return JSON.stringify(userData, null, 2);
      case 'csv':
        return this.convertToCSV(userData);
      case 'xml':
        return this.convertToXML(userData);
      default:
        return JSON.stringify(userData, null, 2);
    }
  }
  
  /**
   * Right to Restrict Processing (GDPR Art. 18)
   */
  async restrictProcessing(userId: string, restrictions: string[]): Promise<boolean> {
    // In production, update user preferences
    console.log(`Restricting processing for user ${userId}:`, restrictions);
    return true;
  }
  
  /**
   * Right to Object (GDPR Art. 21)
   */
  async objectToProcessing(userId: string, processingType: string): Promise<boolean> {
    // In production, update user preferences
    console.log(`User ${userId} objects to ${processingType}`);
    return true;
  }
  
  /**
   * Data Breach Notification (GDPR Art. 33-34)
   * Must notify within 72 hours
   */
  async notifyDataBreach(breach: Omit<DataBreachNotification, 'notifiedDate'>): Promise<void> {
    const notification: DataBreachNotification = {
      ...breach,
      notifiedDate: new Date(),
    };
    
    // In production:
    // 1. Notify supervisory authority within 72 hours
    // 2. Notify affected users if high risk
    // 3. Document the breach
    // 4. Implement mitigation steps
    
    console.log('Data breach notification:', notification);
    
    // Send emails to affected users
    for (const userId of breach.affectedUsers) {
      await this.sendBreachNotification(userId, notification);
    }
  }
  
  // Helper methods
  
  private async getUserProfile(userId: string): Promise<any> {
    // In production, fetch from database
    return { userId, name: '[User Name]', email: '[User Email]' };
  }
  
  private async getUserCreditReports(userId: string): Promise<any[]> {
    // In production, fetch from database
    return [];
  }
  
  private async getUserDisputes(userId: string): Promise<any[]> {
    // In production, fetch from database
    return [];
  }
  
  private async getUserAIInteractions(userId: string): Promise<any[]> {
    // In production, fetch from database
    return [];
  }
  
  private async getUserLogs(userId: string): Promise<any[]> {
    // In production, fetch from database
    return [];
  }
  
  private convertToCSV(data: any): string {
    // Simple CSV conversion
    return JSON.stringify(data);
  }
  
  private convertToXML(data: any): string {
    // Simple XML conversion
    return `<?xml version="1.0"?><data>${JSON.stringify(data)}</data>`;
  }
  
  private async sendBreachNotification(userId: string, notification: DataBreachNotification): Promise<void> {
    // In production, send email
    console.log(`Sending breach notification to user ${userId}`);
  }
}

/**
 * CCPA Compliance Service
 */
class CCPAComplianceService {
  /**
   * Right to Know (CCPA §1798.100)
   * User can request information about data collection
   */
  async provideDataCollectionInfo(userId: string): Promise<{
    categoriesCollected: string[];
    purposesOfCollection: string[];
    categoriesOfSources: string[];
    thirdPartiesSharedWith: string[];
  }> {
    return {
      categoriesCollected: [
        'Personal identifiers (name, email, phone)',
        'Financial information (credit reports, account numbers)',
        'Internet activity (AI interactions, usage logs)',
        'Geolocation data (IP address)',
      ],
      purposesOfCollection: [
        'Providing credit repair services',
        'Generating dispute letters',
        'Credit report analysis',
        'Customer support',
        'Service improvement',
      ],
      categoriesOfSources: [
        'Directly from user',
        'Credit bureaus',
        'Public records',
        'Automated technologies (cookies, logs)',
      ],
      thirdPartiesSharedWith: [
        'AI service providers (AIML API)',
        'Credit bureaus',
        'Payment processors',
        'Analytics providers',
      ],
    };
  }
  
  /**
   * Right to Delete (CCPA §1798.105)
   */
  async deleteConsumerData(userId: string): Promise<DataDeletionRequest> {
    // Similar to GDPR right to erasure
    return {
      userId,
      requestDate: new Date(),
      status: 'pending',
    };
  }
  
  /**
   * Right to Opt-Out (CCPA §1798.120)
   * User can opt-out of sale of personal information
   */
  async optOutOfSale(userId: string): Promise<boolean> {
    // In production, update user preferences
    console.log(`User ${userId} opted out of sale of personal information`);
    return true;
  }
  
  /**
   * Right to Non-Discrimination (CCPA §1798.125)
   * Cannot discriminate against users who exercise their rights
   */
  async ensureNonDiscrimination(userId: string): Promise<boolean> {
    // In production, verify no discriminatory practices
    return true;
  }
  
  /**
   * Do Not Sell My Personal Information
   */
  async doNotSell(userId: string): Promise<boolean> {
    return this.optOutOfSale(userId);
  }
}

/**
 * Consent Management Service
 */
class ConsentManagementService {
  private consents: Map<string, ConsentRecord[]> = new Map();
  
  /**
   * Record user consent
   */
  recordConsent(consent: ConsentRecord): void {
    const userConsents = this.consents.get(consent.userId) || [];
    userConsents.push(consent);
    this.consents.set(consent.userId, userConsents);
  }
  
  /**
   * Check if user has given consent
   */
  hasConsent(userId: string, consentType: ConsentRecord['consentType']): boolean {
    const userConsents = this.consents.get(userId) || [];
    const latestConsent = userConsents
      .filter(c => c.consentType === consentType)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    
    return latestConsent?.granted || false;
  }
  
  /**
   * Withdraw consent
   */
  withdrawConsent(userId: string, consentType: ConsentRecord['consentType']): void {
    this.recordConsent({
      userId,
      consentType,
      granted: false,
      timestamp: new Date(),
    });
  }
  
  /**
   * Get all consents for user
   */
  getUserConsents(userId: string): ConsentRecord[] {
    return this.consents.get(userId) || [];
  }
  
  /**
   * Export consent history
   */
  exportConsentHistory(userId: string): string {
    const consents = this.getUserConsents(userId);
    return JSON.stringify(consents, null, 2);
  }
}

// Export singleton instances
export const gdprService = new GDPRComplianceService();
export const ccpaService = new CCPAComplianceService();
export const consentService = new ConsentManagementService();

/**
 * Privacy policy template
 */
export const PRIVACY_POLICY_TEMPLATE = {
  lastUpdated: new Date().toISOString(),
  sections: [
    {
      title: 'Information We Collect',
      content: 'We collect personal identifiers, financial information, and usage data.',
    },
    {
      title: 'How We Use Your Information',
      content: 'We use your information to provide credit repair services and improve our platform.',
    },
    {
      title: 'Data Sharing',
      content: 'We share data with AI service providers, credit bureaus, and payment processors.',
    },
    {
      title: 'Your Rights',
      content: 'You have the right to access, rectify, delete, and port your data.',
    },
    {
      title: 'Data Security',
      content: 'We implement industry-standard security measures to protect your data.',
    },
    {
      title: 'Cookies',
      content: 'We use cookies for analytics and service improvement.',
    },
    {
      title: 'Contact Us',
      content: 'For privacy inquiries, contact privacy@creditmaster-pro.com',
    },
  ],
};

/**
 * Cookie consent banner configuration
 */
export const COOKIE_CONSENT_CONFIG = {
  categories: [
    {
      id: 'necessary',
      name: 'Necessary Cookies',
      description: 'Required for the website to function',
      required: true,
    },
    {
      id: 'analytics',
      name: 'Analytics Cookies',
      description: 'Help us understand how you use our website',
      required: false,
    },
    {
      id: 'marketing',
      name: 'Marketing Cookies',
      description: 'Used to show relevant advertisements',
      required: false,
    },
  ],
};

