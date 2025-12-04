import * as React from 'react';

interface ScoreChangeEmailProps {
  name: string;
  previousScore: number;
  newScore: number;
  changeDate: string;
  dashboardUrl: string;
}

export default function ScoreChangeEmail({ 
  name, 
  previousScore, 
  newScore, 
  changeDate,
  dashboardUrl 
}: ScoreChangeEmailProps) {
  const change = newScore - previousScore;
  const isPositive = change > 0;
  const changeText = isPositive ? `+${change}` : `${change}`;
  const emoji = isPositive ? '📈' : '📉';
  
  return (
    <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ background: 'linear-gradient(135deg, #10b981, #3b82f6)', padding: '30px 20px', textAlign: 'center' as const }}>
        <h1 style={{ color: 'white', margin: 0, fontSize: '24px' }}>Credit Score Update {emoji}</h1>
      </div>
      
      <div style={{ padding: '40px 20px', backgroundColor: '#ffffff' }}>
        <p style={{ fontSize: '18px', color: '#374151', marginBottom: '20px' }}>
          Hi {name},
        </p>
        
        <p style={{ fontSize: '16px', color: '#6b7280', lineHeight: '1.6' }}>
          Your credit score has changed! Here's your update:
        </p>

        <div style={{ 
          textAlign: 'center' as const,
          margin: '30px 0',
          padding: '30px',
          background: isPositive ? '#ecfdf5' : '#fef2f2',
          borderRadius: '16px',
          border: `2px solid ${isPositive ? '#10b981' : '#ef4444'}`
        }}>
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>Previous Score</span>
            <p style={{ fontSize: '36px', fontWeight: 'bold', color: '#9ca3af', margin: '8px 0' }}>{previousScore}</p>
          </div>
          
          <div style={{ 
            display: 'inline-block',
            background: isPositive ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '8px 24px',
            borderRadius: '20px',
            fontSize: '20px',
            fontWeight: 'bold',
            margin: '10px 0'
          }}>
            {changeText} points
          </div>

          <div style={{ marginTop: '20px' }}>
            <span style={{ fontSize: '14px', color: '#6b7280' }}>New Score</span>
            <p style={{ fontSize: '48px', fontWeight: 'bold', color: isPositive ? '#10b981' : '#ef4444', margin: '8px 0' }}>
              {newScore}
            </p>
          </div>
        </div>

        {isPositive ? (
          <div style={{ background: '#ecfdf5', border: '1px solid #10b981', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ color: '#065f46', margin: 0, fontSize: '14px' }}>
              🎉 Congratulations! Your hard work is paying off. Keep up the great progress!
            </p>
          </div>
        ) : (
          <div style={{ background: '#fef2f2', border: '1px solid #ef4444', borderRadius: '8px', padding: '16px', marginBottom: '20px' }}>
            <p style={{ color: '#991b1b', margin: 0, fontSize: '14px' }}>
              💡 Don't worry! Log in to your dashboard to see what factors may have affected your score and get personalized recommendations.
            </p>
          </div>
        )}

        <p style={{ fontSize: '14px', color: '#9ca3af', textAlign: 'center' as const }}>
          Score recorded on {changeDate}
        </p>

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
            View Score Details →
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

