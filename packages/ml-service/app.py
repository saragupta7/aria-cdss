"""
HemoAlert inference service.

Loads the model artifacts produced by the HemoAlert training pipeline
and exposes them over HTTP so the Node/Express backend
(packages/backend) can score patients without needing a Python runtime
in-process. Called from packages/backend/src/services/vitalsEngine.js.

If no trained model is present in MODEL_DIR, the service still starts —
/health reports it, and /predict returns 503 — so the rest of the CDSS
(including its own mock-formula risk scoring fallback) keeps working
while you're still training the model in Colab/Kaggle.
"""

import json
import os
from pathlib import Path
from typing import Any, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from features import build_feature_row, format_shap_values

MODEL_DIR = Path(os.environ.get("MODEL_DIR", Path(__file__).parent / "model"))

app = FastAPI(title="HemoAlert ML Service", version="1.0.0")

_state: dict[str, Any] = {
    "model": None,
    "raw_model": None,
    "explainer": None,
    "feature_cols": None,
    "metadata": None,
}


def _try_load_model() -> None:
    try:
        model_path = MODEL_DIR / "xgb_calibrated.pkl"
        cols_path = MODEL_DIR / "feature_cols.csv"
        meta_path = MODEL_DIR / "metadata.json"

        if not (model_path.exists() and cols_path.exists()):
            return

        model = joblib.load(model_path)
        feature_cols = pd.read_csv(cols_path).iloc[:, 0].tolist()
        metadata = json.loads(meta_path.read_text()) if meta_path.exists() else {}

        # SHAP needs the raw booster, not the calibration wrapper — same
        # unwrap the training pipeline's Streamlit app does (Phase 6).
        raw_model = model.calibrated_classifiers_[0].estimator
        import shap  # local import: heavy, only needed once a model exists

        explainer = shap.TreeExplainer(raw_model)

        _state.update(
            model=model,
            raw_model=raw_model,
            explainer=explainer,
            feature_cols=feature_cols,
            metadata=metadata,
        )
        print(f"[ml-service] Model loaded from {MODEL_DIR} ({len(feature_cols)} features)")
    except Exception as exc:  # model dir may contain partial/corrupt artifacts
        print(f"[ml-service] Failed to load model from {MODEL_DIR}: {exc}")


@app.on_event("startup")
def on_startup() -> None:
    _try_load_model()


class VitalsReading(BaseModel):
    timestamp: str
    heartRate: Optional[float] = None
    bloodPressureSystolic: Optional[float] = None
    bloodPressureDiastolic: Optional[float] = None
    temperature: Optional[float] = None
    respiratoryRate: Optional[float] = None
    oxygenSaturation: Optional[float] = None
    lactate: Optional[float] = None
    creatinine: Optional[float] = None
    bicarbonate: Optional[float] = None
    bun: Optional[float] = None
    vasopressorOn: Optional[bool] = False


class PredictRequest(BaseModel):
    admissionDate: Optional[str] = None
    vitalsHistory: list[VitalsReading]


def _risk_level(score: float) -> str:
    # Band relative to the model's operating threshold (metadata.json,
    # chosen by the training pipeline). Scores are calibrated probabilities
    # of a rare event, so they cluster well below the 0.4/0.6/0.8 bands the
    # backend heuristic uses — on that absolute scale the trained model
    # could never raise a high/critical alert.
    threshold = (_state["metadata"] or {}).get("threshold")
    if not threshold:
        # No operating threshold recorded — fall back to the heuristic-scale
        # bands (Patient.updateRiskLevel() in packages/backend/src/models/Patient.js).
        if score >= 0.8:
            return "critical"
        if score >= 0.6:
            return "high"
        if score >= 0.4:
            return "medium"
        return "low"

    if score >= min(3 * threshold, 0.8):
        return "critical"
    if score >= threshold:
        return "high"
    if score >= threshold / 2:
        return "medium"
    return "low"


@app.get("/health")
def health() -> dict[str, Any]:
    return {
        "status": "ok",
        "modelLoaded": _state["model"] is not None,
        "featureCount": len(_state["feature_cols"]) if _state["feature_cols"] else 0,
        "metadata": _state["metadata"],
    }


@app.post("/predict")
def predict(req: PredictRequest) -> dict[str, Any]:
    if _state["model"] is None:
        raise HTTPException(
            status_code=503,
            detail=(
                "No trained model loaded. Run the HemoAlert training pipeline "
                f"and drop its output into {MODEL_DIR}."
            ),
        )
    if not req.vitalsHistory:
        raise HTTPException(status_code=400, detail="vitalsHistory must not be empty")

    feature_cols = _state["feature_cols"]
    history = [r.model_dump() for r in req.vitalsHistory]
    feature_row = build_feature_row(history, req.admissionDate, feature_cols)

    X = pd.DataFrame([feature_row])[feature_cols]
    risk_score = float(_state["model"].predict_proba(X)[0][1])

    shap_row = _state["explainer"].shap_values(X)[0]
    shap_values = format_shap_values(np.asarray(shap_row), feature_row, feature_cols)

    return {
        "riskScore": round(risk_score, 4),
        "riskLevel": _risk_level(risk_score),
        "shapValues": shap_values,
    }
