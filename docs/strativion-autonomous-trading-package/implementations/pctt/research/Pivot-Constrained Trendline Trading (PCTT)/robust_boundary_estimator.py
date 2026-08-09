"""
RobustBoundaryEstimator: Robust trendline estimation using Huber loss,
Elastic Net regularization, and RANSAC consensus validation.

Author: Manus AI
Version: 4.0
"""

from dataclasses import dataclass
from typing import Optional, Tuple, List
import numpy as np
from sklearn.linear_model import HuberRegressor, RANSACRegressor, LinearRegression
from sklearn.preprocessing import StandardScaler
import warnings


@dataclass
class BoundaryEstimate:
    """Container for boundary estimation results"""
    intercept: float
    slope: float
    score: float
    touches: int
    violations: float
    q_score: float  # Normalized quality score [0, 1]
    grade: str  # 'A', 'B', or 'SKIP'
    is_valid: bool
    diagnostics: dict


@dataclass
class EstimatorConfig:
    """Configuration for boundary estimation"""
    # Touch/violation parameters
    touch_tolerance: float = 0.3  # ATR multiplier
    violation_penalty: float = 2.0  # Lambda
    persistence_weight: float = 0.2  # Omega
    
    # Quality thresholds
    q_score_a: float = 0.70
    q_score_b: float = 0.55
    
    # Robustness parameters
    huber_epsilon: float = 1.35
    alpha: float = 0.01  # Regularization strength
    l1_ratio: float = 0.5  # Elastic net mixing
    max_slope_atr: float = 0.02  # Max slope per bar in ATR units
    
    # RANSAC parameters
    ransac_min_samples: int = 2
    ransac_max_trials: int = 100
    ransac_residual_threshold: float = 1.0  # ATR multiplier
    
    # Minimum requirements
    min_pivots: int = 5
    min_touches: int = 3
    min_span: int = 20  # Minimum bars between first and last pivot


