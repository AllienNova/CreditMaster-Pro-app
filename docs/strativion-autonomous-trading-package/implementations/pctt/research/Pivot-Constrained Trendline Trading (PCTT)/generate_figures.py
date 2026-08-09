#!/usr/bin/env python3
"""
Generate illustrative figures for the RG Structure Trading Strategy Paper
"""

import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
import numpy as np
from matplotlib.patches import FancyBboxPatch, FancyArrowPatch
import matplotlib.lines as mlines

# Set style
plt.style.use('seaborn-v0_8-whitegrid')
plt.rcParams['font.family'] = 'DejaVu Sans'
plt.rcParams['font.size'] = 10
plt.rcParams['axes.labelsize'] = 11
plt.rcParams['axes.titlesize'] = 12
plt.rcParams['figure.titlesize'] = 14

# Create output directory
import os
os.makedirs('/home/ubuntu/figures', exist_ok=True)

# =============================================================================
# Figure 1: Pivot-Constrained Trendline Construction
# =============================================================================
def create_trendline_figure():
    fig, ax = plt.subplots(figsize=(12, 7))
    
    # Generate sample price data with clear pivots
    np.random.seed(42)
    n = 100
    t = np.arange(n)
    
    # Create a price series with clear structure
    trend = 100 + 0.15 * t
    noise = np.cumsum(np.random.randn(n) * 0.5)
    price = trend + noise + 5 * np.sin(t / 10)
    
    # Add some volatility
    high = price + np.abs(np.random.randn(n) * 1.5)
    low = price - np.abs(np.random.randn(n) * 1.5)
    close = price + np.random.randn(n) * 0.5
    
    # Plot candlestick-like representation
    for i in range(n):
        color = 'green' if close[i] >= price[i] else 'red'
        ax.plot([t[i], t[i]], [low[i], high[i]], color='gray', linewidth=0.5)
        ax.plot([t[i], t[i]], [min(price[i], close[i]), max(price[i], close[i])], 
                color=color, linewidth=2)
    
    # Identify pivot lows (simplified)
    pivot_lows = []
    for i in range(3, n-3):
        if low[i] == min(low[i-3:i+4]):
            pivot_lows.append((t[i], low[i]))
    
    # Identify pivot highs
    pivot_highs = []
    for i in range(3, n-3):
        if high[i] == max(high[i-3:i+4]):
            pivot_highs.append((t[i], high[i]))
    
    # Plot pivot points
    for pt, pv in pivot_lows[:6]:
        ax.scatter(pt, pv, color='green', s=100, zorder=5, marker='^')
        ax.annotate('PL', (pt, pv-2), ha='center', fontsize=8, color='green')
    
    for pt, pv in pivot_highs[:6]:
        ax.scatter(pt, pv, color='red', s=100, zorder=5, marker='v')
        ax.annotate('PH', (pt, pv+2), ha='center', fontsize=8, color='red')
    
    # Draw support line through pivot lows
    if len(pivot_lows) >= 4:
        p1, p2 = pivot_lows[1], pivot_lows[3]
        slope = (p2[1] - p1[1]) / (p2[0] - p1[0])
        x_line = np.array([0, n])
        y_line = p1[1] + slope * (x_line - p1[0])
        ax.plot(x_line, y_line, 'g--', linewidth=2, label='Support Line (L)', alpha=0.8)
    
    # Draw resistance line through pivot highs
    if len(pivot_highs) >= 4:
        p1, p2 = pivot_highs[1], pivot_highs[3]
        slope = (p2[1] - p1[1]) / (p2[0] - p1[0])
        x_line = np.array([0, n])
        y_line = p1[1] + slope * (x_line - p1[0])
        ax.plot(x_line, y_line, 'r--', linewidth=2, label='Resistance Line (U)', alpha=0.8)
    
    # Add touch tolerance zone illustration
    ax.fill_between([pivot_lows[1][0]-3, pivot_lows[1][0]+3], 
                    [pivot_lows[1][1]-1.5, pivot_lows[1][1]-1.5],
                    [pivot_lows[1][1]+1.5, pivot_lows[1][1]+1.5],
                    alpha=0.3, color='green', label='Touch Tolerance (τ)')
    
    ax.set_xlabel('Time (bars)')
    ax.set_ylabel('Price')
    ax.set_title('Figure 1: Pivot-Constrained Trendline Construction', fontweight='bold')
    ax.legend(loc='upper left')
    ax.set_xlim(0, n)
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures/fig1_trendline_construction.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 1 saved.")

