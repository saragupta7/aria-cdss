# ml-service

FastAPI microservice that serves the HemoAlert risk model to the rest of the
CDSS. The Node/Express backend (`packages/backend`) calls this over HTTP from
`src/services/vitalsEngine.js` on every simulation tick; if this service is
unreachable or has no model loaded, the backend falls back to its built-in
heuristic risk formula automatically — nothing else in the app breaks.

Training happens separately, in Colab/Kaggle against MIMIC-IV. This directory
is just the serving side.

## Setup

```bash
cd packages/ml-service
python -m venv .venv
source .venv/bin/activate   # .venv\Scripts\activate on Windows
pip install -r requirements.txt
cp .env.example .env
```

## Running

```bash
uvicorn app:app --reload --port 8000
```

Or from the repo root: `pnpm dev:ml` (see root `package.json`).

## Docker

```bash
docker build -t aria-ml .
docker run -p 8000:8000 aria-ml
```

The `Dockerfile`'s `COPY . .` bakes whatever is in `model/` into the image —
put the trained artifacts there **before** building (they're produced offline
and git-ignored, so a fresh clone builds an image with no model: `/health`
reports `modelLoaded: false` and `/predict` returns 503 until you rebuild
with artifacts present, while the backend serves its labeled heuristic
fallback in the meantime).

## Providing a trained model

`/predict` returns `503` until real model artifacts exist. Run the offline
training pipeline, then copy its output into `model/`:

```
model/
  xgb_calibrated.pkl     # CalibratedClassifierCV-wrapped XGBoost model
  shap_explainer.pkl     # (optional — a fresh TreeExplainer is derived at
                          #  startup from the calibrated model either way)
  feature_cols.csv       # exact column order the model expects
  metadata.json          # threshold, AUC, lead-time stats (informational)
```

`GET /health` reports whether a model is currently loaded.

## API

### `POST /predict`

```json
{
  "admissionDate": "2026-07-01T08:00:00Z",
  "vitalsHistory": [
    {
      "timestamp": "2026-07-06T10:00:00Z",
      "heartRate": 98,
      "bloodPressureSystolic": 102,
      "bloodPressureDiastolic": 61,
      "temperature": 37.2,
      "respiratoryRate": 20,
      "oxygenSaturation": 94,
      "lactate": 2.1,
      "creatinine": 1.3,
      "bicarbonate": 21,
      "bun": 24,
      "vasopressorOn": false
    }
  ]
}
```

`vitalsHistory` should be ordered oldest → newest — pass the patient's
existing `vitals` array as-is (that's the order Mongoose stores it in).
Only the trailing ~6 readings and lag lookups are used; older history is
ignored, so it's safe to pass the whole array.

Response:

```json
{
  "riskScore": 0.83,
  "riskLevel": "critical",
  "shapValues": [
    { "feature": "MAP", "value": "58.0 mmHg", "impact": 34.2 },
    { "feature": "Lactate", "value": "3.4 mmol/L", "impact": 21.7 }
  ]
}
```

`riskLevel` is banded relative to the model's operating threshold from
`metadata.json` (`high` ≥ threshold, `critical` ≥ 3× threshold capped at 0.8,
`medium` ≥ half the threshold). Calibrated probabilities of a rare event sit
far below the backend heuristic's 0.4/0.6/0.8 scale, so absolute bands would
make high/critical unreachable and silence alerts. If `metadata.json` has no
`threshold`, the heuristic-scale bands (`Patient.updateRiskLevel()` in the
backend) are used as a fallback.
