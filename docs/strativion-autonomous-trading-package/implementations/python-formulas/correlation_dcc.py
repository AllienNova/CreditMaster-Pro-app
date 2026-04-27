"""
Dynamic Conditional Correlation (DCC-GARCH)
===========================================
From Appendix C, Section 7 of "The 30 Indisputable Laws of Trading."
Law 24: Systemic Correlation. Diversification weakens when correlations spike.

This module replaces static 30-day rolling correlation with a simplified
DCC-GARCH approximation for dynamic correlation tracking.

SSOT Ref: SSOT-FRM-10
"""

import math
from dataclasses import dataclass
from typing import List, Tuple

@dataclass
class DCCResult:
    """Result of a DCC-GARCH correlation calculation."""
    correlation: float
    q_matrix_ij: float
    q_matrix_ii: float
    q_matrix_jj: float
    interpretation: str

def calculate_dcc_update(
    prev_q_ij: float,
    prev_q_ii: float,
    prev_q_jj: float,
    std_resid_i: float,
    std_resid_j: float,
    alpha: float = 0.05,
    beta: float = 0.90,
    unconditional_corr: float = 0.30,
) -> DCCResult:
    r"""Calculate the DCC-GARCH correlation update for a single step.
    
    Formula: Q_t = (1 - a - b)*Q_bar + a*(e_{t-1}*e_{t-1}') + b*Q_{t-1}
             R_t = diag(Q_t)^{-1/2} * Q_t * diag(Q_t)^{-1/2}
    SSOT Ref: SSOT-FRM-10
    
    Args:
        prev_q_ij: Previous step Q-matrix off-diagonal element.
        prev_q_ii: Previous step Q-matrix diagonal element for asset i.
        prev_q_jj: Previous step Q-matrix diagonal element for asset j.
        std_resid_i: Standardized residual for asset i at current step.
        std_resid_j: Standardized residual for asset j at current step.
        alpha: Shock parameter (typically 0.01 - 0.10).
        beta: Persistence parameter (typically 0.80 - 0.98).
        unconditional_corr: Long-term average correlation (Q_bar).
        
    Returns:
        DCCResult dataclass.
    """
    if alpha < 0 or beta < 0 or alpha + beta >= 1.0:
        raise ValueError("alpha and beta must be positive and sum to < 1.0.")
        
    omega = 1.0 - alpha - beta
    
    # Update Q matrix elements
    q_ij = omega * unconditional_corr + alpha * (std_resid_i * std_resid_j) + beta * prev_q_ij
    q_ii = omega * 1.0 + alpha * (std_resid_i**2) + beta * prev_q_ii
    q_jj = omega * 1.0 + alpha * (std_resid_j**2) + beta * prev_q_jj
    
    # Calculate correlation
    denominator = math.sqrt(q_ii * q_jj)
    if denominator == 0:
        correlation = 0.0
    else:
        correlation = q_ij / denominator
        
    # Clamp to [-1, 1]
    correlation = max(-1.0, min(1.0, correlation))
    
    interp = f"DCC Correlation updated to {correlation:.2f} (alpha={alpha}, beta={beta})."
    
    return DCCResult(
        correlation=round(correlation, 4),
        q_matrix_ij=q_ij,
        q_matrix_ii=q_ii,
        q_matrix_jj=q_jj,
        interpretation=interp
    )
