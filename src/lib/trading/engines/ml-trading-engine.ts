/**
 * ML Trading Engine
 * 
 * Machine learning-based trading signal generation using:
 * - Random Forest / Gradient Boosting for classification
 * - LSTM for time series prediction
 * - Ensemble methods for improved accuracy
 */

// ============================================================================
// TYPES
// ============================================================================

export type MLModelType = 'classification' | 'regression';
export type MLArchitecture = 
  | 'random_forest' 
  | 'gradient_boosting' 
  | 'neural_network' 
  | 'lstm' 
  | 'transformer'
  | 'ensemble';

export type FeatureCategory = 'technical' | 'fundamental' | 'sentiment' | 'alternative';
export type Transformation = 'log' | 'diff' | 'pct_change' | 'normalize' | 'standardize';

export interface FeatureConfig {
  name: string;
  category: FeatureCategory;
  
  // Technical features
  indicator?: string;
  period?: number;
  
  // Transformations
  transformations?: Transformation[];
  
  // Lag features
  lags?: number[];
  
  // Rolling stats
  rollingWindow?: number;
  rollingStats?: ('mean' | 'std' | 'min' | 'max')[];
}

export interface TargetConfig {
  type: 'direction' | 'return' | 'volatility' | 'price';
  horizon: number; // Bars ahead
  threshold?: number; // For classification
  classes?: string[]; // For multi-class
}

export interface TrainingConfig {
  trainSplit: number;
  validationSplit: number;
  epochs?: number;
  batchSize?: number;
  learningRate?: number;
  earlyStoppingPatience?: number;
  crossValidationFolds?: number;
}

export interface MLModelConfig {
  id: string;
  name: string;
  type: MLModelType;
  architecture: MLArchitecture;
  features: FeatureConfig[];
  target: TargetConfig;
  training: TrainingConfig;
  
  // Architecture-specific params
  hyperparameters?: Record<string, number | string | boolean>;
  
  // Ensemble config
  ensembleModels?: string[];
  ensembleWeights?: number[];
}

export interface ModelEvaluation {
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
  mse?: number;
  mae?: number;
  r2?: number;
  sharpeRatio?: number;
  confusionMatrix?: number[][];
  featureImportance: Record<string, number>;
  trainScore: number;
  validationScore: number;
  testScore?: number;
}

export interface MLPrediction {
  symbol: string;
  signal: 'buy' | 'sell' | 'hold';
  confidence: number;
  predictedReturn?: number;
  predictedVolatility?: number;
  probabilities?: Record<string, number>;
  featureImportance: Record<string, number>;
  modelVersion: string;
  timestamp: Date;
}

export interface FeatureVector {
  symbol: string;
  timestamp: Date;
  features: Record<string, number>;
  target?: number;
}

// ============================================================================
// ML TRADING ENGINE
// ============================================================================

export class MLTradingEngine {
  private models: Map<string, MLModelConfig> = new Map();
  private modelWeights: Map<string, Float32Array> = new Map();
  private featureScalers: Map<string, { mean: number; std: number }[]> = new Map();
  private lastPredictions: Map<string, MLPrediction> = new Map();

  // ============================================================================
  // MODEL MANAGEMENT
  // ============================================================================

  registerModel(config: MLModelConfig): void {
    this.models.set(config.id, config);
  }

  getModel(modelId: string): MLModelConfig | undefined {
    return this.models.get(modelId);
  }

  listModels(): MLModelConfig[] {
    return Array.from(this.models.values());
  }

  // ============================================================================
  // FEATURE ENGINEERING
  // ============================================================================

