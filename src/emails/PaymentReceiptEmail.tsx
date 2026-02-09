import * as React from 'react';

interface PaymentReceiptEmailProps {
  name: string;
  plan: string;
  amount: number;
  currency: string;
  invoiceNumber: string;
  paymentDate: string;
  nextBillingDate: string;
  dashboardUrl: string;
}

export default function PaymentReceiptEmail({
  name,
  plan,
  amount,
  currency,
  invoiceNumber,
  paymentDate,
  nextBillingDate,
  dashboardUrl,
}: PaymentReceiptEmailProps) {
  const formattedAmount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100);

  return (
    <div
      style={{
        fontFamily: 'Arial, sans-serif',
        maxWidth: '600px',
        margin: '0 auto',
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, #10b981, #3b82f6)',
          padding: '30px 20px',
          textAlign: 'center' as const,
        }}
      >
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px' }}>
          Payment Receipt
        </h1>
      </div>

      <div style={{ padding: '40px 20px', backgroundColor: '#ffffff' }}>
        <p style={{ fontSize: '18px', color: '#374151', marginBottom: '20px' }}>
          Hi {name},
        </p>

        <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.6' }}>
          Thank you for your payment! Here's your receipt:
        </p>

        <div
          style={{
            background: '#f9fafb',
            borderRadius: '12px',
            padding: '24px',
            margin: '24px 0',
            border: '1px solid #e5e7eb',
          }}
        >
          <div
            style={{
              textAlign: 'center' as const,
              marginBottom: '24px',
              paddingBottom: '24px',
              borderBottom: '1px solid #e5e7eb',
            }}
          >
            <span style={{ fontSize: '14px', color: '#6b7280' }}>
              Amount Paid
            </span>
            <p
              style={{
                fontSize: '36px',
                fontWeight: 'bold',
                color: '#10b981',
                margin: '8px 0',
              }}
            >
              {formattedAmount}
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td
                  style={{
                    padding: '12px 0',
                    color: '#6b7280',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Plan:
                </td>
                <td
                  style={{
                    padding: '12px 0',
                    color: '#374151',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    textAlign: 'right' as const,
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {plan}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: '12px 0',
                    color: '#6b7280',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Invoice #:
                </td>
                <td
                  style={{
                    padding: '12px 0',
                    color: '#374151',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    textAlign: 'right' as const,
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {invoiceNumber}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: '12px 0',
                    color: '#6b7280',
                    fontSize: '14px',
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  Payment Date:
                </td>
                <td
                  style={{
                    padding: '12px 0',
                    color: '#374151',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    textAlign: 'right' as const,
                    borderBottom: '1px solid #e5e7eb',
                  }}
                >
                  {paymentDate}
                </td>
              </tr>
              <tr>
                <td
                  style={{
                    padding: '12px 0',
                    color: '#6b7280',
                    fontSize: '14px',
                  }}
                >
                  Next Billing:
                </td>
                <td
                  style={{
                    padding: '12px 0',
                    color: '#374151',
                    fontWeight: 'bold',
                    fontSize: '14px',
                    textAlign: 'right' as const,
                  }}
                >
                  {nextBillingDate}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          style={{
            background: '#ecfdf5',
            border: '1px solid #10b981',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
          }}
        >
          <p style={{ color: '#065f46', margin: 0, fontSize: '14px' }}>
            Payment successful! Your subscription is active and all features
            are available.
          </p>
        </div>

        <div style={{ textAlign: 'center' as const, margin: '30px 0' }}>
          <a
            href={dashboardUrl}
            style={{
              display: 'inline-block',
              background: 'linear-gradient(135deg, #10b981, #3b82f6)',
              color: 'white',
              padding: '14px 40px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: 'bold',
            }}
          >
            Go to Dashboard →
          </a>
        </div>

        <p
          style={{
            fontSize: '12px',
            color: '#9ca3af',
            textAlign: 'center' as const,
          }}
        >
          Need to update your billing information?{' '}
          <a
            href={`${dashboardUrl}/settings/billing`}
            style={{ color: '#3b82f6' }}
          >
            Manage billing
          </a>
        </p>
      </div>

      <div
        style={{
          background: '#f9fafb',
          padding: '20px',
          textAlign: 'center' as const,
          borderTop: '1px solid #e5e7eb',
        }}
      >
        <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
          © {new Date().getFullYear()} Fynvita. All rights reserved.
        </p>
      </div>
    </div>
  );
}