# =============================================================================
# Figure 2: Break-Retest-Rejection Sequence
# =============================================================================
def create_break_retest_figure():
    fig, ax = plt.subplots(figsize=(14, 8))
    
    # Create price data showing break-retest pattern
    np.random.seed(123)
    n = 80
    t = np.arange(n)
    
    # Phase 1: Price respecting support (0-30)
    price1 = 100 + np.random.randn(30) * 0.8
    price1 = np.maximum(price1, 98.5)  # Bouncing off support
    
    # Phase 2: Break down (30-40)
    price2 = np.linspace(99, 94, 10) + np.random.randn(10) * 0.5
    
    # Phase 3: Retest (40-55)
    price3 = np.concatenate([
        np.linspace(94, 98.5, 8),  # Move back up
        np.linspace(98.5, 97, 7)   # Rejection
    ]) + np.random.randn(15) * 0.3
    
    # Phase 4: Continuation (55-80)
    price4 = np.linspace(97, 88, 25) + np.random.randn(25) * 0.8
    
    price = np.concatenate([price1, price2, price3, price4])
    
    # Generate OHLC-like data
    high = price + np.abs(np.random.randn(n) * 0.8)
    low = price - np.abs(np.random.randn(n) * 0.8)
    
    # Plot price
    ax.plot(t, price, 'b-', linewidth=1.5, alpha=0.7)
    ax.fill_between(t, low, high, alpha=0.2, color='blue')
    
    # Draw support line (before break)
    support_level = 98.5
    ax.axhline(y=support_level, color='green', linestyle='-', linewidth=2, 
               label='Support → Action Line')
    
    # Draw resistance/safety line
    safety_level = 103
    ax.axhline(y=safety_level, color='blue', linestyle='--', linewidth=2,
               label='Resistance → Safety Line', alpha=0.7)
    
    # Annotate phases
    # Phase 1: Support respected
    ax.annotate('', xy=(15, 98.5), xytext=(15, 96),
                arrowprops=dict(arrowstyle='->', color='green', lw=2))
    ax.text(15, 95, 'Support\nRespected', ha='center', fontsize=9, color='green')
    
    # Phase 2: Break
    ax.axvline(x=32, color='red', linestyle=':', alpha=0.5)
    ax.scatter([32], [price[32]], color='red', s=150, zorder=5, marker='v')
    ax.text(32, price[32]+3, 'BREAK\n(t₀)', ha='center', fontsize=10, fontweight='bold', color='red')
    
    # Break confirmation zone
    ax.fill_between([30, 35], [support_level - 2, support_level - 2], 
                    [support_level, support_level], alpha=0.3, color='red',
                    label='Break Confirmation Zone (βc × ATR)')
    
    # Phase 3: Retest
    ax.axvline(x=47, color='orange', linestyle=':', alpha=0.5)
    ax.scatter([47], [price[47]], color='orange', s=150, zorder=5, marker='o')
    ax.text(47, price[47]+3, 'RETEST', ha='center', fontsize=10, fontweight='bold', color='orange')
    
    # Retest zone
    ax.fill_between([44, 52], [support_level - 1, support_level - 1],
                    [support_level + 1, support_level + 1], alpha=0.2, color='orange',
                    label='Retest Zone (γ × ATR)')
    
    # Phase 4: Rejection entry
    ax.scatter([52], [price[52]], color='purple', s=200, zorder=5, marker='*')
    ax.text(52, price[52]-4, 'REJECTION\n(Entry)', ha='center', fontsize=10, 
            fontweight='bold', color='purple')
    
    # Draw stop loss and target
    entry_price = price[52]
    stop_loss = safety_level + 0.5
    target = entry_price - (stop_loss - entry_price)
    
    ax.axhline(y=stop_loss, color='red', linestyle='-.', linewidth=1.5, alpha=0.7)
    ax.text(75, stop_loss+0.5, 'Stop Loss\n(Safety + buffer)', fontsize=8, color='red')
    
    ax.axhline(y=target, color='green', linestyle='-.', linewidth=1.5, alpha=0.7)
    ax.text(75, target-1.5, 'Target (1R)', fontsize=8, color='green')
    
    # Time window annotation
    ax.annotate('', xy=(32, 105), xytext=(44, 105),
                arrowprops=dict(arrowstyle='<->', color='gray', lw=1.5))
    ax.text(38, 106, 'M bars\n(Retest Window)', ha='center', fontsize=8, color='gray')
    
    ax.set_xlabel('Time (bars)')
    ax.set_ylabel('Price')
    ax.set_title('Figure 2: Break → Retest → Rejection Sequence with Frozen Lines', fontweight='bold')
    ax.legend(loc='upper right', fontsize=9)
    ax.set_xlim(0, n)
    ax.set_ylim(85, 110)
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures/fig2_break_retest_sequence.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 2 saved.")