  async extractFeatures(
    symbol: string,
    historicalData: {
      timestamp: Date;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[],
    config: FeatureConfig[]
  ): Promise<FeatureVector[]> {
    const features: FeatureVector[] = [];
    
    for (let i = 50; i < historicalData.length; i++) {
      const row = historicalData[i];
      const featureValues: Record<string, number> = {};

      for (const featureConfig of config) {
        const value = await this.computeFeature(
          featureConfig,
          historicalData.slice(0, i + 1)
        );
        
        // Apply transformations
        let transformedValue = value;
        if (featureConfig.transformations) {
          for (const transform of featureConfig.transformations) {
            transformedValue = this.applyTransformation(
              transformedValue,
              transform,
              historicalData.slice(0, i + 1)
            );
          }
        }
        
        featureValues[featureConfig.name] = transformedValue;

        // Add lag features
        if (featureConfig.lags) {
          for (const lag of featureConfig.lags) {
            if (i - lag >= 0) {
              const lagValue = await this.computeFeature(
                featureConfig,
                historicalData.slice(0, i - lag + 1)
              );
              featureValues[`${featureConfig.name}_lag${lag}`] = lagValue;
            }
          }
        }
      }

      features.push({
        symbol,
        timestamp: row.timestamp,
        features: featureValues,
      });
    }

    return features;
  }

  private async computeFeature(
    config: FeatureConfig,
    data: { open: number; high: number; low: number; close: number; volume: number }[]
  ): Promise<number> {
    const closes = data.map(d => d.close);
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const volumes = data.map(d => d.volume);
    const period = config.period || 14;

    switch (config.indicator) {
      case 'sma':
        return this.calculateSMA(closes, period);
      case 'ema':
        return this.calculateEMA(closes, period);
      case 'rsi':
        return this.calculateRSI(closes, period);
      case 'macd':
        return this.calculateMACD(closes).macd;
      case 'atr':
        return this.calculateATR(highs, lows, closes, period);
      case 'bbands_upper':
        return this.calculateBollingerBands(closes, period).upper;
      case 'bbands_lower':
        return this.calculateBollingerBands(closes, period).lower;
      case 'volume_sma':
        return this.calculateSMA(volumes, period);
      case 'returns':
        return closes.length > 1 
          ? (closes[closes.length - 1] - closes[closes.length - 2]) / closes[closes.length - 2]
          : 0;
      case 'volatility':
        return this.calculateVolatility(closes, period);
      default:
        return closes[closes.length - 1];
    }
  }

  private applyTransformation(
    value: number,
    transform: Transformation,
    data: { close: number }[]
  ): number {
    switch (transform) {
      case 'log':
        return value > 0 ? Math.log(value) : 0;
      case 'diff':
        return data.length > 1 ? value - data[data.length - 2].close : 0;
      case 'pct_change':
        return data.length > 1 
          ? (value - data[data.length - 2].close) / data[data.length - 2].close 
          : 0;
      case 'normalize':
        // Min-max normalization (simplified)
        return value;
      case 'standardize':
        // Z-score (simplified)
        return value;
      default:
        return value;
    }
  }

  // ============================================================================
  // TECHNICAL INDICATORS
  // ============================================================================

  private calculateSMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1];
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  private calculateEMA(data: number[], period: number): number {
    if (data.length < period) return data[data.length - 1];
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(data.slice(0, period), period);
    for (let i = period; i < data.length; i++) {
      ema = (data[i] - ema) * multiplier + ema;
    }
    return ema;
  }

