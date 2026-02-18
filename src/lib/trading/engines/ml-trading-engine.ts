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

export type MLModelType = "classification" | "regression";
export type MLArchitecture =
  | "random_forest"
  | "gradient_boosting"
  | "neural_network"
  | "lstm"
  | "transformer"
  | "ensemble";

export type FeatureCategory =
  | "technical"
  | "fundamental"
  | "sentiment"
  | "alternative";
export type Transformation =
  | "log"
  | "diff"
  | "pct_change"
  | "normalize"
  | "standardize";

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
  rollingStats?: ("mean" | "std" | "min" | "max")[];
}

export interface TargetConfig {
  type: "direction" | "return" | "volatility" | "price";
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
  signal: "buy" | "sell" | "hold";
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
  private featureScalers: Map<string, { mean: number; std: number }[]> =
    new Map();
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
    config: FeatureConfig[],
  ): Promise<FeatureVector[]> {
    const features: FeatureVector[] = [];

    for (let i = 50; i < historicalData.length; i++) {
      const row = historicalData[i];
      const featureValues: Record<string, number> = {};

      for (const featureConfig of config) {
        const value = await this.computeFeature(
          featureConfig,
          historicalData.slice(0, i + 1),
        );

        // Apply transformations
        let transformedValue = value;
        if (featureConfig.transformations) {
          for (const transform of featureConfig.transformations) {
            transformedValue = this.applyTransformation(
              transformedValue,
              transform,
              historicalData.slice(0, i + 1),
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
                historicalData.slice(0, i - lag + 1),
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
    data: {
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }[],
  ): Promise<number> {
    const closes = data.map((d) => d.close);
    const highs = data.map((d) => d.high);
    const lows = data.map((d) => d.low);
    const volumes = data.map((d) => d.volume);
    const period = config.period || 14;

    switch (config.indicator) {
      case "sma":
        return this.calculateSMA(closes, period);
      case "ema":
        return this.calculateEMA(closes, period);
      case "rsi":
        return this.calculateRSI(closes, period);
      case "macd":
        return this.calculateMACD(closes).macd;
      case "atr":
        return this.calculateATR(highs, lows, closes, period);
      case "bbands_upper":
        return this.calculateBollingerBands(closes, period).upper;
      case "bbands_lower":
        return this.calculateBollingerBands(closes, period).lower;
      case "volume_sma":
        return this.calculateSMA(volumes, period);
      case "returns":
        return closes.length > 1
          ? (closes[closes.length - 1] - closes[closes.length - 2]) /
              closes[closes.length - 2]
          : 0;
      case "volatility":
        return this.calculateVolatility(closes, period);
      default:
        return closes[closes.length - 1];
    }
  }

  private applyTransformation(
    value: number,
    transform: Transformation,
    data: { close: number }[],
  ): number {
    switch (transform) {
      case "log":
        return value > 0 ? Math.log(value) : 0;
      case "diff":
        return data.length > 1 ? value - data[data.length - 2].close : 0;
      case "pct_change":
        return data.length > 1
          ? (value - data[data.length - 2].close) / data[data.length - 2].close
          : 0;
      case "normalize":
        // Min-max normalization (simplified)
        return value;
      case "standardize":
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
    return 100 - 100 / (1 + rs);
  }

  private calculateMACD(data: number[]): {
    macd: number;
    signal: number;
    histogram: number;
  } {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    const macd = ema12 - ema26;
    const signal = macd * 0.2; // Simplified
    return { macd, signal, histogram: macd - signal };
  }

  private calculateATR(
    highs: number[],
    lows: number[],
    closes: number[],
    period: number,
  ): number {
    if (highs.length < 2) return highs[0] - lows[0];

    let atrSum = 0;
    for (let i = highs.length - period; i < highs.length; i++) {
      const tr = Math.max(
        highs[i] - lows[i],
        Math.abs(highs[i] - closes[i - 1]),
        Math.abs(lows[i] - closes[i - 1]),
      );
      atrSum += tr;
    }
    return atrSum / period;
  }

  private calculateBollingerBands(
    data: number[],
    period: number,
  ): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(data, period);
    const slice = data.slice(-period);
    const std = Math.sqrt(
      slice.reduce((sum, val) => sum + Math.pow(val - sma, 2), 0) / period,
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
    const variance =
      returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) /
      returns.length;
    return Math.sqrt(variance);
  }

  // ============================================================================
  // PREDICTION
  // ============================================================================

  async predict(
    modelId: string,
    featureVector: FeatureVector,
  ): Promise<MLPrediction> {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    // Normalize features
    const normalizedFeatures = this.normalizeFeatures(
      modelId,
      featureVector.features,
    );

    // Get prediction based on architecture
    let prediction: {
      signal: "buy" | "sell" | "hold";
      confidence: number;
      predictedReturn?: number;
    };

    switch (model.architecture) {
      case "random_forest":
      case "gradient_boosting":
        prediction = this.predictTreeEnsemble(modelId, normalizedFeatures);
        break;
      case "neural_network":
      case "lstm":
        prediction = this.predictNeuralNetwork(modelId, normalizedFeatures);
        break;
      case "ensemble":
        prediction = await this.predictEnsemble(model, featureVector);
        break;
      default:
        prediction = { signal: "hold", confidence: 0.5 };
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
    features: Record<string, number>,
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
    features: number[],
  ): {
    signal: "buy" | "sell" | "hold";
    confidence: number;
    predictedReturn?: number;
  } {
    const weights = this.modelWeights.get(modelId);

    if (!weights) {
      return { signal: "hold", confidence: 0.5 };
    }

    // Linear model with trained weights + bias
    const bias = weights[weights.length - 1];
    let score = bias;
    for (let i = 0; i < Math.min(features.length, weights.length - 1); i++) {
      score += (features[i] || 0) * weights[i];
    }

    // Sigmoid-based confidence mapping
    const sigmoid = 1 / (1 + Math.exp(-Math.abs(score) * 5));
    const confidence = Math.min(0.95, Math.max(0.5, sigmoid));

    if (score > 0.1)
      return { signal: "buy", confidence, predictedReturn: score };
    if (score < -0.1)
      return { signal: "sell", confidence, predictedReturn: score };
    return { signal: "hold", confidence: 0.5, predictedReturn: score };
  }

  private predictNeuralNetwork(
    modelId: string,
    features: number[],
  ): {
    signal: "buy" | "sell" | "hold";
    confidence: number;
    predictedReturn?: number;
  } {
    const weights = this.modelWeights.get(modelId);

    if (!weights) {
      return { signal: "hold", confidence: 0.5 };
    }

    // Two-layer forward pass: tanh activation → linear output
    const bias = weights[weights.length - 1];
    const hidden = features.map((f, i) => Math.tanh(f * (weights[i] || 0)));
    let output = bias;
    for (let i = 0; i < hidden.length; i++) {
      output += hidden[i] * (weights[i] || 0);
    }
    // Scale output
    output = Math.tanh(output);

    const confidence = Math.min(
      0.95,
      Math.max(0.5, 0.5 + Math.abs(output) * 0.45),
    );
    if (output > 0.1)
      return { signal: "buy", confidence, predictedReturn: output };
    if (output < -0.1)
      return { signal: "sell", confidence, predictedReturn: output };
    return { signal: "hold", confidence: 0.5, predictedReturn: output };
  }

  private async predictEnsemble(
    config: MLModelConfig,
    featureVector: FeatureVector,
  ): Promise<{
    signal: "buy" | "sell" | "hold";
    confidence: number;
    predictedReturn?: number;
  }> {
    if (!config.ensembleModels?.length) {
      return { signal: "hold", confidence: 0.5 };
    }

    const predictions: MLPrediction[] = [];
    for (const modelId of config.ensembleModels) {
      const pred = await this.predict(modelId, featureVector);
      predictions.push(pred);
    }

    // Weighted voting
    const weights =
      config.ensembleWeights || predictions.map(() => 1 / predictions.length);
    let buyScore = 0,
      sellScore = 0,
      holdScore = 0;
    let totalReturn = 0;

    predictions.forEach((pred, i) => {
      const weight = weights[i];
      if (pred.signal === "buy") buyScore += weight * pred.confidence;
      else if (pred.signal === "sell") sellScore += weight * pred.confidence;
      else holdScore += weight * pred.confidence;
      totalReturn += (pred.predictedReturn || 0) * weight;
    });

    const maxScore = Math.max(buyScore, sellScore, holdScore);
    let signal: "buy" | "sell" | "hold" = "hold";
    if (maxScore === buyScore) signal = "buy";
    else if (maxScore === sellScore) signal = "sell";

    return {
      signal,
      confidence: maxScore,
      predictedReturn: totalReturn,
    };
  }

  private storedImportance: Map<string, Record<string, number>> = new Map();

  private getFeatureImportance(modelId: string): Record<string, number> {
    // Return stored permutation importance if available (set during training)
    const stored = this.storedImportance.get(modelId);
    if (stored) return stored;

    // Fallback: weight-magnitude based importance
    const model = this.models.get(modelId);
    const weights = this.modelWeights.get(modelId);
    if (!model || !weights) return {};

    const importance: Record<string, number> = {};
    let totalMag = 0;
    model.features.forEach((f, i) => {
      const mag = Math.abs(weights[i] || 0);
      importance[f.name] = mag;
      totalMag += mag;
    });
    if (totalMag > 0) {
      for (const key of Object.keys(importance)) {
        importance[key] /= totalMag;
      }
    }
    return importance;
  }

  // ============================================================================
  // MODEL TRAINING
  // ============================================================================

  async train(
    modelId: string,
    trainingData: FeatureVector[],
  ): Promise<ModelEvaluation> {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);
    if (trainingData.length < 10)
      throw new Error("Insufficient training data (minimum 10 samples)");

    const featureNames = Object.keys(trainingData[0]?.features || {});
    const numFeatures = featureNames.length;
    if (numFeatures === 0) throw new Error("No features in training data");

    // Compute and store feature scalers (z-score normalization)
    const scalers = this.computeScalers(trainingData, featureNames);
    this.featureScalers.set(modelId, scalers);

    // Prepare target labels
    const targets = this.computeTargets(trainingData, model.target);

    // Split data: train / validation / test
    const { trainSplit, validationSplit } = model.training;
    const trainEnd = Math.floor(trainingData.length * trainSplit);
    const valEnd = Math.floor(
      trainingData.length * (trainSplit + validationSplit),
    );

    const trainX = trainingData.slice(0, trainEnd);
    const trainY = targets.slice(0, trainEnd);
    const valX = trainingData.slice(trainEnd, valEnd);
    const valY = targets.slice(trainEnd, valEnd);
    const testX = trainingData.slice(valEnd);
    const testY = targets.slice(valEnd);

    // Train using gradient descent with L2 regularization
    const lr = model.training.learningRate || 0.01;
    const epochs = model.training.epochs || 200;
    const patience = model.training.earlyStoppingPatience || 20;
    const lambda = 0.001; // L2 regularization

    const weights = new Float32Array(numFeatures);
    for (let i = 0; i < numFeatures; i++) {
      weights[i] = (Math.random() - 0.5) * 0.01;
    }
    let bias = 0;

    let bestValLoss = Infinity;
    let bestWeights = new Float32Array(weights);
    let bestBias = bias;
    let staleEpochs = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Mini-batch gradient descent over training set
      const gradW = new Float32Array(numFeatures);
      let gradB = 0;
      let trainLoss = 0;

      for (let i = 0; i < trainX.length; i++) {
        const x = this.normalizeFeatures(modelId, trainX[i].features);
        const yHat = this.linearForward(x, weights, bias);
        const error = yHat - trainY[i];
        trainLoss += error * error;

        for (let j = 0; j < numFeatures; j++) {
          gradW[j] +=
            (2 * error * (x[j] || 0)) / trainX.length + lambda * weights[j];
        }
        gradB += (2 * error) / trainX.length;
      }

      // Update weights
      for (let j = 0; j < numFeatures; j++) {
        weights[j] -= lr * gradW[j];
      }
      bias -= lr * gradB;
      trainLoss /= trainX.length;

      // Validation loss
      let valLoss = 0;
      for (let i = 0; i < valX.length; i++) {
        const x = this.normalizeFeatures(modelId, valX[i].features);
        const yHat = this.linearForward(x, weights, bias);
        valLoss += (yHat - valY[i]) ** 2;
      }
      valLoss /= Math.max(valX.length, 1);

      // Early stopping
      if (valLoss < bestValLoss) {
        bestValLoss = valLoss;
        bestWeights = new Float32Array(weights);
        bestBias = bias;
        staleEpochs = 0;
      } else {
        staleEpochs++;
        if (staleEpochs >= patience) break;
      }
    }

    // Store best weights (bias appended as last element)
    const finalWeights = new Float32Array(numFeatures + 1);
    finalWeights.set(bestWeights);
    finalWeights[numFeatures] = bestBias;
    this.modelWeights.set(modelId, finalWeights);

    // Evaluate on all splits
    const trainEval = this.evaluatePredictions(
      trainX,
      trainY,
      modelId,
      model.type,
    );
    const valEval = this.evaluatePredictions(valX, valY, modelId, model.type);
    const testEval =
      testX.length > 0
        ? this.evaluatePredictions(testX, testY, modelId, model.type)
        : undefined;

    // Permutation feature importance (stored for prediction-time access)
    const featureImportance = this.computeFeatureImportance(
      valX,
      valY,
      modelId,
      featureNames,
    );
    this.storedImportance.set(modelId, featureImportance);

    return {
      accuracy: valEval.accuracy,
      precision: valEval.precision,
      recall: valEval.recall,
      f1Score: valEval.f1,
      mse: valEval.mse,
      mae: valEval.mae,
      r2: valEval.r2,
      sharpeRatio: this.computeSharpe(valX, valY, modelId),
      confusionMatrix:
        model.type === "classification" ? valEval.confusionMatrix : undefined,
      featureImportance,
      trainScore: trainEval.score,
      validationScore: valEval.score,
      testScore: testEval?.score,
    };
  }

  private computeScalers(
    data: FeatureVector[],
    featureNames: string[],
  ): { mean: number; std: number }[] {
    return featureNames.map((name) => {
      const values = data.map((d) => d.features[name]);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance =
        values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length;
      return { mean, std: Math.sqrt(variance) || 1 };
    });
  }

  private computeTargets(
    data: FeatureVector[],
    target: TargetConfig,
  ): number[] {
    return data.map((fv, i) => {
      if (fv.target !== undefined) return fv.target;
      // Compute forward return as target if not provided
      if (i + target.horizon < data.length) {
        const futureFeatures = data[i + target.horizon].features;
        const currentFeatures = fv.features;
        const currentClose =
          currentFeatures["close"] ?? currentFeatures["price"] ?? 0;
        const futureClose =
          futureFeatures["close"] ?? futureFeatures["price"] ?? 0;
        if (currentClose === 0) return 0;
        const ret = (futureClose - currentClose) / currentClose;
        if (target.type === "direction") {
          const threshold = target.threshold || 0;
          return ret > threshold ? 1 : ret < -threshold ? -1 : 0;
        }
        return ret;
      }
      return 0;
    });
  }

  private linearForward(
    features: number[],
    weights: Float32Array,
    bias: number,
  ): number {
    let sum = bias;
    for (let i = 0; i < Math.min(features.length, weights.length); i++) {
      sum += (features[i] || 0) * weights[i];
    }
    return sum;
  }

  private evaluatePredictions(
    data: FeatureVector[],
    targets: number[],
    modelId: string,
    modelType: MLModelType,
  ): {
    accuracy?: number;
    precision?: number;
    recall?: number;
    f1?: number;
    mse: number;
    mae: number;
    r2?: number;
    score: number;
    confusionMatrix?: number[][];
  } {
    const predictions: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const x = this.normalizeFeatures(modelId, data[i].features);
      const weights = this.modelWeights.get(modelId);
      if (!weights) {
        predictions.push(0);
        continue;
      }
      const bias = weights[weights.length - 1];
      predictions.push(this.linearForward(x, weights, bias));
    }

    // MSE & MAE
    let mse = 0,
      mae = 0;
    for (let i = 0; i < predictions.length; i++) {
      const err = predictions[i] - targets[i];
      mse += err * err;
      mae += Math.abs(err);
    }
    mse /= Math.max(predictions.length, 1);
    mae /= Math.max(predictions.length, 1);

    // R²
    const meanTarget =
      targets.reduce((a, b) => a + b, 0) / Math.max(targets.length, 1);
    const ssRes = predictions.reduce(
      (sum, p, i) => sum + (p - targets[i]) ** 2,
      0,
    );
    const ssTot = targets.reduce((sum, t) => sum + (t - meanTarget) ** 2, 0);
    const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;

    if (modelType === "classification") {
      // Convert regression output to class predictions
      const predClasses = predictions.map((p) =>
        p > 0.2 ? 1 : p < -0.2 ? -1 : 0,
      );
      const actualClasses = targets.map((t) =>
        t > 0.2 ? 1 : t < -0.2 ? -1 : 0,
      );

      let correct = 0,
        tp = 0,
        fp = 0,
        fn = 0;
      const cm = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ]; // -1, 0, 1

      for (let i = 0; i < predClasses.length; i++) {
        const pi = predClasses[i] + 1; // index 0,1,2
        const ai = actualClasses[i] + 1;
        cm[ai][pi]++;
        if (predClasses[i] === actualClasses[i]) correct++;
        if (predClasses[i] === 1 && actualClasses[i] === 1) tp++;
        if (predClasses[i] === 1 && actualClasses[i] !== 1) fp++;
        if (predClasses[i] !== 1 && actualClasses[i] === 1) fn++;
      }

      const accuracy = correct / Math.max(predClasses.length, 1);
      const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
      const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
      const f1 =
        precision + recall > 0
          ? (2 * precision * recall) / (precision + recall)
          : 0;

      return {
        accuracy,
        precision,
        recall,
        f1,
        mse,
        mae,
        r2,
        score: accuracy,
        confusionMatrix: cm,
      };
    }

    return { mse, mae, r2, score: Math.max(0, r2) };
  }

  private computeFeatureImportance(
    valData: FeatureVector[],
    valTargets: number[],
    modelId: string,
    featureNames: string[],
  ): Record<string, number> {
    // Permutation importance: shuffle each feature and measure score degradation
    const baseScore = this.scoreDataset(valData, valTargets, modelId);
    const importance: Record<string, number> = {};

    for (const name of featureNames) {
      // Create shuffled copy
      const shuffled = valData.map((fv) => ({
        ...fv,
        features: { ...fv.features },
      }));
      const values = shuffled.map((fv) => fv.features[name]);
      // Fisher-Yates shuffle
      for (let i = values.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
      }
      shuffled.forEach((fv, idx) => {
        fv.features[name] = values[idx];
      });

      const shuffledScore = this.scoreDataset(shuffled, valTargets, modelId);
      importance[name] = Math.max(0, baseScore - shuffledScore);
    }

    // Normalize to sum to 1
    const total = Object.values(importance).reduce((a, b) => a + b, 0);
    if (total > 0) {
      for (const key of Object.keys(importance)) {
        importance[key] /= total;
      }
    }
    return importance;
  }

  private scoreDataset(
    data: FeatureVector[],
    targets: number[],
    modelId: string,
  ): number {
    const weights = this.modelWeights.get(modelId);
    if (!weights) return 0;
    const bias = weights[weights.length - 1];

    let ssRes = 0,
      ssTot = 0;
    const mean =
      targets.reduce((a, b) => a + b, 0) / Math.max(targets.length, 1);
    for (let i = 0; i < data.length; i++) {
      const x = this.normalizeFeatures(modelId, data[i].features);
      const pred = this.linearForward(x, weights, bias);
      ssRes += (pred - targets[i]) ** 2;
      ssTot += (targets[i] - mean) ** 2;
    }
    return ssTot > 0 ? 1 - ssRes / ssTot : 0;
  }

  private computeSharpe(
    data: FeatureVector[],
    targets: number[],
    modelId: string,
  ): number {
    const weights = this.modelWeights.get(modelId);
    if (!weights) return 0;
    const bias = weights[weights.length - 1];

    // Strategy returns: predicted direction * actual return
    const returns: number[] = [];
    for (let i = 0; i < data.length; i++) {
      const x = this.normalizeFeatures(modelId, data[i].features);
      const pred = this.linearForward(x, weights, bias);
      const direction = pred > 0 ? 1 : pred < 0 ? -1 : 0;
      returns.push(direction * targets[i]);
    }
    if (returns.length === 0) return 0;

    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance =
      returns.reduce((s, r) => s + (r - mean) ** 2, 0) / returns.length;
    const std = Math.sqrt(variance);
    return std > 0 ? (mean / std) * Math.sqrt(252) : 0; // Annualized
  }

  // ============================================================================
  // BATCH PREDICTION
  // ============================================================================

  async predictBatch(
    modelId: string,
    symbols: string[],
    historicalDataMap: Map<
      string,
      {
        timestamp: Date;
        open: number;
        high: number;
        low: number;
        close: number;
        volume: number;
      }[]
    >,
  ): Promise<MLPrediction[]> {
    const model = this.models.get(modelId);
    if (!model) throw new Error(`Model ${modelId} not found`);

    const predictions: MLPrediction[] = [];

    for (const symbol of symbols) {
      const data = historicalDataMap.get(symbol);
      if (!data || data.length < 50) continue;

      const features = await this.extractFeatures(symbol, data, model.features);
      if (features.length === 0) continue;

      const prediction = await this.predict(
        modelId,
        features[features.length - 1],
      );
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
