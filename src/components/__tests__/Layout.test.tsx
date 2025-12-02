import React from 'react';
import { render, screen } from '@testing-library/react';
import Layout from '../Layout';

// Mock the next/navigation module


describe('Layout', () => {
  it('renders the header and children', () => {
    render(<Layout><div>Test Child</div></Layout>);

    // Check for the logo and brand name
    expect(screen.getByText('Agentic Credit Repair')).toBeInTheDocument();
    expect(screen.getByText('AI-Agent Powered Platform')).toBeInTheDocument();

    // Check for navigation links
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Credit Builder')).toBeInTheDocument();
    expect(screen.getByText('Marketplace')).toBeInTheDocument();
    expect(screen.getByText('Student Loans')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();

    // Check for the child component
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('does not render the header when showNavigation is false', () => {
    render(<Layout showNavigation={false}><div>Test Child</div></Layout>);

    // Check that the header elements are not present
    expect(screen.queryByText('Agentic Credit Repair')).not.toBeInTheDocument();
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();

    // Check that the child component is still rendered
    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });
});
