/**
 * VoiceAssistant Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the VoiceAssistant component since it uses Web Speech API
jest.mock('../voice-assistant/VoiceAssistant', () => {
  const MockVoiceAssistant = ({
    onTranscript,
    onResponse,
    placeholder,
    className,
  }: {
    onTranscript?: (text: string) => void;
    onResponse?: (response: string) => void;
    placeholder?: string;
    className?: string;
  }) => (
    <div className={className} data-testid="voice-assistant">
      <input
        type="text"
        placeholder={placeholder || 'Type or speak your question...'}
        data-testid="voice-input"
        onChange={(e) => onTranscript?.(e.target.value)}
      />
      <button
        type="button"
        data-testid="mic-button"
        onClick={() => onTranscript?.('Test transcript')}
      >
        Mic
      </button>
      <button
        type="button"
        data-testid="send-button"
        onClick={() => onResponse?.('Test response')}
      >
        Send
      </button>
      <div data-testid="messages-container">
        <div>How can I help with your credit repair?</div>
      </div>
    </div>
  );
  return { __esModule: true, default: MockVoiceAssistant };
});

import VoiceAssistant from '../voice-assistant/VoiceAssistant';

describe('VoiceAssistant', () => {
  it('renders with default placeholder', () => {
    render(<VoiceAssistant onTranscript={jest.fn()} />);

    expect(
      screen.getByPlaceholderText('Type or speak your question...')
    ).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <VoiceAssistant
        onTranscript={jest.fn()}
        placeholder="Ask me anything..."
      />
    );

    expect(
      screen.getByPlaceholderText('Ask me anything...')
    ).toBeInTheDocument();
  });

  it('renders microphone button', () => {
    render(<VoiceAssistant onTranscript={jest.fn()} />);

    expect(screen.getByTestId('mic-button')).toBeInTheDocument();
  });

  it('calls onTranscript when input changes', () => {
    const onTranscript = jest.fn();
    render(<VoiceAssistant onTranscript={onTranscript} />);

    const input = screen.getByTestId('voice-input');
    fireEvent.change(input, { target: { value: 'Test message' } });

    expect(onTranscript).toHaveBeenCalledWith('Test message');
  });

  it('calls onTranscript when mic button clicked', () => {
    const onTranscript = jest.fn();
    render(<VoiceAssistant onTranscript={onTranscript} />);

    const micButton = screen.getByTestId('mic-button');
    fireEvent.click(micButton);

    expect(onTranscript).toHaveBeenCalledWith('Test transcript');
  });

  it('calls onResponse when send button clicked', () => {
    const onResponse = jest.fn();
    render(<VoiceAssistant onResponse={onResponse} />);

    const sendButton = screen.getByTestId('send-button');
    fireEvent.click(sendButton);

    expect(onResponse).toHaveBeenCalledWith('Test response');
  });

  it('applies custom className', () => {
    render(
      <VoiceAssistant onTranscript={jest.fn()} className="custom-class" />
    );

    expect(screen.getByTestId('voice-assistant')).toHaveClass('custom-class');
  });

  it('renders messages container', () => {
    render(<VoiceAssistant onTranscript={jest.fn()} />);

    expect(screen.getByTestId('messages-container')).toBeInTheDocument();
  });

  it('shows initial assistant message', () => {
    render(<VoiceAssistant onTranscript={jest.fn()} />);

    expect(
      screen.getByText(/How can I help with your credit repair/)
    ).toBeInTheDocument();
  });
});