# =============================================================================
# Figure 3: Regime Classification
# =============================================================================
def create_regime_figure():
    fig, axes = plt.subplots(1, 3, figsize=(15, 5))
    
    np.random.seed(456)
    n = 100
    t = np.arange(n)
    
    # Trend regime
    ax1 = axes[0]
    trend_price = 100 + 0.5 * t + np.cumsum(np.random.randn(n) * 0.3)
    ax1.plot(t, trend_price, 'b-', linewidth=1.5)
    ax1.fill_between(t, trend_price-2, trend_price+2, alpha=0.2)
    midline = 100 + 0.5 * t
    ax1.plot(t, midline, 'k--', linewidth=1, label='Midline')
    ax1.set_title('TREND Regime\nHigh ER, Low Crossings', fontweight='bold', color='green')
    ax1.set_xlabel('Time')
    ax1.set_ylabel('Price')
    ax1.text(50, 105, 'ER ≥ 0.35\nCrossings ≤ 8', ha='center', fontsize=10,
             bbox=dict(boxstyle='round', facecolor='lightgreen', alpha=0.8))
    ax1.legend(loc='upper left')
    
    # Range regime
    ax2 = axes[1]
    range_price = 100 + 5 * np.sin(t / 5) + np.random.randn(n) * 1.5
    ax2.plot(t, range_price, 'b-', linewidth=1.5)
    ax2.fill_between(t, range_price-2, range_price+2, alpha=0.2)
    ax2.axhline(y=100, color='k', linestyle='--', linewidth=1, label='Midline')
    ax2.set_title('RANGE Regime\nLow ER, High Crossings', fontweight='bold', color='red')
    ax2.set_xlabel('Time')
    ax2.text(50, 108, 'ER ≤ 0.20\nOR Crossings ≥ 20', ha='center', fontsize=10,
             bbox=dict(boxstyle='round', facecolor='lightcoral', alpha=0.8))
    ax2.legend(loc='upper left')
    
    # Transition regime
    ax3 = axes[2]
    trans_price = np.concatenate([
        100 + 3 * np.sin(t[:40] / 5) + np.random.randn(40) * 0.8,
        100 + 0.3 * (t[40:] - 40) + np.random.randn(60) * 0.5
    ])
    ax3.plot(t, trans_price, 'b-', linewidth=1.5)
    ax3.fill_between(t, trans_price-2, trans_price+2, alpha=0.2)
    ax3.axhline(y=100, color='k', linestyle='--', linewidth=1, label='Midline')
    ax3.axvline(x=40, color='orange', linestyle=':', linewidth=2, alpha=0.7)
    ax3.set_title('TRANSITION Regime\n(Best for Break-Retest)', fontweight='bold', color='orange')
    ax3.set_xlabel('Time')
    ax3.text(50, 112, 'Neither Trend\nnor Range', ha='center', fontsize=10,
             bbox=dict(boxstyle='round', facecolor='lightyellow', alpha=0.8))
    ax3.legend(loc='upper left')
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures/fig3_regime_classification.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 3 saved.")

