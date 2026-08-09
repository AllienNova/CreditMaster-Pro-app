#!/usr/bin/env python3
"""
Generate enhanced illustrative figures for the RG Structure Trading Strategy Paper v2
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from matplotlib.patches import FancyBboxPatch, Rectangle, FancyArrowPatch, Circle
import matplotlib.lines as mlines
from matplotlib.collections import LineCollection

# Set style
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 11
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['figure.titlesize'] = 14
plt.rcParams['mathtext.fontset'] = 'dejavusans'

# Create output directory
import os
os.makedirs('/home/ubuntu/figures_v2', exist_ok=True)

# =============================================================================
# Figure 1: Non-Repainting Principle Illustration
# =============================================================================
def create_nonrepainting_figure():
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Left: Repainting (BAD)
    ax1 = axes[0]
    np.random.seed(42)
    n = 50
    t = np.arange(n)
    price = 100 + np.cumsum(np.random.randn(n) * 0.5)
    
    ax1.plot(t, price, 'b-', linewidth=1.5, alpha=0.7)
    
    # Show line that changes
    ax1.plot([10, 40], [price[10], price[40]], 'r--', linewidth=2, label='Line at t=40')
    ax1.plot([10, 45], [price[10], price[45] + 1], 'r-', linewidth=2, alpha=0.5, label='Line at t=45 (refit)')
    ax1.plot([10, 50], [price[10], price[49] + 2], 'r:', linewidth=2, alpha=0.3, label='Line at t=50 (refit again)')
    
    ax1.axvline(x=40, color='gray', linestyle=':', alpha=0.5)
    ax1.text(40, ax1.get_ylim()[1], 't=40', ha='center', fontsize=9)
    
    ax1.set_title('REPAINTING (BAD)\nLine changes with new data', fontweight='bold', color='red')
    ax1.set_xlabel('Time (bars)')
    ax1.set_ylabel('Price')
    ax1.legend(loc='upper left', fontsize=8)
    
    # Add warning box
    ax1.text(0.5, 0.15, 'Historical signals change!\nBacktest unreliable', 
             transform=ax1.transAxes, ha='center', fontsize=10,
             bbox=dict(boxstyle='round', facecolor='lightcoral', alpha=0.8))
    
    # Right: Non-Repainting (GOOD)
    ax2 = axes[1]
    ax2.plot(t, price, 'b-', linewidth=1.5, alpha=0.7)
    
    # Show frozen line
    ax2.plot([10, 40], [price[10], price[40]], 'g-', linewidth=2, label='$\hat{L}_{39}(t)$ frozen at t=40')
    
    # Extend the frozen line
    slope = (price[40] - price[10]) / 30
    extended_y = price[40] + slope * 10
    ax2.plot([40, 50], [price[40], extended_y], 'g--', linewidth=2, alpha=0.7, label='Projection (same slope)')
    
    ax2.axvline(x=40, color='green', linestyle=':', alpha=0.5)
    ax2.text(40, ax2.get_ylim()[1], 't=40 (freeze)', ha='center', fontsize=9, color='green')
    
    ax2.set_title('NON-REPAINTING (GOOD)\nLine frozen at detection', fontweight='bold', color='green')
    ax2.set_xlabel('Time (bars)')
    ax2.legend(loc='upper left', fontsize=8)
    
    # Add success box
    ax2.text(0.5, 0.15, 'Historical signals fixed!\nBacktest reliable', 
             transform=ax2.transAxes, ha='center', fontsize=10,
             bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.8))
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures_v2/fig1_nonrepainting.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 1 (Non-Repainting) saved.")

# =============================================================================
# Figure 2: Scoring Function Components
# =============================================================================
def create_scoring_figure():
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    # Left: Touch Reward
    ax1 = axes[0]
    distances = np.linspace(0, 1, 100)
    touch_weights = 1 - distances
    touch_weights[distances > 1] = 0
    
    ax1.fill_between(distances, touch_weights, alpha=0.3, color='green')
    ax1.plot(distances, touch_weights, 'g-', linewidth=2)
    ax1.axvline(x=1, color='red', linestyle='--', label='τ = α × ATR')
    ax1.set_xlabel('Normalized Distance (d/τ)')
    ax1.set_ylabel('Touch Weight $w_k$')
    ax1.set_title('Touch Reward Component\n$w_k = 1 - d/τ$ if $0 ≤ d ≤ τ$', fontweight='bold')
    ax1.legend()
    ax1.set_xlim(0, 1.5)
    ax1.set_ylim(0, 1.1)
    
    # Middle: Span Reward
    ax2 = axes[1]
    spans = np.linspace(1, 200, 100)
    span_rewards = 0.2 * np.log(1 + spans)
    
    ax2.fill_between(spans, span_rewards, alpha=0.3, color='blue')
    ax2.plot(spans, span_rewards, 'b-', linewidth=2)
    ax2.set_xlabel('Span (bars between pivots)')
    ax2.set_ylabel('Span Reward')
    ax2.set_title('Persistence Reward Component\n$ω_s × ln(1 + span)$', fontweight='bold')
    
    # Right: Violation Penalty
    ax3 = axes[2]
    violations = np.linspace(0, 5, 100)
    penalties = 1.5 * violations
    
    ax3.fill_between(violations, penalties, alpha=0.3, color='red')
    ax3.plot(violations, penalties, 'r-', linewidth=2)
    ax3.set_xlabel('Cumulative Violation Severity')
    ax3.set_ylabel('Penalty')
    ax3.set_title('Violation Penalty Component\n$λ × Σ V_k$', fontweight='bold')
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures_v2/fig2_scoring_components.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 2 (Scoring Components) saved.")

# =============================================================================
# Figure 3: Symmetric Touch/Violation Definitions
# =============================================================================
def create_symmetric_definitions_figure():
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Left: Support Line
    ax1 = axes[0]
    t = np.arange(100)
    support_line = 100 - 0.05 * t
    
    ax1.plot(t, support_line, 'g-', linewidth=2, label='Support Line L(t)')
    ax1.fill_between(t, support_line, support_line + 2, alpha=0.3, color='green', label='Touch Zone (0 ≤ d ≤ τ)')
    ax1.fill_between(t, support_line - 3, support_line, alpha=0.2, color='red', label='Violation Zone (d < 0)')
    
    # Add pivot points
    pivots = [(20, 101), (45, 99), (70, 97)]
    for px, py in pivots:
        ax1.scatter([px], [py], color='green', s=100, zorder=5, marker='^')
        ax1.annotate('Touch', (px, py+1), ha='center', fontsize=8, color='green')
    
    # Add violation
    ax1.scatter([55], [93], color='red', s=100, zorder=5, marker='v')
    ax1.annotate('Violation', (55, 92), ha='center', fontsize=8, color='red')
    
    ax1.set_xlabel('Time (bars)')
    ax1.set_ylabel('Price')
    ax1.set_title('Support Line: Touch & Violation\n$d = p_k - L(t_k)$', fontweight='bold')
    ax1.legend(loc='upper right', fontsize=8)
    
    # Right: Resistance Line
    ax2 = axes[1]
    resistance_line = 110 + 0.05 * t
    
    ax2.plot(t, resistance_line, 'r-', linewidth=2, label='Resistance Line U(t)')
    ax2.fill_between(t, resistance_line - 2, resistance_line, alpha=0.3, color='red', label='Touch Zone (0 ≤ d ≤ τ)')
    ax2.fill_between(t, resistance_line, resistance_line + 3, alpha=0.2, color='orange', label='Violation Zone (d < 0)')
    
    # Add pivot points
    pivots = [(25, 111), (50, 113), (75, 115)]
    for px, py in pivots:
        ax2.scatter([px], [py], color='red', s=100, zorder=5, marker='v')
        ax2.annotate('Touch', (px, py-1.5), ha='center', fontsize=8, color='red')
    
    # Add violation
    ax2.scatter([60], [118], color='orange', s=100, zorder=5, marker='^')
    ax2.annotate('Violation', (60, 119), ha='center', fontsize=8, color='orange')
    
    ax2.set_xlabel('Time (bars)')
    ax2.set_ylabel('Price')
    ax2.set_title('Resistance Line: Touch & Violation\n$d = U(t_k) - p_k$', fontweight='bold')
    ax2.legend(loc='lower right', fontsize=8)
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures_v2/fig3_symmetric_definitions.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 3 (Symmetric Definitions) saved.")

# =============================================================================
# Figure 4: Risk Geometry Filter
# =============================================================================
def create_risk_geometry_figure():
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Left: Good Geometry (dGeom <= 2.5)
    ax1 = axes[0]
    
    entry = 100
    safety = 103
    atr = 1.2
    d_geom = abs(entry - safety) / atr
    
    ax1.axhline(y=entry, color='blue', linestyle='-', linewidth=2, label=f'Entry: {entry}')
    ax1.axhline(y=safety, color='red', linestyle='--', linewidth=2, label=f'Safety Line: {safety}')
    ax1.axhline(y=safety + 0.2*atr, color='red', linestyle=':', linewidth=1, label='Stop (Safety + buffer)')
    
    # Draw the distance
    ax1.annotate('', xy=(50, entry), xytext=(50, safety),
                arrowprops=dict(arrowstyle='<->', color='green', lw=2))
    ax1.text(52, (entry + safety)/2, f'$d_{{geom}} = {d_geom:.1f}$ ATR\n(≤ 2.5 ✓)', 
             fontsize=10, color='green', va='center')
    
    ax1.set_xlim(0, 100)
    ax1.set_ylim(95, 108)
    ax1.set_xlabel('Time')
    ax1.set_ylabel('Price')
    ax1.set_title('GOOD Risk Geometry\n$d_{geom} ≤ d_{max}$', fontweight='bold', color='green')
    ax1.legend(loc='upper left')
    
    # Add checkmark
    ax1.text(0.85, 0.85, '✓ TRADE', transform=ax1.transAxes, fontsize=14, 
             color='green', fontweight='bold', ha='center',
             bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.8))
    
    # Right: Bad Geometry (dGeom > 2.5)
    ax2 = axes[1]
    
    entry = 100
    safety = 106
    atr = 1.2
    d_geom = abs(entry - safety) / atr
    
    ax2.axhline(y=entry, color='blue', linestyle='-', linewidth=2, label=f'Entry: {entry}')
    ax2.axhline(y=safety, color='red', linestyle='--', linewidth=2, label=f'Safety Line: {safety}')
    ax2.axhline(y=safety + 0.2*atr, color='red', linestyle=':', linewidth=1, label='Stop (Safety + buffer)')
    
    # Draw the distance
    ax2.annotate('', xy=(50, entry), xytext=(50, safety),
                arrowprops=dict(arrowstyle='<->', color='red', lw=2))
    ax2.text(52, (entry + safety)/2, f'$d_{{geom}} = {d_geom:.1f}$ ATR\n(> 2.5 ✗)', 
             fontsize=10, color='red', va='center')
    
    ax2.set_xlim(0, 100)
    ax2.set_ylim(95, 112)
    ax2.set_xlabel('Time')
    ax2.set_ylabel('Price')
    ax2.set_title('BAD Risk Geometry\n$d_{geom} > d_{max}$', fontweight='bold', color='red')
    ax2.legend(loc='upper left')
    
    # Add X mark
    ax2.text(0.85, 0.85, '✗ SKIP', transform=ax2.transAxes, fontsize=14, 
             color='red', fontweight='bold', ha='center',
             bbox=dict(boxstyle='round', facecolor='lightcoral', alpha=0.8))
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures_v2/fig4_risk_geometry.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 4 (Risk Geometry) saved.")

# =============================================================================
# Figure 5: Robust Rejection Scoring
# =============================================================================
def create_rejection_scoring_figure():
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Create sample candles showing rejection
    candles = [
        # (open, high, low, close, is_rejection)
        (100, 102, 99, 101, False),   # Normal candle
        (101, 103, 100, 100.5, False), # Normal candle
        (100.5, 104, 100, 103.5, True), # Rejection candle (bullish)
    ]
    
    x_positions = [10, 20, 30]
    width = 3
    
    for i, (o, h, l, c, is_rej) in enumerate(candles):
        x = x_positions[i]
        color = 'green' if c > o else 'red'
        
        # Draw wick
        ax.plot([x, x], [l, h], color='black', linewidth=1)
        
        # Draw body
        body_bottom = min(o, c)
        body_height = abs(c - o)
        rect = Rectangle((x - width/2, body_bottom), width, body_height, 
                         facecolor=color, edgecolor='black', linewidth=1)
        ax.add_patch(rect)
        
        if is_rej:
            # Highlight rejection candle
            ax.annotate('Rejection Candle', (x, h + 1), ha='center', fontsize=10, 
                       fontweight='bold', color='purple')
    
    # Draw action line
    ax.axhline(y=103, color='orange', linestyle='--', linewidth=2, label='Action Line (Retest Level)')
    
    # Add scoring breakdown
    scoring_text = """
    REJECTION SCORE (4 features):
    
    1. CLV > 0.3 (close near high)     → +1
    2. Wick/Body > 1.5                 → +1  
    3. Close > Open (bullish)          → +1
    4. Close > Action Line             → +1
    
    Total Score: 4/4 ✓
    Threshold: 3/4 required
    """
    
    ax.text(0.65, 0.5, scoring_text, transform=ax.transAxes, fontsize=11,
            verticalalignment='center', fontfamily='monospace',
            bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.9))
    
    ax.set_xlim(0, 60)
    ax.set_ylim(96, 108)
    ax.set_xlabel('Time')
    ax.set_ylabel('Price')
    ax.set_title('Robust Multi-Feature Rejection Scoring', fontweight='bold')
    ax.legend(loc='upper left')
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures_v2/fig5_rejection_scoring.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 5 (Rejection Scoring) saved.")

# =============================================================================
# Figure 6: Complete Visual Strategy Overview
# =============================================================================
def create_strategy_overview_figure():
    fig, ax = plt.subplots(figsize=(16, 10))
    
    np.random.seed(456)
    n = 120
    t = np.arange(n)
    
    # Create realistic price action
    # Phase 1: Uptrend with support
    price1 = 100 + 0.2 * np.arange(40) + np.random.randn(40) * 0.5
    # Phase 2: Break down
    price2 = price1[-1] + np.cumsum(np.random.randn(15) * 0.5 - 0.3)
    # Phase 3: Retest
    price3 = price2[-1] + np.cumsum(np.random.randn(15) * 0.3 + 0.2)
    # Phase 4: Continuation down
    price4 = price3[-1] + np.cumsum(np.random.randn(50) * 0.5 - 0.15)
    
    price = np.concatenate([price1, price2, price3, price4])
    
    # Generate high/low
    high = price + np.abs(np.random.randn(n) * 0.8)
    low = price - np.abs(np.random.randn(n) * 0.8)
    
    # Plot price as line with fill
    ax.plot(t, price, 'b-', linewidth=1.5, alpha=0.8, label='Price')
    ax.fill_between(t, low, high, alpha=0.15, color='blue')
    
    # Draw support line (before break)
    support_slope = 0.15
    support_intercept = 98
    support_line = support_intercept + support_slope * t[:50]
    ax.plot(t[:50], support_line, 'g-', linewidth=2, label='Support Line')
    
    # Draw resistance line
    resistance_slope = 0.18
    resistance_intercept = 105
    resistance_line = resistance_intercept + resistance_slope * t[:50]
    ax.plot(t[:50], resistance_line, 'r-', linewidth=2, label='Resistance Line')
    
    # Mark pivots
    pivot_lows = [(10, low[10]), (25, low[25]), (38, low[38])]
    pivot_highs = [(15, high[15]), (30, high[30]), (42, high[42])]
    
    for px, py in pivot_lows:
        ax.scatter([px], [py], color='green', s=80, zorder=5, marker='^')
    for px, py in pivot_highs:
        ax.scatter([px], [py], color='red', s=80, zorder=5, marker='v')
    
    # Mark break point
    break_bar = 42
    ax.axvline(x=break_bar, color='purple', linestyle=':', alpha=0.7)
    ax.scatter([break_bar], [price[break_bar]], color='purple', s=150, zorder=5, marker='X')
    ax.annotate('BREAK', (break_bar, price[break_bar] + 2), ha='center', fontsize=11, 
               fontweight='bold', color='purple')
    
    # Draw frozen Action/Safety lines
    action_level = support_intercept + support_slope * break_bar
    safety_level = resistance_intercept + resistance_slope * break_bar
    
    ax.axhline(y=action_level, xmin=break_bar/n, xmax=0.7, color='orange', 
               linestyle='--', linewidth=2, label='Action Line (Frozen)')
    ax.axhline(y=safety_level, xmin=break_bar/n, xmax=0.7, color='blue', 
               linestyle='--', linewidth=2, label='Safety Line (Frozen)')
    
    # Mark retest
    retest_bar = 58
    ax.scatter([retest_bar], [price[retest_bar]], color='orange', s=150, zorder=5, marker='o')
    ax.annotate('RETEST', (retest_bar, price[retest_bar] + 1.5), ha='center', fontsize=11, 
               fontweight='bold', color='orange')
    
    # Mark entry
    entry_bar = 60
    entry_price = price[entry_bar]
    ax.scatter([entry_bar], [entry_price], color='red', s=200, zorder=5, marker='*')
    ax.annotate('SHORT ENTRY', (entry_bar + 3, entry_price), fontsize=11, 
               fontweight='bold', color='red')
    
    # Draw stop loss
    stop_level = safety_level + 0.5
    ax.axhline(y=stop_level, xmin=entry_bar/n, xmax=0.9, color='red', 
               linestyle='-.', linewidth=1.5, alpha=0.7)
    ax.text(n-5, stop_level + 0.3, 'Stop Loss', fontsize=9, color='red', ha='right')
    
    # Draw trailing stop progression
    trail_levels = [stop_level, entry_price, entry_price - 1, entry_price - 2]
    trail_bars = [entry_bar, 75, 90, 105]
    
    for i in range(len(trail_bars) - 1):
        ax.plot([trail_bars[i], trail_bars[i+1]], [trail_levels[i], trail_levels[i]], 
               'fuchsia', linewidth=2, alpha=0.7)
        ax.plot([trail_bars[i+1], trail_bars[i+1]], [trail_levels[i], trail_levels[i+1]], 
               'fuchsia', linewidth=2, alpha=0.7)
    
    ax.text(90, entry_price - 0.5, 'Trailing Stop', fontsize=9, color='fuchsia')
    
    # Add regime background
    ax.axvspan(0, 40, alpha=0.1, color='green', label='Trend Regime')
    ax.axvspan(40, 70, alpha=0.1, color='yellow', label='Transition')
    ax.axvspan(70, n, alpha=0.1, color='green')
    
    # Add info table
    info_text = """
    Strategy Overview:
    ─────────────────
    1. Identify pivots (▲▼)
    2. Fit trendlines
    3. Detect break (X)
    4. Freeze Action/Safety
    5. Wait for retest (○)
    6. Enter on rejection (★)
    7. Trail stop (─)
    """
    ax.text(0.02, 0.98, info_text, transform=ax.transAxes, fontsize=10,
            verticalalignment='top', fontfamily='monospace',
            bbox=dict(boxstyle='round', facecolor='white', alpha=0.9))
    
    ax.set_xlabel('Time (bars)')
    ax.set_ylabel('Price')
    ax.set_title('Complete RG Structure Strategy Visualization', fontweight='bold', fontsize=14)
    ax.legend(loc='upper right', fontsize=9)
    ax.set_xlim(0, n)
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures_v2/fig6_strategy_overview.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 6 (Strategy Overview) saved.")

# =============================================================================
# Figure 7: Q-Score Calibration Framework
# =============================================================================
def create_qscore_calibration_figure():
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Left: Sigmoid as Monotone Index
    ax1 = axes[0]
    x = np.linspace(-5, 5, 100)
    y = 1 / (1 + np.exp(-x))
    
    ax1.plot(x, y, 'b-', linewidth=2, label='$Q = σ(Score)$')
    ax1.axhline(y=0.7, color='green', linestyle='--', alpha=0.7, label='A-Grade (Q ≥ 0.70)')
    ax1.axhline(y=0.6, color='orange', linestyle='--', alpha=0.7, label='B-Grade (Q ≥ 0.60)')
    
    ax1.fill_between(x, y, 0.7, where=(y >= 0.7), alpha=0.2, color='green')
    ax1.fill_between(x, y, 0.6, where=((y >= 0.6) & (y < 0.7)), alpha=0.2, color='orange')
    
    ax1.set_xlabel('Raw Score')
    ax1.set_ylabel('Q-Score (Monotone Index)')
    ax1.set_title('Q-Score as Monotone Reliability Index\n(NOT a probability)', fontweight='bold')
    ax1.legend(loc='lower right', fontsize=9)
    ax1.set_xlim(-5, 5)
    ax1.set_ylim(0, 1)
    ax1.grid(True, alpha=0.3)
    
    # Right: Calibration Framework
    ax2 = axes[1]
    
    # Simulated calibration curve
    q_bins = np.array([0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9])
    observed_success = np.array([0.35, 0.42, 0.48, 0.55, 0.62, 0.68, 0.75, 0.82, 0.88])
    
    ax2.plot([0.3, 1], [0.3, 1], 'k--', linewidth=1, alpha=0.5, label='Perfect Calibration')
    ax2.scatter(q_bins, observed_success, color='blue', s=100, zorder=5)
    ax2.plot(q_bins, observed_success, 'b-', linewidth=2, label='Observed Success Rate')
    
    # Add Platt scaling curve
    from scipy.special import expit
    q_fine = np.linspace(0.4, 0.95, 100)
    # Simulated Platt-scaled probabilities
    platt_probs = expit(3 * (q_fine - 0.6))
    ax2.plot(q_fine, platt_probs, 'g-', linewidth=2, alpha=0.7, label='Platt-Scaled P(Success)')
    
    ax2.set_xlabel('Q-Score')
    ax2.set_ylabel('P(Success) or Observed Rate')
    ax2.set_title('Optional: Calibration Framework\n(Platt Scaling / Isotonic Regression)', fontweight='bold')
    ax2.legend(loc='lower right', fontsize=9)
    ax2.set_xlim(0.4, 1)
    ax2.set_ylim(0.3, 1)
    ax2.grid(True, alpha=0.3)
    
    # Add note
    ax2.text(0.5, 0.95, 'Requires historical data\nfor calibration', 
             transform=ax2.transAxes, ha='center', fontsize=9, style='italic',
             bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.8))
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures_v2/fig7_qscore_calibration.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 7 (Q-Score Calibration) saved.")

# =============================================================================
# Figure 8: Execution Realism Model
# =============================================================================
def create_execution_realism_figure():
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    # Left: Slippage Model
    ax1 = axes[0]
    
    # Draw a candle
    o, h, l, c = 100, 102, 98, 101
    ax1.plot([0.5, 0.5], [l, h], 'k-', linewidth=2)
    rect = Rectangle((0.3, min(o, c)), 0.4, abs(c - o), facecolor='green', edgecolor='black')
    ax1.add_patch(rect)
    
    # Show stop level and actual fill
    stop_level = 99
    actual_fill = 98.5
    
    ax1.axhline(y=stop_level, color='red', linestyle='--', linewidth=2, label='Stop Level')
    ax1.axhline(y=actual_fill, color='orange', linestyle='-', linewidth=2, label='Actual Fill')
    
    ax1.annotate('', xy=(0.8, actual_fill), xytext=(0.8, stop_level),
                arrowprops=dict(arrowstyle='<->', color='purple', lw=2))
    ax1.text(0.85, (stop_level + actual_fill)/2, 'Slippage', fontsize=10, color='purple', va='center')
    
    ax1.set_xlim(0, 1.5)
    ax1.set_ylim(97, 103)
    ax1.set_title('Slippage Model\n(Intrabar Stop Execution)', fontweight='bold')
    ax1.legend(loc='upper right', fontsize=9)
    ax1.set_xticks([])
    
    # Middle: Gap Handling
    ax2 = axes[1]
    
    # Draw two candles with gap
    # Day 1
    ax2.plot([0.3, 0.3], [99, 102], 'k-', linewidth=2)
    rect1 = Rectangle((0.2, 100), 0.2, 1.5, facecolor='green', edgecolor='black')
    ax2.add_patch(rect1)
    
    # Day 2 (gap down)
    ax2.plot([0.7, 0.7], [94, 97], 'k-', linewidth=2)
    rect2 = Rectangle((0.6, 95), 0.2, 1.5, facecolor='red', edgecolor='black')
    ax2.add_patch(rect2)
    
    # Stop and fill
    stop_level = 98
    gap_fill = 97  # Open of gap candle
    
    ax2.axhline(y=stop_level, color='red', linestyle='--', linewidth=2, label='Stop Level')
    ax2.scatter([0.7], [gap_fill], color='orange', s=100, zorder=5, marker='X')
    ax2.annotate('Fill at Open\n(Gap Through)', (0.75, gap_fill), fontsize=9, color='orange')
    
    ax2.set_xlim(0, 1.2)
    ax2.set_ylim(93, 104)
    ax2.set_title('Gap Handling\n(Stop Gapped Through)', fontweight='bold')
    ax2.legend(loc='upper right', fontsize=9)
    ax2.set_xticks([])
    
    # Right: Commission Model
    ax3 = axes[2]
    
    trade_sizes = np.array([1000, 5000, 10000, 25000, 50000])
    commission_pct = 0.05
    commissions = trade_sizes * commission_pct / 100
    
    ax3.bar(range(len(trade_sizes)), commissions, color='steelblue', edgecolor='black')
    ax3.set_xticks(range(len(trade_sizes)))
    ax3.set_xticklabels(['$1K', '$5K', '$10K', '$25K', '$50K'])
    ax3.set_xlabel('Trade Size')
    ax3.set_ylabel('Commission ($)')
    ax3.set_title(f'Commission Model\n({commission_pct}% per trade)', fontweight='bold')
    
    for i, (size, comm) in enumerate(zip(trade_sizes, commissions)):
        ax3.text(i, comm + 0.5, f'${comm:.2f}', ha='center', fontsize=9)
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures_v2/fig8_execution_realism.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 8 (Execution Realism) saved.")

# =============================================================================
# Run all figure generation
# =============================================================================
if __name__ == "__main__":
    print("Generating enhanced figures for trading strategy paper v2...")
    create_nonrepainting_figure()
    create_scoring_figure()
    create_symmetric_definitions_figure()
    create_risk_geometry_figure()
    create_rejection_scoring_figure()
    create_strategy_overview_figure()
    create_qscore_calibration_figure()
    create_execution_realism_figure()
    print("\nAll v2 figures generated successfully!")
    print("Figures saved to: /home/ubuntu/figures_v2/")
