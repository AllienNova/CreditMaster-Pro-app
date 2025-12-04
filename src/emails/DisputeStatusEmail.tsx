import * as React from 'react';

interface DisputeStatusEmailProps {
  name: string;
  disputeId: string;
  status: 'submitted' | 'in_review' | 'resolved' | 'rejected';
  bureau: string;
  itemDescription: string;
  dashboardUrl: string;
}

const statusConfig = {
  submitted: { color: '#3b82f6', label: 'Submitted', emoji: '📤' },
  in_review: { color: '#f59e0b', label: 'Under Review', emoji: '🔍' },
  resolved: { color: '#10b981', label: 'Resolved', emoji: '✅' },
  rejected: { color: '#ef4444', label: 'Rejected', emoji: '❌' }
};

export default function DisputeStatusEmail({ 
  name, 
  disputeId, 
  status, 
  bureau, 
  itemDescription,
  dashboardUrl 
}: DisputeStatusEmailProps) {
  const config = statusConfig[status];
  
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', padding: '30px 20px', textAlign: 'center' as const }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px' }}>Dispute Status Update</h1>
      </div>
      
      <div style={{ padding: '40px 20px', backgroundColor: '#ffffff' }}>
        <p style={{ fontSize: '18px', color: '#374151', marginBottom: '20px' }}>
          Hi {name},
        </p>
        
        <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.6' }}>
          Your dispute has been updated. Here are the details:
        </p>

        <div style={{ 
          background: '#f9fafb', 
          borderRadius: '12px', 
          padding: '24px', 
          margin: '24px 0',
          border: '1px solid #e5e7eb'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
            <span style={{ fontSize: '32px', marginRight: '12px' }}>{config.emoji}</span>
            <div>
              <span style={{ 
                background: config.color, 
                color: 'white', 
                padding: '4px 12px', 
                borderRadius: '20px',
                fontSize: '14px',
                fontWeight: 'bold'
              }}>
                {config.label}
              </span>
            </div>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: '8px 0', color: '#6b7280', fontSize: '14px' }}>Dispute ID:</td>
                <td style={{ padding: '8px 0', color: '#374151', fontWeight: 'bold', fontSize: '14px' }}>{disputeId}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#6b7280', fontSize: '14px' }}>Bureau:</td>
                <td style={{ padding: '8px 0', color: '#374151', fontWeight: 'bold', fontSize: '14px' }}>{bureau}</td>
              </tr>
              <tr>
                <td style={{ padding: '8px 0', color: '#6b7280', fontSize: '14px' }}>Item:</td>
                <td style={{ padding: '8px 0', color: '#374151', fontWeight: 'bold', fontSize: '14px' }}>{itemDescription}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {status === 'resolved' && (
          <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ color: '#065f46', margin: 0, fontSize: '14px' }}>
              🎉 Great news! The item has been successfully removed or corrected on your credit report.
            </p>
          </div>
        )}

        <div style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <a href={dashboardUrl} style={{
            display: 'inline-block',
            background: 'linear-gradient(135deg, #10b981, #3b82f6)',
            color: 'white',
            padding: '14px 40px',
            borderRadius: '8px',
            textDecoration: 'none',
            fontSize: '16px',
            fontWeight: 'bold'
          }}>
            View in Dashboard →
          </a>
        </div>
      </div>

      <div style={{ background: '#f9fafb', padding: '20px', textAlign: 'center' as const, borderTop: '1px solid #e5e7eb' }}>
        <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
          © {new Date().getFullYear()} CreditMaster Pro. All rights reserved.
        </p>
      </div>
    </div>
  );
}