# =============================================================================
# Figure 4: Hybrid Trailing Stop Mechanism
# =============================================================================
def create_trailing_stop_figure():
    fig, ax = plt.subplots(figsize=(14, 8))
    
    np.random.seed(789)
    n = 60
    t = np.arange(n)
    
    # Create winning trade price movement
    entry = 100
    price = np.concatenate([
        [entry],
        entry + np.cumsum(np.random.randn(20) * 0.3 + 0.15),  # Initial move up
        entry + 3 + np.cumsum(np.random.randn(20) * 0.4 + 0.1),  # Continued move
        entry + 6 + np.cumsum(np.random.randn(19) * 0.5 + 0.05)  # Final phase
    ])
    
    # Ensure upward trend with pullbacks
    for i in range(1, len(price)):
        if price[i] < price[i-1] - 1:
            price[i] = price[i-1] - 0.5
    
    ax.plot(t, price, 'b-', linewidth=2, label='Price')
    
    # Entry point
    entry_bar = 5
    entry_price = price[entry_bar]
    initial_stop = entry_price - 3
    risk = entry_price - initial_stop
    
    ax.scatter([entry_bar], [entry_price], color='green', s=200, zorder=5, marker='^')
    ax.text(entry_bar, entry_price-1.5, 'ENTRY', ha='center', fontweight='bold', color='green')
    
    # Phase 1: Initial stop (Safety Line based)
    ax.hlines(y=initial_stop, xmin=entry_bar, xmax=15, colors='red', linestyles='-', 
              linewidth=2, label='Phase 1: Initial Stop (Safety Line)')
    
    # Phase 2: Break-even at 0.8R
    be_trigger_bar = 15
    be_price = entry_price + 0.8 * risk
    be_stop = entry_price + 0.1  # Small buffer above entry
    
    ax.scatter([be_trigger_bar], [price[be_trigger_bar]], color='orange', s=150, zorder=5)
    ax.text(be_trigger_bar, price[be_trigger_bar]+1, '+0.8R\n(BE Trigger)', 
            ha='center', fontsize=9, color='orange')
    ax.hlines(y=be_stop, xmin=be_trigger_bar, xmax=25, colors='orange', linestyles='-',
              linewidth=2, label='Phase 2: Break-Even Stop')
    
    # Phase 3: Partial at 1R
    partial_bar = 22
    partial_price = entry_price + 1.0 * risk
    
    ax.scatter([partial_bar], [price[partial_bar]], color='purple', s=150, zorder=5, marker='s')
    ax.text(partial_bar, price[partial_bar]+1.5, '+1.0R\n(60% Partial)', 
            ha='center', fontsize=9, color='purple')
    
    # Phase 4: Pivot trailing
    # Simulate pivot lows
    pivot_bars = [28, 38, 48]
    pivot_prices = [price[b] - 0.5 for b in pivot_bars]
    
    trail_stop = be_stop
    trail_x = [25]
    trail_y = [be_stop]
    
    for pb, pp in zip(pivot_bars, pivot_prices):
        new_stop = pp - 0.5  # Buffer below pivot
        if new_stop > trail_stop:
            trail_x.extend([pb, pb])
            trail_y.extend([trail_stop, new_stop])
            trail_stop = new_stop
    
    trail_x.append(n-1)
    trail_y.append(trail_stop)
    
    ax.plot(trail_x, trail_y, 'g-', linewidth=2, label='Phase 3: Pivot Trailing Stop')
    
    # Mark pivot lows
    for pb, pp in zip(pivot_bars, pivot_prices):
        ax.scatter([pb], [pp], color='green', s=100, zorder=5, marker='^')
        ax.text(pb, pp-1.5, 'PL', ha='center', fontsize=8, color='green')
    
    # Add R-multiple scale on right
    ax2 = ax.twinx()
    ax2.set_ylim((ax.get_ylim()[0] - entry_price) / risk, (ax.get_ylim()[1] - entry_price) / risk)
    ax2.set_ylabel('R-Multiple', color='gray')
    ax2.tick_params(axis='y', labelcolor='gray')
    
    # Annotations
    ax.axhline(y=entry_price, color='gray', linestyle=':', alpha=0.5)
    ax.text(2, entry_price+0.3, 'Entry Price', fontsize=8, color='gray')
    
    ax.set_xlabel('Time (bars after entry)')
    ax.set_ylabel('Price')
    ax.set_title('Figure 4: Hybrid Trailing Stop Mechanism', fontweight='bold')
    ax.legend(loc='upper left', fontsize=9)
    ax.set_xlim(0, n)
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures/fig4_trailing_stop.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 4 saved.")

