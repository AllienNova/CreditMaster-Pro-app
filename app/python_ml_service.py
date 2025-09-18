#!/usr/bin/env python3
"""
Python ML Service for CreditMaster Pro
Loads and uses the actual trained Hugging Face credit scoring model
"""

import sys
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from typing import Dict, List, Any, Tuple
import warnings
warnings.filterwarnings('ignore')

class CreditMLService:
    """
    Production ML Service using the actual Hugging Face trained model
    """
    
    def __init__(self, model_path: str = "models/credit_classifier.joblib"):
        """Initialize the ML service with the trained model"""
        self.model_path = Path(model_path)
        self.model = None
        self.feature_names = [
            'Outstanding_Debt',
            'Credit_Mix', 
            'Credit_History_Age',
            'Monthly_Balance',
            'Payment_Behaviour',
            'Annual_Income',
            'Num_of_Delayed_Payment'
        ]
        self.credit_categories = {
            0: 'Good',
            1: 'Poor',
            2: 'Standard'
        }
        self.load_model()
    
    def load_model(self) -> None:
        """Load the trained model from file"""
        try:
            if self.model_path.exists():
                print(f"Loading model from {self.model_path}")
                self.model = joblib.load(self.model_path)
                print(f"Model loaded successfully: {type(self.model).__name__}")
                
                # Print model info if available
                if hasattr(self.model, 'n_estimators'):
                    print(f"Model details: {self.model.n_estimators} estimators")
                if hasattr(self.model, 'feature_importances_'):
                    print("Feature importances available")
                    
            else:
                raise FileNotFoundError(f"Model file not found: {self.model_path}")
                
        except Exception as e:
            print(f"Error loading model: {e}")
            raise
    
    def validate_features(self, features: List[float]) -> bool:
        """Validate input features"""
        if len(features) != len(self.feature_names):
            print(f"Expected {len(self.feature_names)} features, got {len(features)}")
            return False
        
        # Check for reasonable ranges
        outstanding_debt, credit_mix, credit_history_age, monthly_balance, \
        payment_behaviour, annual_income, delayed_payments = features
        
        if outstanding_debt < 0:
            print("Outstanding debt cannot be negative")
            return False
        
        if credit_mix not in [0, 1, 2]:
            print("Credit mix must be 0, 1, or 2")
            return False
            
        if credit_history_age < 0:
            print("Credit history age cannot be negative")
            return False
            
        if annual_income < 0:
            print("Annual income cannot be negative")
            return False
            
        if delayed_payments < 0:
            print("Delayed payments cannot be negative")
            return False
        
        return True
    
    def predict_credit_score(self, features: List[float]) -> Dict[str, Any]:
        """
        Predict credit score category using the trained model
        
        Args:
            features: List of 7 features in order:
                [Outstanding_Debt, Credit_Mix, Credit_History_Age, Monthly_Balance,
                 Payment_Behaviour, Annual_Income, Num_of_Delayed_Payment]
        
        Returns:
            Dictionary with prediction results
        """
        try:
            if not self.validate_features(features):
                raise ValueError("Invalid features provided")
            
            if self.model is None:
                raise RuntimeError("Model not loaded")
            
            # Prepare features for prediction
            features_array = np.array([features])
            
            # Make prediction
            prediction = self.model.predict(features_array)[0]
            
            # Get prediction probabilities if available
            confidence = 0.85  # Default confidence
            probabilities = None
            
            if hasattr(self.model, 'predict_proba'):
                try:
                    proba = self.model.predict_proba(features_array)[0]
                    probabilities = {
                        self.credit_categories[i]: float(prob) 
                        for i, prob in enumerate(proba)
                    }
                    confidence = float(max(proba))
                except Exception as e:
                    print(f"Could not get probabilities: {e}")
            
            # Get feature importance if available
            feature_importance = None
            if hasattr(self.model, 'feature_importances_'):
                try:
                    importance = self.model.feature_importances_
                    feature_importance = {
                        self.feature_names[i]: float(imp) 
                        for i, imp in enumerate(importance)
                    }
                except Exception as e:
                    print(f"Could not get feature importance: {e}")
            
            # Convert prediction to credit score range
            credit_score = self.convert_category_to_score(prediction, confidence)
            
            result = {
                'success': True,
                'prediction_category': int(prediction),
                'prediction_label': self.credit_categories[prediction],
                'credit_score_estimate': credit_score,
                'confidence': confidence,
                'probabilities': probabilities,
                'feature_importance': feature_importance,
                'model_type': type(self.model).__name__,
                'features_used': dict(zip(self.feature_names, features))
            }
            
            return result
            
        except Exception as e:
            return {
                'success': False,
                'error': str(e),
                'prediction_category': None,
                'prediction_label': None,
                'credit_score_estimate': None,
                'confidence': None
            }
    
    def convert_category_to_score(self, category: int, confidence: float) -> int:
        """Convert model category to credit score range"""
        base_scores = {
            0: 750,  # Good
            1: 580,  # Poor  
            2: 650   # Standard
        }
        
        base_score = base_scores.get(category, 650)
        
        # Add variance based on confidence
        variance = int((1 - confidence) * 50)
        adjustment = np.random.randint(-variance, variance + 1)
        
        final_score = base_score + adjustment
        return max(300, min(850, final_score))
    
    def batch_predict(self, features_list: List[List[float]]) -> List[Dict[str, Any]]:
        """Predict for multiple feature sets"""
        results = []
        for features in features_list:
            result = self.predict_credit_score(features)
            results.append(result)
        return results
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the loaded model"""
        if self.model is None:
            return {'error': 'Model not loaded'}
        
        info = {
            'model_type': type(self.model).__name__,
            'feature_names': self.feature_names,
            'credit_categories': self.credit_categories,
            'model_loaded': True
        }
        
        # Add model-specific info
        if hasattr(self.model, 'n_estimators'):
            info['n_estimators'] = self.model.n_estimators
        if hasattr(self.model, 'max_depth'):
            info['max_depth'] = self.model.max_depth
        if hasattr(self.model, 'random_state'):
            info['random_state'] = self.model.random_state
            
        return info

def main():
    """Main function for command line usage"""
    if len(sys.argv) < 2:
        print("Usage: python python_ml_service.py <command> [args...]")
        print("Commands:")
        print("  predict <features>  - Predict credit score")
        print("  info               - Get model information")
        print("  test               - Run test prediction")
        return
    
    # Initialize service
    try:
        service = CreditMLService()
    except Exception as e:
        print(f"Failed to initialize ML service: {e}")
        return
    
    command = sys.argv[1].lower()
    
    if command == 'predict':
        if len(sys.argv) < 9:
            print("Error: Need 7 feature values")
            print("Features: Outstanding_Debt, Credit_Mix, Credit_History_Age, Monthly_Balance, Payment_Behaviour, Annual_Income, Num_of_Delayed_Payment")
            return
        
        try:
            features = [float(x) for x in sys.argv[2:9]]
            result = service.predict_credit_score(features)
            print(json.dumps(result, indent=2))
        except ValueError as e:
            print(f"Error parsing features: {e}")
    
    elif command == 'info':
        info = service.get_model_info()
        print(json.dumps(info, indent=2))
    
    elif command == 'test':
        # Test with sample data
        print("Running test prediction...")
        
        # Sample features: [Outstanding_Debt, Credit_Mix, Credit_History_Age, Monthly_Balance, Payment_Behaviour, Annual_Income, Num_of_Delayed_Payment]
        test_features = [
            [5000.0, 1, 36, 2500.0, 85.0, 60000.0, 2],  # Good profile
            [15000.0, 0, 12, 8000.0, 45.0, 35000.0, 8],  # Poor profile  
            [8000.0, 2, 24, 4000.0, 70.0, 50000.0, 3]    # Standard profile
        ]
        
        for i, features in enumerate(test_features):
            print(f"\nTest case {i+1}:")
            print(f"Features: {dict(zip(service.feature_names, features))}")
            result = service.predict_credit_score(features)
            if result['success']:
                print(f"Prediction: {result['prediction_label']} (Category {result['prediction_category']})")
                print(f"Credit Score Estimate: {result['credit_score_estimate']}")
                print(f"Confidence: {result['confidence']:.2%}")
            else:
                print(f"Error: {result['error']}")
    
    else:
        print(f"Unknown command: {command}")

if __name__ == "__main__":
    main()

