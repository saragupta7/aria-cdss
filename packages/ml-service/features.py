"""
Real-time feature engineering for HemoAlert inference.

This mirrors the offline feature engineering in the HemoAlert training
pipeline so the features a live patient is scored
on are computed the exact same way the model was trained on. If you change
anything here, make the matching change in the training notebook — a
mismatch here is a silent train/serve skew bug, not a crash.

Simplification: the live vitals simulation (vitalsEngine.js) appends one
reading per tick (every 60s in dev), while training data was resampled to
one row per hour. Rather than requiring real wall-clock hours between
readings, each stored reading is treated as one "timestep" — the same unit
the model was trained on (hourly resampled MIMIC-IV data). This keeps the
demo responsive without retraining a second time-scale model.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

import numpy as np

ROLLING_WINDOW = 6  # timesteps, matches training's 6h rolling window
LAG_STEPS = (1, 2, 3)

VASOPRESSOR_AGENTS = {
    "norepinephrine",
    "epinephrine",
    "vasopressin",
    "phenylephrine",
    "dopamine",
}

# Internal feature name -> (display label, unit) used to render SHAP output
# in the same shape the frontend's heuristic fallback already produces.
FEATURE_DISPLAY = {
    "map": ("MAP", "mmHg"),
    "heart_rate": ("Heart Rate", "bpm"),
    "resp_rate": ("Resp Rate", "/min"),
    "spo2": ("SpO2", "%"),
    "sbp": ("SBP", "mmHg"),
    "dbp": ("DBP", "mmHg"),
    "temp_f": ("Temperature", "°F"),
    "lactate": ("Lactate", "mmol/L"),
    "creatinine": ("Creatinine", "mg/dL"),
    "bicarbonate": ("Bicarbonate", "mEq/L"),
    "bun": ("BUN", "mg/dL"),
    "vasopressor_on": ("Vasopressor", "on/off"),
    "map_slope": ("MAP Trend", "mmHg/h"),
    "hr_slope": ("HR Trend", "bpm/h"),
    "spo2_slope": ("SpO2 Trend", "%/h"),
    "shock_index": ("Shock Index", "ratio"),
    "pulse_pressure": ("Pulse Pressure", "mmHg"),
    "hr_map_product": ("HR×MAP", ""),
    "compensation_signal": ("Compensation Signal", ""),
    "vaso_weaning": ("Vasopressor Weaning", ""),
    "hours_in_icu": ("Time in ICU", "h"),
}


def _to_fahrenheit(celsius: float | None) -> float | None:
    if celsius is None:
        return None
    return celsius * 9 / 5 + 32


def _compute_map(sbp: float | None, dbp: float | None) -> float | None:
    if sbp is None or dbp is None:
        return None
    return dbp + (sbp - dbp) / 3


def _slope(values: list[float | None]) -> float | None:
    """Linear slope over the trailing window, ignoring missing points."""
    pairs = [(i, v) for i, v in enumerate(values) if v is not None]
    if len(pairs) < 3:
        return None
    xs = np.array([p[0] for p in pairs], dtype=float)
    ys = np.array([p[1] for p in pairs], dtype=float)
    return float(np.polyfit(xs, ys, 1)[0])


def _mean(values: list[float | None]) -> float | None:
    present = [v for v in values if v is not None]
    return float(np.mean(present)) if present else None


def _std(values: list[float | None]) -> float | None:
    present = [v for v in values if v is not None]
    return float(np.std(present)) if len(present) >= 2 else None


def _lag(values: list[float | None], steps_back: int) -> float | None:
    idx = len(values) - 1 - steps_back
    if idx < 0:
        return None
    return values[idx]


def _normalize_reading(reading: dict[str, Any]) -> dict[str, Any]:
    """Map a Patient.vitals sub-document (camelCase, Celsius) onto the
    training feature namespace (snake_case, Fahrenheit)."""
    sbp = reading.get("bloodPressureSystolic")
    dbp = reading.get("bloodPressureDiastolic")
    return {
        "sbp": sbp,
        "dbp": dbp,
        "map": _compute_map(sbp, dbp),
        "heart_rate": reading.get("heartRate"),
        "resp_rate": reading.get("respiratoryRate"),
        "spo2": reading.get("oxygenSaturation"),
        "temp_f": _to_fahrenheit(reading.get("temperature")),
        "lactate": reading.get("lactate"),
        "creatinine": reading.get("creatinine"),
        "bicarbonate": reading.get("bicarbonate"),
        "bun": reading.get("bun"),
        "vasopressor_on": 1 if reading.get("vasopressorOn") else 0,
        "timestamp": reading.get("timestamp"),
    }


def build_feature_row(
    vitals_history: list[dict[str, Any]],
    admission_date: str | None,
    feature_cols: list[str],
) -> dict[str, float]:
    """Build one row of model features from a patient's vitals history.

    `vitals_history` must be ordered oldest -> newest (how Mongoose arrays
    are pushed to in vitalsEngine.js). Only the trailing ROLLING_WINDOW
    readings are used for rolling/slope features; lag features look back
    up to `max(LAG_STEPS)` readings.
    """
    if not vitals_history:
        return {col: 0.0 for col in feature_cols}

    normalized = [_normalize_reading(r) for r in vitals_history]
    window = normalized[-ROLLING_WINDOW:]
    latest = normalized[-1]

    series = {
        key: [r[key] for r in window]
        for key in ("map", "heart_rate", "spo2", "resp_rate", "sbp", "dbp")
    }
    full_series = {
        key: [r[key] for r in normalized]
        for key in ("map", "heart_rate", "lactate", "creatinine")
    }

    features: dict[str, float | None] = {
        "map": latest["map"],
        "sbp": latest["sbp"],
        "dbp": latest["dbp"],
        "heart_rate": latest["heart_rate"],
        "resp_rate": latest["resp_rate"],
        "spo2": latest["spo2"],
        "temp_f": latest["temp_f"],
        "lactate": latest["lactate"],
        "creatinine": latest["creatinine"],
        "bicarbonate": latest["bicarbonate"],
        "bun": latest["bun"],
        "vasopressor_on": latest["vasopressor_on"],
        "map_slope": _slope(series["map"]),
        "hr_slope": _slope(series["heart_rate"]),
        "spo2_slope": _slope(series["spo2"]),
    }

    for col in ("map", "heart_rate", "spo2", "resp_rate", "sbp", "dbp"):
        features[f"{col}_mean6h"] = _mean(series[col])
        features[f"{col}_std6h"] = _std(series[col])

    for col in ("map", "heart_rate", "lactate", "creatinine"):
        for step in LAG_STEPS:
            features[f"{col}_lag{step}"] = _lag(full_series[col], step)

    sbp = latest["sbp"] or 0
    hr = latest["heart_rate"] or 0
    features["shock_index"] = (hr / sbp) if sbp else None
    features["pulse_pressure"] = (
        (latest["sbp"] - latest["dbp"])
        if latest["sbp"] is not None and latest["dbp"] is not None
        else None
    )
    features["hr_map_product"] = (
        latest["heart_rate"] * latest["map"]
        if latest["heart_rate"] is not None and latest["map"] is not None
        else None
    )
    features["compensation_signal"] = (
        features["hr_slope"] - features["map_slope"]
        if features["hr_slope"] is not None and features["map_slope"] is not None
        else None
    )

    prev_vaso = normalized[-2]["vasopressor_on"] if len(normalized) >= 2 else 0
    features["vaso_weaning"] = max(0, prev_vaso - latest["vasopressor_on"])

    if admission_date and latest["timestamp"]:
        try:
            admit = datetime.fromisoformat(str(admission_date).replace("Z", "+00:00"))
            now = datetime.fromisoformat(str(latest["timestamp"]).replace("Z", "+00:00"))
            features["hours_in_icu"] = (now - admit).total_seconds() / 3600
        except ValueError:
            features["hours_in_icu"] = None
    else:
        features["hours_in_icu"] = None

    # Align to the exact column order/set the model was trained on, filling
    # anything missing with 0 (mirrors `.fillna(0)` at training time).
    return {col: float(features.get(col) or 0.0) for col in feature_cols}


def format_shap_values(
    shap_row: np.ndarray,
    feature_row: dict[str, float],
    feature_cols: list[str],
    top_n: int = 6,
) -> list[dict[str, Any]]:
    """Turn raw SHAP contributions into the {feature, value, impact} shape
    the frontend already renders (see SHAPFeature in packages/shared)."""
    total_abs = float(np.sum(np.abs(shap_row))) or 1.0
    ranked = sorted(
        zip(feature_cols, shap_row.tolist()),
        key=lambda pair: abs(pair[1]),
        reverse=True,
    )[:top_n]

    out = []
    for name, contribution in ranked:
        label, unit = FEATURE_DISPLAY.get(name, (name, ""))
        raw_value = feature_row.get(name, 0.0)
        if name == "vasopressor_on":
            display_value = "Running" if raw_value else "Off"
        else:
            display_value = f"{raw_value:.1f}{(' ' + unit) if unit else ''}".strip()
        out.append({
            "feature": label,
            "value": display_value,
            "impact": round(abs(contribution) / total_abs * 100, 1),
        })
    return out