# =============================================================================
# Figure 5: State Machine Diagram
# =============================================================================
def create_state_machine_figure():
    fig, ax = plt.subplots(figsize=(14, 10))
    ax.set_xlim(0, 14)
    ax.set_ylim(0, 10)
    ax.axis('off')
    
    # State boxes
    states = {
        'IDLE': (2, 7, 'lightblue'),
        'BREAK\nDETECTED': (7, 7, 'lightyellow'),
        'WAIT\nRETEST': (7, 4, 'lightyellow'),
        'IN TRADE': (12, 4, 'lightgreen'),
        'FAILED': (2, 4, 'lightcoral'),
        'TIMEOUT': (2, 1, 'lightgray')
    }
    
    for state, (x, y, color) in states.items():
        box = FancyBboxPatch((x-1.2, y-0.7), 2.4, 1.4,
                             boxstyle="round,pad=0.1",
                             facecolor=color, edgecolor='black', linewidth=2)
        ax.add_patch(box)
        ax.text(x, y, state, ha='center', va='center', fontsize=11, fontweight='bold')
    
    # Arrows with labels
    arrows = [
        ((3.2, 7), (5.8, 7), 'Break Detected\n(penetration + confirmation)'),
        ((7, 6.3), (7, 4.7), 'Freeze\nAction/Safety Lines'),
        ((8.2, 4), (10.8, 4), 'Retest +\nRejection'),
        ((5.8, 4), (3.2, 4), 'Break Fails\n(close back inside)'),
        ((5.8, 3.5), (3.2, 1.5), 'M bars elapsed\n(no retest)'),
        ((2, 5.3), (2, 6.3), 'Reset'),
        ((2, 2.3), (2, 3.3), 'Reset'),
        ((12, 3.3), (12, 2), ''),
        ((11, 2), (3.2, 2), 'Trade Closed\n(TP/SL/Time)'),
    ]
    
    for (x1, y1), (x2, y2), label in arrows:
        ax.annotate('', xy=(x2, y2), xytext=(x1, y1),
                   arrowprops=dict(arrowstyle='->', color='black', lw=1.5))
        mid_x, mid_y = (x1 + x2) / 2, (y1 + y2) / 2
        if label:
            ax.text(mid_x, mid_y + 0.3, label, ha='center', va='bottom', fontsize=9,
                   bbox=dict(boxstyle='round', facecolor='white', alpha=0.8))
    
    # Title
    ax.text(7, 9.5, 'Figure 5: State Machine for Break-Retest Event Detection',
            ha='center', fontsize=14, fontweight='bold')
    
    # Legend
    legend_items = [
        ('lightblue', 'Idle State'),
        ('lightyellow', 'Setup Detection'),
        ('lightgreen', 'Active Trade'),
        ('lightcoral', 'Setup Failed'),
        ('lightgray', 'Timeout')
    ]
    
    for i, (color, label) in enumerate(legend_items):
        ax.add_patch(plt.Rectangle((10.5, 8.5 - i*0.5), 0.3, 0.3, facecolor=color, edgecolor='black'))
        ax.text(11, 8.65 - i*0.5, label, fontsize=9, va='center')
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures/fig5_state_machine.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 5 saved.")