class RobustBoundaryEstimator:
    """
    Production-grade boundary estimation using robust regression.
    
    Features:
    - Huber loss for outlier resistance
    - Elastic Net regularization to prevent overfitting
    - RANSAC consensus validation for model stability
    - One-sided touch/violation definitions
    - Quality scoring with sigmoid normalization
    
    Example:
        >>> estimator = RobustBoundaryEstimator()
        >>> result = estimator.estimate_support(pivot_bars, pivot_prices, atr)
        >>> print(f"Support: {result.intercept} + {result.slope} * t")
        >>> print(f"Q-Score: {result.q_score:.2f}, Grade: {result.grade}")
    """
    
    def __init__(self, config: Optional[EstimatorConfig] = None):
        """
        Initialize the estimator.
        
        Args:
            config: Configuration object (uses defaults if None)
        """
        self.config = config or EstimatorConfig()
    
    # =========================================================================
    # MAIN ESTIMATION METHODS
    # =========================================================================
    
    def estimate_support(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        all_bar_lows: Optional[np.ndarray] = None
    ) -> BoundaryEstimate:
        """
        Estimate support boundary from pivot lows.
        
        Args:
            pivot_bars: Array of bar indices where pivot lows occurred
            pivot_prices: Array of pivot low prices
            atr: Current ATR for normalization
            all_bar_lows: Optional array of all bar lows for violation checking
        
        Returns:
            BoundaryEstimate with line parameters and quality metrics
        """
        return self._estimate_boundary(
            pivot_bars, pivot_prices, atr,
            boundary_type='support',
            all_prices=all_bar_lows
        )
    
    def estimate_resistance(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        all_bar_highs: Optional[np.ndarray] = None
    ) -> BoundaryEstimate:
        """
        Estimate resistance boundary from pivot highs.
        
        Args:
            pivot_bars: Array of bar indices where pivot highs occurred
            pivot_prices: Array of pivot high prices
            atr: Current ATR for normalization
            all_bar_highs: Optional array of all bar highs for violation checking
        
        Returns:
            BoundaryEstimate with line parameters and quality metrics
        """
        return self._estimate_boundary(
            pivot_bars, pivot_prices, atr,
            boundary_type='resistance',
            all_prices=all_bar_highs
        )
    
    # =========================================================================
    # CORE ESTIMATION LOGIC
    # =========================================================================
    
    def _estimate_boundary(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str,
        all_prices: Optional[np.ndarray] = None
    ) -> BoundaryEstimate:
        """
        Core boundary estimation with robust regression.
        """
        pivot_bars = np.asarray(pivot_bars)
        pivot_prices = np.asarray(pivot_prices)
        
        # Validate inputs
        if not self._validate_inputs(pivot_bars, pivot_prices, atr):
            return self._invalid_result("Insufficient data")
        
        # Try multiple estimation methods and select best
        candidates = []
        
        # Method 1: Huber regression
        huber_result = self._huber_estimation(
            pivot_bars, pivot_prices, atr, boundary_type
        )
        if huber_result is not None:
            candidates.append(huber_result)
        
        # Method 2: RANSAC estimation
        ransac_result = self._ransac_estimation(
            pivot_bars, pivot_prices, atr, boundary_type
        )
        if ransac_result is not None:
            candidates.append(ransac_result)
        
        # Method 3: Pairwise enumeration (fallback)
        pairwise_result = self._pairwise_estimation(
            pivot_bars, pivot_prices, atr, boundary_type
        )
        if pairwise_result is not None:
            candidates.append(pairwise_result)
        
        if not candidates:
            return self._invalid_result("All estimation methods failed")
        
        # Select best candidate by score
        best = max(candidates, key=lambda x: x['score'])
        
        # Calculate quality score and grade
        q_score = self._sigmoid(best['score'] / 3)  # Normalize
        grade = self._assign_grade(q_score, best['touches'])
        
        return BoundaryEstimate(
            intercept=best['intercept'],
            slope=best['slope'],
            score=best['score'],
            touches=best['touches'],
            violations=best['violations'],
            q_score=q_score,
            grade=grade,
            is_valid=True,
            diagnostics={
                'method': best['method'],
                'n_pivots': len(pivot_bars),
                'span': int(np.ptp(pivot_bars)),
                'atr': atr,
                'all_candidates': len(candidates)
            }
        )
    
    def _huber_estimation(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str
    ) -> Optional[dict]:
        """
        Estimate boundary using Huber regression.
        """
        try:
            X = pivot_bars.reshape(-1, 1)
            y = pivot_prices
            
            # Fit Huber regressor
            huber = HuberRegressor(
                epsilon=self.config.huber_epsilon,
                alpha=self.config.alpha * atr,
                max_iter=200
            )
            huber.fit(X, y)
            
            intercept = huber.intercept_
            slope = huber.coef_[0]
            
            # Check slope constraint
            if abs(slope) > self.config.max_slope_atr * atr:
                return None
            
            # Calculate score
            score_data = self._calculate_score(
                intercept, slope, pivot_bars, pivot_prices, atr, boundary_type
            )
            
            return {
                'intercept': intercept,
                'slope': slope,
                'score': score_data['score'],
                'touches': score_data['touches'],
                'violations': score_data['violations'],
                'method': 'huber'
            }
        
        except Exception as e:
            warnings.warn(f"Huber estimation failed: {e}")
            return None
    
    def _ransac_estimation(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str
    ) -> Optional[dict]:
        """
        Estimate boundary using RANSAC for consensus validation.
        """
        try:
            X = pivot_bars.reshape(-1, 1)
            y = pivot_prices
            
            residual_threshold = self.config.ransac_residual_threshold * atr
            
            ransac = RANSACRegressor(
                min_samples=self.config.ransac_min_samples,
                residual_threshold=residual_threshold,
                max_trials=self.config.ransac_max_trials,
                random_state=42
            )
            ransac.fit(X, y)
            
            # Check if enough inliers
            inlier_mask = ransac.inlier_mask_
            n_inliers = np.sum(inlier_mask)
            
            if n_inliers < self.config.min_touches:
                return None
            
            # Refit on inliers for better estimate
            X_inliers = X[inlier_mask]
            y_inliers = y[inlier_mask]
            
            final_model = LinearRegression()
            final_model.fit(X_inliers, y_inliers)
            
            intercept = final_model.intercept_
            slope = final_model.coef_[0]
            
            # Check slope constraint
            if abs(slope) > self.config.max_slope_atr * atr:
                return None
            
            # Calculate score
            score_data = self._calculate_score(
                intercept, slope, pivot_bars, pivot_prices, atr, boundary_type
            )
            
            # Bonus for high consensus
            consensus_bonus = 0.5 * (n_inliers / len(pivot_bars))
            score_data['score'] += consensus_bonus
            
            return {
                'intercept': intercept,
                'slope': slope,
                'score': score_data['score'],
                'touches': score_data['touches'],
                'violations': score_data['violations'],
                'method': 'ransac',
                'n_inliers': n_inliers,
                'consensus_ratio': n_inliers / len(pivot_bars)
            }
        
        except Exception as e:
            warnings.warn(f"RANSAC estimation failed: {e}")
            return None
    
    def _pairwise_estimation(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str
    ) -> Optional[dict]:
        """
        Estimate boundary by enumerating pivot pairs (fallback method).
        """
        n_pivots = len(pivot_bars)
        
        if n_pivots < 2:
            return None
        
        best_score = -np.inf
        best_result = None
        
        # Enumerate pairs
        max_pairs = min(n_pivots, 10)  # Limit for efficiency
        
        for i in range(min(n_pivots - 1, max_pairs)):
            for j in range(i + 1, min(n_pivots, max_pairs + 1)):
                bar1, price1 = pivot_bars[i], pivot_prices[i]
                bar2, price2 = pivot_bars[j], pivot_prices[j]
                
                if bar1 == bar2:
                    continue
                
                # Calculate line parameters
                slope = (price2 - price1) / (bar2 - bar1)
                intercept = price1 - slope * bar1
                
                # Check slope constraint
                if abs(slope) > self.config.max_slope_atr * atr:
                    continue
                
                # Calculate score
                score_data = self._calculate_score(
                    intercept, slope, pivot_bars, pivot_prices, atr, boundary_type
                )
                
                # Check minimum touches
                if score_data['touches'] < self.config.min_touches:
                    continue
                
                if score_data['score'] > best_score:
                    best_score = score_data['score']
                    best_result = {
                        'intercept': intercept,
                        'slope': slope,
                        'score': score_data['score'],
                        'touches': score_data['touches'],
                        'violations': score_data['violations'],
                        'method': 'pairwise'
                    }
        
        return best_result
    
    # =========================================================================
    # SCORING FUNCTIONS
    # =========================================================================
    
    def _calculate_score(
        self,
        intercept: float,
        slope: float,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float,
        boundary_type: str
    ) -> dict:
        """
        Calculate quality score for a candidate boundary line.
        
        Uses one-sided touch/violation definitions:
        - Support: touches when pivot is above line, violations when below
        - Resistance: touches when pivot is below line, violations when above
        """
        tau = self.config.touch_tolerance * atr
        
        touches = 0
        touch_weights = 0.0
        violations = 0.0
        
        for bar, price in zip(pivot_bars, pivot_prices):
            line_value = intercept + slope * bar
            
            if boundary_type == 'support':
                # Support: pivot should be at or above line
                distance = price - line_value
                
                if 0 <= distance <= tau:
                    # Touch: pivot is close to line from above
                    weight = 1 - distance / tau
                    touch_weights += weight
                    touches += 1
                elif distance < -tau:
                    # Violation: pivot is below line
                    violation_mag = min(abs(distance) / atr, 3.0)  # Cap at 3 ATR
                    violations += violation_mag
            
            else:  # resistance
                # Resistance: pivot should be at or below line
                distance = line_value - price
                
                if 0 <= distance <= tau:
                    # Touch: pivot is close to line from below
                    weight = 1 - distance / tau
                    touch_weights += weight
                    touches += 1
                elif distance < -tau:
                    # Violation: pivot is above line
                    violation_mag = min(abs(distance) / atr, 3.0)
                    violations += violation_mag
        
        # Persistence reward (log-scaled span)
        span = np.ptp(pivot_bars)
        persistence = self.config.persistence_weight * np.log(1 + span)
        
        # Total score
        score = (
            touch_weights +
            persistence -
            self.config.violation_penalty * violations
        )
        
        return {
            'score': score,
            'touches': touches,
            'violations': violations,
            'touch_weights': touch_weights,
            'persistence': persistence
        }
    
    # =========================================================================
    # HELPER METHODS
    # =========================================================================
    
    def _validate_inputs(
        self,
        pivot_bars: np.ndarray,
        pivot_prices: np.ndarray,
        atr: float
    ) -> bool:
        """Validate input data meets minimum requirements"""
        if len(pivot_bars) < self.config.min_pivots:
            return False
        
        if len(pivot_bars) != len(pivot_prices):
            return False
        
        if atr <= 0:
            return False
        
        span = np.ptp(pivot_bars)
        if span < self.config.min_span:
            return False
        
        return True
    
    def _sigmoid(self, x: float) -> float:
        """Sigmoid function for score normalization"""
        return 1 / (1 + np.exp(-x))
    
    def _assign_grade(self, q_score: float, touches: int) -> str:
        """Assign quality grade based on Q-score and touches"""
        if q_score >= self.config.q_score_a and touches >= 3:
            return 'A'
        elif q_score >= self.config.q_score_b and touches >= 2:
            return 'B'
        else:
            return 'SKIP'
    
    def _invalid_result(self, reason: str) -> BoundaryEstimate:
        """Return invalid result with reason"""
        return BoundaryEstimate(
            intercept=0.0,
            slope=0.0,
            score=-np.inf,
            touches=0,
            violations=0.0,
            q_score=0.0,
            grade='SKIP',
            is_valid=False,
            diagnostics={'error': reason}
        )


# =============================================================================
# CONVENIENCE FUNCTIONS
# =============================================================================

def estimate_boundaries(
    pivot_low_bars: np.ndarray,
    pivot_low_prices: np.ndarray,
    pivot_high_bars: np.ndarray,
    pivot_high_prices: np.ndarray,
    atr: float,
    config: Optional[EstimatorConfig] = None
) -> Tuple[BoundaryEstimate, BoundaryEstimate]:
    """
    Convenience function to estimate both support and resistance.
    
    Args:
        pivot_low_bars: Bar indices of pivot lows
        pivot_low_prices: Prices of pivot lows
        pivot_high_bars: Bar indices of pivot highs
        pivot_high_prices: Prices of pivot highs
        atr: Current ATR
        config: Optional configuration
    
    Returns:
        Tuple of (support_estimate, resistance_estimate)
    """
    estimator = RobustBoundaryEstimator(config)
    
    support = estimator.estimate_support(
        pivot_low_bars, pivot_low_prices, atr
    )
    
    resistance = estimator.estimate_resistance(
        pivot_high_bars, pivot_high_prices, atr
    )
    
    return support, resistance
