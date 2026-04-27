"""Smoke tests for the reference formula modules.

Tests lock the shape of the public API and assert basic invariants from the
30 Laws narrative. They are NOT a substitute for canonical clamping: every
consumer must clamp formula outputs by canonical/policy/policy.runtime.yaml#risk.per_trade.hard_max_pct.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import expectancy as exp_mod               # noqa: E402
import position_sizing as sz                # noqa: E402
import risk_of_ruin as ruin                 # noqa: E402


# ---------------------------------------------------------------------------
# Expectancy (Law 16)
# ---------------------------------------------------------------------------

def test_expectancy_positive_system():
    e = exp_mod.calculate_expectancy(wins=55, losses=45, avg_win=2.0, avg_loss=1.0)
    assert e > 0


def test_expectancy_negative_system():
    e = exp_mod.calculate_expectancy(wins=30, losses=70, avg_win=1.5, avg_loss=1.0)
    assert e < 0


def test_expectancy_rejects_zero_total_trades():
    with pytest.raises(ValueError):
        exp_mod.calculate_expectancy(wins=0, losses=0, avg_win=1.0, avg_loss=1.0)


# ---------------------------------------------------------------------------
# Position sizing (Law 21)
# ---------------------------------------------------------------------------

def test_kelly_positive_edge_returns_positive_fraction():
    f = sz.kelly_criterion(win_rate=0.55, avg_win=2.0, avg_loss=1.0)
    assert 0 < f < 1


def test_kelly_negative_edge_returns_nonpositive():
    f = sz.kelly_criterion(win_rate=0.30, avg_win=1.5, avg_loss=1.0)
    assert f <= 0


def test_fractional_kelly_is_contraction_of_full_kelly():
    full = sz.kelly_criterion(win_rate=0.60, avg_win=2.0, avg_loss=1.0)
    frac = sz.fractional_kelly(win_rate=0.60, avg_win=2.0, avg_loss=1.0, fraction=0.25)
    assert 0 < frac <= full


def test_fractional_kelly_clamps_under_canonical_hard_max():
    """Demonstrates the clamp pattern every consumer must implement."""
    CANONICAL_HARD_MAX_PCT = 0.01   # from canonical/policy/policy.runtime.yaml
    raw = sz.fractional_kelly(win_rate=0.70, avg_win=3.0, avg_loss=1.0, fraction=0.25)
    clamped = min(raw, CANONICAL_HARD_MAX_PCT)
    assert clamped <= CANONICAL_HARD_MAX_PCT


# ---------------------------------------------------------------------------
# Risk of ruin (Law 29)
# ---------------------------------------------------------------------------

def test_ruin_probability_in_unit_interval():
    p = ruin.probability_of_ruin(win_rate=0.55, payoff_ratio=2.0, risk_per_trade=0.01)
    assert 0.0 <= p <= 1.0


def test_ruin_probability_increases_with_risk_per_trade():
    p_low = ruin.probability_of_ruin(win_rate=0.55, payoff_ratio=2.0, risk_per_trade=0.005)
    p_high = ruin.probability_of_ruin(win_rate=0.55, payoff_ratio=2.0, risk_per_trade=0.05)
    assert p_high >= p_low


def test_ruin_probability_rejects_win_rate_out_of_range():
    with pytest.raises(ValueError):
        ruin.probability_of_ruin(win_rate=1.5, payoff_ratio=2.0, risk_per_trade=0.01)