# =============================================================================
# Figure 6: Q-Score Distribution and Quality Gating
# =============================================================================
def create_qscore_figure():
    fig, axes = plt.subplots(1, 2, figsize=(14, 6))
    
    # Left: Sigmoid transformation
    ax1 = axes[0]
    x = np.linspace(-5, 5, 100)
    y = 1 / (1 + np.exp(-x))
    
    ax1.plot(x, y, 'b-', linewidth=2)
    ax1.axhline(y=0.5, color='gray', linestyle='--', alpha=0.5)
    ax1.axhline(y=0.7, color='green', linestyle='--', alpha=0.7, label='A-Grade Threshold (Q ≥ 0.70)')
    ax1.axhline(y=0.6, color='orange', linestyle='--', alpha=0.7, label='B-Grade Threshold (Q ≥ 0.60)')
    ax1.axvline(x=0, color='gray', linestyle='--', alpha=0.5)
    
    ax1.fill_between(x, y, 0.7, where=(y >= 0.7), alpha=0.3, color='green', label='A-Grade Zone')
    ax1.fill_between(x, y, 0.6, where=((y >= 0.6) & (y < 0.7)), alpha=0.3, color='orange', label='B-Grade Zone')
    
    ax1.set_xlabel('Raw Score (Touch Reward - Violation Penalty + Span Reward)')
    ax1.set_ylabel('Q-Score (Normalized)')
    ax1.set_title('Sigmoid Transformation: Raw Score → Q-Score', fontweight='bold')
    ax1.legend(loc='lower right', fontsize=9)
    ax1.set_xlim(-5, 5)
    ax1.set_ylim(0, 1)
    ax1.grid(True, alpha=0.3)
    
    # Right: Example Q-Score distribution
    ax2 = axes[1]
    np.random.seed(42)
    
    # Simulate Q-scores from different line qualities
    q_scores = np.concatenate([
        np.random.beta(2, 5, 100) * 0.5,  # Low quality lines
        np.random.beta(5, 3, 150) * 0.4 + 0.4,  # Medium quality
        np.random.beta(8, 2, 80) * 0.3 + 0.7  # High quality
    ])
    
    ax2.hist(q_scores, bins=30, edgecolor='black', alpha=0.7, color='steelblue')
    ax2.axvline(x=0.70, color='green', linestyle='--', linewidth=2, label='A-Grade (Q ≥ 0.70)')
    ax2.axvline(x=0.60, color='orange', linestyle='--', linewidth=2, label='B-Grade (Q ≥ 0.60)')
    
    # Shade regions
    ax2.axvspan(0.70, 1.0, alpha=0.2, color='green')
    ax2.axvspan(0.60, 0.70, alpha=0.2, color='orange')
    ax2.axvspan(0, 0.60, alpha=0.1, color='red')
    
    ax2.text(0.85, ax2.get_ylim()[1]*0.9, 'A-Grade\n(Full Risk)', ha='center', fontsize=10, color='green')
    ax2.text(0.65, ax2.get_ylim()[1]*0.9, 'B-Grade\n(Half Risk)', ha='center', fontsize=10, color='orange')
    ax2.text(0.30, ax2.get_ylim()[1]*0.9, 'Skip\n(No Trade)', ha='center', fontsize=10, color='red')
    
    ax2.set_xlabel('Q-Score')
    ax2.set_ylabel('Frequency')
    ax2.set_title('Q-Score Distribution with Quality Gates', fontweight='bold')
    ax2.legend(loc='upper left', fontsize=9)
    ax2.set_xlim(0, 1)
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures/fig6_qscore.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 6 saved.")

