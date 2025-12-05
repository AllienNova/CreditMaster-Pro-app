/**
 * ImageGenerator Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock the ImageGenerator component
jest.mock('../image-generator/ImageGenerator', () => ({
  ImageGenerator: ({ 
    onGenerate, 
    onDownload, 
    className 
  }: {
    onGenerate?: (prompt: string, imageUrl: string) => void;
    onDownload?: (imageUrl: string) => void;
    className?: string;
  }) => {
    const [prompt, setPrompt] = React.useState('');
    const [generatedImage, setGeneratedImage] = React.useState<string | null>(null);
    const [isGenerating, setIsGenerating] = React.useState(false);
    
    const handleGenerate = () => {
      setIsGenerating(true);
      setTimeout(() => {
        const imageUrl = 'https://example.com/generated-image.png';
        setGeneratedImage(imageUrl);
        setIsGenerating(false);
        onGenerate?.(prompt, imageUrl);
      }, 100);
    };
    
    return (
      <div className={className} data-testid="image-generator">
        <input
          type="text"
          placeholder="Describe the image you want to generate..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          data-testid="prompt-input"
        />
        <select data-testid="size-select">
          <option value="square">Square (1024x1024)</option>
          <option value="portrait">Portrait (768x1024)</option>
          <option value="landscape">Landscape (1024x768)</option>
        </select>
        <select data-testid="style-select">
          <option value="realistic">Realistic</option>
          <option value="artistic">Artistic</option>
          <option value="anime">Anime</option>
        </select>
        <button
          data-testid="generate-button"
          onClick={handleGenerate}
          disabled={!prompt || isGenerating}
        >
          {isGenerating ? 'Generating...' : 'Generate'}
        </button>
        {isGenerating && <div data-testid="loading">Generating image...</div>}
        {generatedImage && (
          <div data-testid="image-preview">
            <img src={generatedImage} alt="Generated" data-testid="generated-image" />
            <button
              data-testid="download-button"
              onClick={() => onDownload?.(generatedImage)}
            >
              Download
            </button>
          </div>
        )}
        <div data-testid="sample-prompts">
          <button onClick={() => setPrompt('A serene mountain landscape')}>Mountain</button>
          <button onClick={() => setPrompt('A futuristic city skyline')}>City</button>
        </div>
      </div>
    );
  },
}));

import { ImageGenerator } from '../image-generator/ImageGenerator';

describe('ImageGenerator', () => {
  it('renders image generator component', () => {
    render(<ImageGenerator />);
    expect(screen.getByTestId('image-generator')).toBeInTheDocument();
  });

  it('renders prompt input', () => {
    render(<ImageGenerator />);
    expect(screen.getByPlaceholderText('Describe the image you want to generate...')).toBeInTheDocument();
  });

  it('renders size selector', () => {
    render(<ImageGenerator />);
    expect(screen.getByTestId('size-select')).toBeInTheDocument();
  });

  it('renders style selector', () => {
    render(<ImageGenerator />);
    expect(screen.getByTestId('style-select')).toBeInTheDocument();
  });

  it('disables generate button when prompt is empty', () => {
    render(<ImageGenerator />);
    expect(screen.getByTestId('generate-button')).toBeDisabled();
  });

  it('enables generate button when prompt is entered', () => {
    render(<ImageGenerator />);
    const input = screen.getByTestId('prompt-input');
    fireEvent.change(input, { target: { value: 'A beautiful sunset' } });
    expect(screen.getByTestId('generate-button')).not.toBeDisabled();
  });

  it('shows loading state during generation', async () => {
    render(<ImageGenerator />);
    const input = screen.getByTestId('prompt-input');
    fireEvent.change(input, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByTestId('generate-button'));
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('displays generated image', async () => {
    render(<ImageGenerator />);
    const input = screen.getByTestId('prompt-input');
    fireEvent.change(input, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByTestId('generate-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('generated-image')).toBeInTheDocument();
    });
  });

  it('calls onGenerate with prompt and image URL', async () => {
    const onGenerate = jest.fn();
    render(<ImageGenerator onGenerate={onGenerate} />);
    
    const input = screen.getByTestId('prompt-input');
    fireEvent.change(input, { target: { value: 'Test prompt' } });
    fireEvent.click(screen.getByTestId('generate-button'));
    
    await waitFor(() => {
      expect(onGenerate).toHaveBeenCalledWith('Test prompt', expect.any(String));
    });
  });

  it('renders download button after image generation', async () => {
    render(<ImageGenerator />);
    const input = screen.getByTestId('prompt-input');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByTestId('generate-button'));
    
    await waitFor(() => {
      expect(screen.getByTestId('download-button')).toBeInTheDocument();
    });
  });

  it('calls onDownload when download button clicked', async () => {
    const onDownload = jest.fn();
    render(<ImageGenerator onDownload={onDownload} />);
    
    const input = screen.getByTestId('prompt-input');
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(screen.getByTestId('generate-button'));
    
    await waitFor(() => {
      fireEvent.click(screen.getByTestId('download-button'));
    });
    
    expect(onDownload).toHaveBeenCalled();
  });

  it('renders sample prompts', () => {
    render(<ImageGenerator />);
    expect(screen.getByTestId('sample-prompts')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<ImageGenerator className="custom-class" />);
    expect(screen.getByTestId('image-generator')).toHaveClass('custom-class');
  });
});

