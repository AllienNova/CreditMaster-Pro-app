'use client';

/**
 * Image Generator Component
 * 
 * Generates images using AI models (FLUX Pro) through the AIML API.
 * Supports various image sizes, styles, and download functionality.
 */

import { useState, useCallback } from 'react';

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  size: string;
  style: string;
  createdAt: string;
}

export interface ImageGenerationOptions {
  size: '512x512' | '1024x1024' | '1024x768' | '768x1024';
  style: 'photorealistic' | 'artistic' | 'anime' | 'illustration' | '3d-render';
  quality: 'standard' | 'hd';
}

interface ImageGeneratorProps {
  onGenerate?: (prompt: string, options: ImageGenerationOptions) => Promise<string>;
  className?: string;
}

const SIZE_OPTIONS: { value: ImageGenerationOptions['size']; label: string }[] = [
  { value: '512x512', label: 'Square Small (512×512)' },
  { value: '1024x1024', label: 'Square Large (1024×1024)' },
  { value: '1024x768', label: 'Landscape (1024×768)' },
  { value: '768x1024', label: 'Portrait (768×1024)' },
];

const STYLE_OPTIONS: { value: ImageGenerationOptions['style']; label: string; icon: string }[] = [
  { value: 'photorealistic', label: 'Photorealistic', icon: '📸' },
  { value: 'artistic', label: 'Artistic', icon: '🎨' },
  { value: 'anime', label: 'Anime', icon: '✨' },
  { value: 'illustration', label: 'Illustration', icon: '✏️' },
  { value: '3d-render', label: '3D Render', icon: '🎮' },
];

const SAMPLE_PROMPTS = [
  'A professional credit repair consultant helping a client',
  'Abstract visualization of improving credit score',
  'Modern financial dashboard with upward trending graphs',
  'A confident person achieving their financial goals',
];

export default function ImageGenerator({
  onGenerate,
  className = '',
}: ImageGeneratorProps) {
  const [prompt, setPrompt] = useState('');
  const [options, setOptions] = useState<ImageGenerationOptions>({
    size: '1024x1024',
    style: 'photorealistic',
    quality: 'hd',
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<GeneratedImage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<GeneratedImage[]>([]);

  const handleGenerate = useCallback(async () => {
    if (!prompt.trim()) return;
    
    setIsGenerating(true);
    setError(null);

    try {
      let imageUrl: string;
      
      if (onGenerate) {
        imageUrl = await onGenerate(prompt, options);
      } else {
        // Simulate image generation with placeholder
        await new Promise(resolve => setTimeout(resolve, 2000));
        imageUrl = `https://placehold.co/${options.size.split('x').join('x')}/1e40af/ffffff?text=Generated+Image`;
      }

      const newImage: GeneratedImage = {
        id: Date.now().toString(),
        url: imageUrl,
        prompt,
        size: options.size,
        style: options.style,
        createdAt: new Date().toISOString(),
      };

      setGeneratedImage(newImage);
      setHistory(prev => [newImage, ...prev].slice(0, 10));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate image');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, options, onGenerate]);

  const handleDownload = useCallback(async () => {
    if (!generatedImage) return;
    
    try {
      const response = await fetch(generatedImage.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `credit-image-${generatedImage.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      setError('Failed to download image');
    }
  }, [generatedImage]);

  return (
    <div className={`bg-white rounded-xl shadow-lg p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Image Generator</h3>

      {/* Prompt Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Prompt</label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the image you want to generate..."
          rows={3}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {SAMPLE_PROMPTS.map((sample, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setPrompt(sample)}
              className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
            >
              {sample.slice(0, 30)}...
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
          <select
            value={options.size}
            onChange={(e) => setOptions(o => ({ ...o, size: e.target.value as ImageGenerationOptions['size'] }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {SIZE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Style</label>
          <div className="flex flex-wrap gap-2">
            {STYLE_OPTIONS.map(style => (
              <button
                key={style.value}
                type="button"
                onClick={() => setOptions(o => ({ ...o, style: style.value }))}
                className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                  options.style === style.value
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
                }`}
              >
                {style.icon} {style.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={isGenerating || !prompt.trim()}
        className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {isGenerating ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            Generating...
          </span>
        ) : 'Generate Image'}
      </button>

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
      )}

      {/* Generated Image */}
      {generatedImage && (
        <div className="mt-6">
          <div className="relative rounded-lg overflow-hidden bg-gray-100">
            <img src={generatedImage.url} alt={generatedImage.prompt} className="w-full h-auto" />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <p className="text-white text-sm line-clamp-2">{generatedImage.prompt}</p>
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleDownload} className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              Download
            </button>
            <button onClick={() => setGeneratedImage(null)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