# =============================================================================
# Figure 7: AI Agent Architecture
# =============================================================================
def create_ai_agent_figure():
    fig, ax = plt.subplots(figsize=(16, 12))
    ax.set_xlim(0, 16)
    ax.set_ylim(0, 12)
    ax.axis('off')
    
    # Main components
    components = {
        'Market Data\nIngestion': (2, 10, 2.5, 1.2, 'lightcyan'),
        'Structure\nAnalysis Agent': (6, 10, 2.5, 1.2, 'lightyellow'),
        'Regime\nClassification': (10, 10, 2.5, 1.2, 'lightyellow'),
        'Signal\nGeneration': (14, 10, 2.5, 1.2, 'lightgreen'),
        
        'Risk\nManagement Agent': (4, 7, 2.5, 1.2, 'lightcoral'),
        'Position\nSizing': (8, 7, 2.5, 1.2, 'lightcoral'),
        'Portfolio\nOptimization': (12, 7, 2.5, 1.2, 'lightcoral'),
        
        'Execution\nAgent': (4, 4, 2.5, 1.2, 'lightblue'),
        'Order\nManagement': (8, 4, 2.5, 1.2, 'lightblue'),
        'Trade\nMonitoring': (12, 4, 2.5, 1.2, 'lightblue'),
        
        'Learning &\nAdaptation': (8, 1, 2.5, 1.2, 'plum'),
    }
    
    for name, (x, y, w, h, color) in components.items():
        box = FancyBboxPatch((x-w/2, y-h/2), w, h,
                             boxstyle="round,pad=0.05",
                             facecolor=color, edgecolor='black', linewidth=1.5)
        ax.add_patch(box)
        ax.text(x, y, name, ha='center', va='center', fontsize=9, fontweight='bold')
    
    # Layer labels
    ax.text(0.5, 10, 'Analysis\nLayer', ha='center', va='center', fontsize=10, 
            fontweight='bold', rotation=90)
    ax.text(0.5, 7, 'Risk\nLayer', ha='center', va='center', fontsize=10,
            fontweight='bold', rotation=90)
    ax.text(0.5, 4, 'Execution\nLayer', ha='center', va='center', fontsize=10,
            fontweight='bold', rotation=90)
    ax.text(0.5, 1, 'Learning\nLayer', ha='center', va='center', fontsize=10,
            fontweight='bold', rotation=90)
    
    # Arrows (simplified)
    arrow_style = dict(arrowstyle='->', color='gray', lw=1.5)
    
    # Horizontal flow in analysis layer
    ax.annotate('', xy=(4.75, 10), xytext=(3.25, 10), arrowprops=arrow_style)
    ax.annotate('', xy=(8.75, 10), xytext=(7.25, 10), arrowprops=arrow_style)
    ax.annotate('', xy=(12.75, 10), xytext=(11.25, 10), arrowprops=arrow_style)
    
    # Vertical flows
    ax.annotate('', xy=(6, 8.4), xytext=(6, 9.4), arrowprops=arrow_style)
    ax.annotate('', xy=(10, 8.4), xytext=(10, 9.4), arrowprops=arrow_style)
    ax.annotate('', xy=(14, 8.4), xytext=(14, 9.4), arrowprops=arrow_style)
    
    ax.annotate('', xy=(4, 5.4), xytext=(4, 6.4), arrowprops=arrow_style)
    ax.annotate('', xy=(8, 5.4), xytext=(8, 6.4), arrowprops=arrow_style)
    ax.annotate('', xy=(12, 5.4), xytext=(12, 6.4), arrowprops=arrow_style)
    
    # Feedback to learning
    ax.annotate('', xy=(8, 2.2), xytext=(8, 3.4), arrowprops=dict(arrowstyle='->', color='purple', lw=1.5))
    ax.annotate('', xy=(4, 2.5), xytext=(6.75, 1), arrowprops=dict(arrowstyle='<-', color='purple', lw=1.5, connectionstyle='arc3,rad=0.3'))
    ax.annotate('', xy=(12, 2.5), xytext=(9.25, 1), arrowprops=dict(arrowstyle='<-', color='purple', lw=1.5, connectionstyle='arc3,rad=-0.3'))
    
    # Title
    ax.text(8, 11.5, 'Figure 7: Autonomous AI Trading Agent Architecture',
            ha='center', fontsize=14, fontweight='bold')
    
    # External connections
    ax.text(2, 11.5, '📊 Exchange APIs\nWebSocket Feeds', ha='center', fontsize=8, color='gray')
    ax.text(14, 11.5, '📤 Trade Signals\nAlerts', ha='center', fontsize=8, color='gray')
    
    plt.tight_layout()
    plt.savefig('/home/ubuntu/figures/fig7_ai_architecture.png', dpi=150, bbox_inches='tight')
    plt.close()
    print("Figure 7 saved.")

# =============================================================================
# Run all figure generation
# =============================================================================
if __name__ == "__main__":
    print("Generating figures for trading strategy paper...")
    create_trendline_figure()
    create_break_retest_figure()
    create_regime_figure()
    create_trailing_stop_figure()
    create_state_machine_figure()
    create_qscore_figure()
    create_ai_agent_figure()
    print("\nAll figures generated successfully!")
    print("Figures saved to: /home/ubuntu/figures/")