  private calculateRSI(data: number[], period: number): number {
    if (data.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = data.length - period; i < data.length; i++) {
      const change = data[i] - data[i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(data: number[]): { macd: number; signal: number; histogram: number } {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    const macd = ema12 - ema26;
    const signal = macd * 0.2; // Simplified
    return { macd, signal, histogram: macd - signal };
  }

  private calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
    if (highs.length < 2) return highs[0] - lows[0];
    
    let atrSum = 0;
    for (let i = highs.length - period; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1])
      );
      atrSum += tr;
    }
    return atrSum / period;
  }

  private calculateBollingerBands(data: number[], period: number): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(data, period);
    const slice = data.slice(-period);
    const std = Math.sqrt(
      slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period
    );
    return {
      upper: sma + 2 * std,
      middle: sma,
      lower: sma - 2 * std,
    };
  }

  private calculateVolatility(data: number[], period: number): number {
    if (data.length < 2) return 0;
    const returns: number[] = [];
    for (let i = data.length - period; i < data.length; i++) {
      returns.push((data[i] - data[i - 1]) / data[i - 1]);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance);
  }

  // ============================================================================
  // PREDICTION
  // ============================================================================

  async predict(
    modelId: string,
    featureVector: FeatureVector
  ): Promise<MLPrediction> {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    // Normalize features
    const normalizedFeatures = this.normalizeFeatures(modelId, featureVector.features);

    // Get prediction based on architecture
    let prediction: { signal: 'buy' | 'sell' | 'hold'; confidence: number; predictedReturn?: number };
    
    switch (model.architecture) {
      case 'random_forest':
      case 'gradient_boosting':
        prediction = this.predictTreeEnsemble(modelId, normalizedFeatures);
        break;
      case 'neural_network':
      case 'lstm':
        prediction = this.predictNeuralNetwork(modelId, normalizedFeatures);
        break;
      case 'ensemble':
        prediction = await this.predictEnsemble(model, featureVector);
        break;
      default:
        prediction = { signal: 'hold', confidence: 0.5 };
    }

    const result: MLPrediction = {
      symbol: featureVector.symbol,
      signal: prediction.signal,
      confidence: prediction.confidence,
      predictedReturn: prediction.predictedReturn,
      featureImportance: this.getFeatureImportance(modelId),
      modelVersion: `${model.architecture}-v1.0`,
      timestamp: new Date(),
    };

    this.lastPredictions.set(featureVector.symbol, result);
    return result;
  }

  private normalizeFeatures(
    modelId: string,
    features: Record<string, number>
  ): number[] {
    const scalers = this.featureScalers.get(modelId);
    const values = Object.values(features);
    
    if (!scalers) return values;
    
    return values.map((val, i) => {
      const scaler = scalers[i];
      if (!scaler || scaler.std === 0) return val;
      return (val - scaler.mean) / scaler.std;
    });
  }

  private predictTreeEnsemble(
    modelId: string,
    features: number[]
  ): { signal: 'buy' | 'sell' | 'hold'; confidence: number; predictedReturn?: number } {
    // Simplified tree ensemble prediction
    // In production, would use actual trained model weights
    const weights = this.modelWeights.get(modelId);
    
    if (!weights) {
      // Return mock prediction based on features
      const avgFeature = features.reduce((a, b) => a + b, 0) / features.length;
      if (avgFeature > 0.5) return { signal: 'buy', confidence: 0.6 };
      if (avgFeature < -0.5) return { signal: 'sell', confidence: 0.6 };
      return { signal: 'hold', confidence: 0.5 };
    }

    // Weighted sum (simplified)
    let score = 0;
    for (let i = 0; i < Math.min(features.length, weights.length); i++) {
      score += features[i] * weights[i];
    }

    const confidence = Math.min(0.95, Math.abs(score) + 0.5);
    if (score > 0.2) return { signal: 'buy', confidence, predictedReturn: score };
    if (score < -0.2) return { signal: 'sell', confidence, predictedReturn: score };
    return { signal: 'hold', confidence: 0.5, predictedReturn: score };
  }

  private predictNeuralNetwork(
    modelId: string,
    features: number[]
  ): { signal: 'buy' | 'sell' | 'hold'; confidence: number; predictedReturn?: number } {
    // Simplified neural network forward pass
    const weights = this.modelWeights.get(modelId);
    
    if (!weights) {
      return { signal: 'hold', confidence: 0.5 };
    }

    // Simple feedforward (mock)
    let hidden = features.map((f, i) => Math.tanh(f * (weights[i] || 1)));
    const output = hidden.reduce((a, b) => a + b, 0) / hidden.length;
    
    const confidence = Math.min(0.95, Math.abs(output) + 0.5);
    if (output > 0.2) return { signal: 'buy', confidence, predictedReturn: output };
    if (output < -0.2) return { signal: 'sell', confidence, predictedReturn: output };
    return { signal: 'hold', confidence: 0.5, predictedReturn: output };
  }

  private async predictEnsemble(
    config: MLModelConfig,
    featureVector: FeatureVector
  ): Promise<{ signal: 'buy' | 'sell' | 'hold'; confidence: number; predictedReturn?: number }> {
    if (!config.ensembleModels?.length) {
      return { signal: 'hold', confidence: 0.5 };
    }

    const predictions: MLPrediction[] = [];
    for (const modelId of config.ensembleModels) {
      const pred = await this.predict(modelId, featureVector);
      predictions.push(pred);
    }

    // Weighted voting
    const weights = config.ensembleWeights || predictions.map(() => 1 / predictions.length);
    let buyScore = 0, sellScore = 0, holdScore = 0;
    let totalReturn = 0;

    predictions.forEach((pred, i) => {
      const weight = weights[i];
      if (pred.signal === 'buy') buyScore += weight * pred.confidence;
      else if (pred.signal === 'sell') sellScore += weight * pred.confidence;
      else holdScore += weight * pred.confidence;
      totalReturn += (pred.predictedReturn || 0) * weight;
    });

    const maxScore = Math.max(buyScore, sellScore, holdScore);
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    if (maxScore === buyScore) signal = 'buy';
    else if (maxScore === sellScore) signal = 'sell';

    return {
      signal,
      confidence: maxScore,
      predictedReturn: totalReturn,
    };
  }

  private getFeatureImportance(modelId: string): Record<string, number> {
    const model = this.models.get(modelId);
    if (!model) return {};

    // Return mock feature importance
    const importance: Record<string, number> = {};
    model.features.forEach((f, i) => {
      importance[f.name] = 1 / (i + 1); // Decreasing importance
    });
    return importance;
  }

  // ============================================================================
  // MODEL TRAINING (STUB)
  // ============================================================================

  async train(
    modelId: string,
    trainingData: FeatureVector[]
  ): Promise<ModelEvaluation> {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    // Calculate feature scalers
    const featureNames = Object.keys(trainingData[0]?.features || {});
    const scalers: { mean: number; std: number }[] = [];
    
    for (const name of featureNames) {
      const values = trainingData.map(d => d.features[name]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const std = Math.sqrt(
        values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length
      );
      scalers.push({ mean, std: std || 1 });
    }
    this.featureScalers.set(modelId, scalers);

    // Initialize mock weights
    const weights = new Float32Array(featureNames.length);
    for (let i = 0; i < weights.length; i++) {
      weights[i] = (Math.random() - 0.5) * 0.1;
    }
    this.modelWeights.set(modelId, weights);

    // Return mock evaluation
    return {
      accuracy: 0.65,
      precision: 0.62,
      recall: 0.68,
      f1Score: 0.65,
      featureImportance: this.getFeatureImportance(modelId),
      trainScore: 0.72,
      validationScore: 0.65,
    };
  }

  // ============================================================================
  // BATCH PREDICTION
  // ============================================================================

  async predictBatch(
    modelId: string,
    symbols: string[],
    historicalDataMap: Map<string, { timestamp: Date; open: number; high: number; low: number; close: number; volume: number }[]>
  ): Promise<MLPrediction[]> {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    const predictions: MLPrediction[] = [];

    for (const symbol of symbols) {
      const data = historicalDataMap.get(symbol);
      if (!data || data.length < 50) continue;

      const features = await this.extractFeatures(symbol, data, model.features);
      if (features.length === 0) continue;

      const prediction = await this.predict(modelId, features[features.length - 1]);
      predictions.push(prediction);
    }

    return predictions;
  }

  getLastPrediction(symbol: string): MLPrediction | undefined {
    return this.lastPredictions.get(symbol);
  }
}

// Export singleton
export const mlTradingEngine = new MLTradingEngine();
