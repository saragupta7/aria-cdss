# HemoAlert — Complete Pipeline
### MIMIC-IV training → calibrated XGBoost → served into the ARIA CDSS

---

## How this fits into the CDSS

This pipeline has two halves that live in different places:

```
Colab / Kaggle (this document, Phases 1–5)        packages/ (this repo)
──────────────────────────────────────────        ─────────────────────────────
BigQuery → MIMIC-IV cohort extraction              packages/backend  (Node/Express)
Feature engineering (offline, full cohort)           - Patient.js: vitals schema
XGBoost + calibration + SHAP                         - vitalsEngine.js: simulates
                                                        live vitals, calls ml-service
        │                                              every tick, falls back to a
        │  xgb_calibrated.pkl                          mock formula if it's down
        │  feature_cols.csv                          
        │  metadata.json                            packages/ml-service (FastAPI)
        ▼                                              - app.py: POST /predict
   drop into packages/ml-service/model/  ──────────►    - features.py: real-time
                                                          feature engineering,
                                                          same formulas as Phase 4
                                                       packages/frontend (React)
                                                        - PatientDetail.tsx SHAP tab:
                                                          shows patient.riskShap when
                                                          the model has scored them,
                                                          heuristic otherwise
```

The model is trained offline against real MIMIC-IV data (Phases 1–5, unchanged
from the original plan). The CDSS itself never sees MIMIC-IV — it only ever
sees the trained artifacts (`xgb_calibrated.pkl`, `feature_cols.csv`,
`metadata.json`) that Phase 5 produces. Everything from Phase 6 onward is
about serving those artifacts to the app you're actually building.

**Feature set decision:** the CDSS's `Patient` schema and vitals simulator
have been extended to track the full MIMIC feature set this pipeline trains
on — creatinine, bicarbonate, BUN, and vasopressor status are now real
fields on every vitals reading (see `packages/backend/src/models/Patient.js`),
not just training-time-only columns. That means the model trained here can
be served against the live app's data without dropping any features.

---

## Setup checklist
- [x] PhysioNet MIMIC-IV access approved
- [ ] Google Cloud project created (`hemoalert`)
- [ ] BigQuery API enabled
- [ ] Google Colab authenticated
- [ ] Kaggle account created (for LSTM later)
- [ ] Google Drive mounted with folder structure
- [ ] `packages/ml-service` venv created and dependencies installed (`pip install -r requirements.txt`)
- [ ] Trained artifacts copied into `packages/ml-service/model/`
- [ ] `ML_SERVICE_URL` set in `packages/backend/.env` (defaults to `http://localhost:8000`)

---

## Phase 1 — Environment setup

### 1.1 — Google Cloud project
Go to console.cloud.google.com → project dropdown → New Project → name it `hemoalert` → Create.
Make sure `hemoalert` is selected in the top bar before every session.

### 1.2 — Enable BigQuery API
GCP Console → APIs & Services → Library → search "BigQuery API" → Enable.

### 1.3 — Colab: install dependencies
Open colab.research.google.com. Create `hemoalert_01_setup.ipynb`. First cell:

```python
!pip install -q google-cloud-bigquery db-dtypes pandas numpy \
    scikit-learn xgboost shap matplotlib seaborn joblib
```

### 1.4 — Authenticate
```python
from google.colab import auth
auth.authenticate_user()
print("Auth complete")
```
Use the Google account linked to your PhysioNet credential.

### 1.5 — Test BigQuery connection
```python
from google.cloud import bigquery

PROJECT_ID = 'hemoalert'  # your exact GCP project name
client = bigquery.Client(project=PROJECT_ID)

test = client.query("""
    SELECT stay_id, intime, outtime
    FROM `physionet-data.mimiciv_3_1_icu.icustays`
    LIMIT 5
""").to_dataframe()

print(test)
```
If you see 5 rows: you're connected. If permissions error: check PhysioNet profile shows "Credentialed" for MIMIC-IV and the Google account matches.

### 1.6 — Create folder structure in Drive
```python
from google.colab import drive
drive.mount('/content/drive')

import os
base = '/content/drive/MyDrive/hemoalert'
for folder in ['data/raw', 'data/processed', 'models', 'outputs']:
    os.makedirs(f'{base}/{folder}', exist_ok=True)

print("Folders ready")
```

### 1.7 — Set up Kaggle (for LSTM in Phase 5b)
- Go to kaggle.com → Settings → API → Create New Token → download `kaggle.json`
- Later: create a new Kaggle Notebook → Settings → Accelerator → GPU T4 x2
- You only use Kaggle for LSTM training. Everything else stays in Colab.

---

## Phase 2 — Cohort extraction (BigQuery SQL)

Create `hemoalert_02_extraction.ipynb`. Run each section in order. Save every output immediately.

### 2.1 — Base cohort: adult ICU stays ≥ 12 hours
```python
from google.colab import auth, drive
from google.cloud import bigquery
import pandas as pd

auth.authenticate_user()
drive.mount('/content/drive')

base = '/content/drive/MyDrive/hemoalert'
PROJECT_ID = 'hemoalert'
client = bigquery.Client(project=PROJECT_ID)

cohort_query = """
SELECT
    ie.subject_id,
    ie.hadm_id,
    ie.stay_id,
    ie.intime,
    ie.outtime,
    TIMESTAMP_DIFF(ie.outtime, ie.intime, HOUR) AS los_hours,
    p.anchor_age,
    p.gender
FROM `physionet-data.mimiciv_3_1_icu.icustays` ie
INNER JOIN `physionet-data.mimiciv_hosp.patients` p
    ON ie.subject_id = p.subject_id
WHERE
    TIMESTAMP_DIFF(ie.outtime, ie.intime, HOUR) >= 12
    AND p.anchor_age >= 18
ORDER BY ie.intime
"""

cohort = client.query(cohort_query).to_dataframe()
print(f"Cohort size: {len(cohort)} ICU stays")
cohort.to_csv(f'{base}/data/raw/cohort.csv', index=False)
```
Expected: ~50,000–70,000 stays.

### 2.2 — Time-based train/test split (do this before any other query)
```python
cohort['intime'] = pd.to_datetime(cohort['intime'])
cohort = cohort.sort_values('intime').reset_index(drop=True)

cutoff = cohort['intime'].quantile(0.8)
print(f"Train cutoff date: {cutoff}")

train_stays = set(cohort[cohort['intime'] < cutoff]['stay_id'])
test_stays  = set(cohort[cohort['intime'] >= cutoff]['stay_id'])

print(f"Train stays: {len(train_stays)}")
print(f"Test stays:  {len(test_stays)}")

pd.Series(list(train_stays)).to_csv(f'{base}/data/raw/train_stays.csv', index=False)
pd.Series(list(test_stays)).to_csv(f'{base}/data/raw/test_stays.csv', index=False)
```

### 2.3 — Pull vitals: MAP (invasive), SBP, DBP, HR, SpO2, RR, Temp
Key itemids:
- `220052` = MAP (arterial line — not all patients have this)
- `220179` = SBP (non-invasive)
- `220180` = DBP (non-invasive)
- `220045` = Heart Rate
- `220210` = Respiratory Rate
- `220277` = SpO2
- `223761` = Temperature (F)

```python
vitals_query = """
SELECT
    c.stay_id,
    c.charttime,
    c.itemid,
    c.valuenum,
    CASE c.itemid
        WHEN 220052 THEN 'map'
        WHEN 220179 THEN 'sbp'
        WHEN 220180 THEN 'dbp'
        WHEN 220045 THEN 'heart_rate'
        WHEN 220210 THEN 'resp_rate'
        WHEN 220277 THEN 'spo2'
        WHEN 223761 THEN 'temp_f'
    END AS vital_name
FROM `physionet-data.mimiciv_3_1_icu.chartevents` c
WHERE
    c.stay_id IN UNNEST(@stay_ids)
    AND c.itemid IN (220052, 220179, 220180, 220045, 220210, 220277, 223761)
    AND c.valuenum IS NOT NULL
    AND c.valuenum > 0
ORDER BY c.stay_id, c.charttime
"""

all_stay_ids = cohort['stay_id'].astype(int).tolist()
vitals_dfs = []

for i in range(0, len(all_stay_ids), 5000):
    batch = all_stay_ids[i:i+5000]
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ArrayQueryParameter("stay_ids", "INT64", batch)]
    )
    df_batch = client.query(vitals_query, job_config=job_config).to_dataframe()
    vitals_dfs.append(df_batch)
    print(f"Batch {i//5000 + 1} done: {len(df_batch)} rows")

vitals_raw = pd.concat(vitals_dfs, ignore_index=True)
print(f"Total vitals rows: {len(vitals_raw)}")
vitals_raw.to_csv(f'{base}/data/raw/vitals_raw.csv', index=False)
```

### 2.4 — Pull labs: lactate, creatinine, bicarbonate, BUN
These four map directly onto the CDSS's `Patient.vitals` fields of the same
name — no renaming needed between training and serving.

```python
labs_query = """
SELECT
    l.subject_id,
    l.hadm_id,
    l.charttime,
    l.itemid,
    l.valuenum,
    CASE l.itemid
        WHEN 50813 THEN 'lactate'
        WHEN 50912 THEN 'creatinine'
        WHEN 50882 THEN 'bicarbonate'
        WHEN 51006 THEN 'bun'
    END AS lab_name
FROM `physionet-data.mimiciv_3_1_hosp.labevents` l
WHERE
    l.hadm_id IN UNNEST(@hadm_ids)
    AND l.itemid IN (50813, 50912, 50882, 51006)
    AND l.valuenum IS NOT NULL
    AND l.valuenum > 0
ORDER BY l.hadm_id, l.charttime
"""

all_hadm_ids = cohort['hadm_id'].dropna().astype(int).unique().tolist()
labs_dfs = []

for i in range(0, len(all_hadm_ids), 5000):
    batch = [int(x) for x in all_hadm_ids[i:i+5000]]
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ArrayQueryParameter("hadm_ids", "INT64", batch)]
    )
    df_batch = client.query(labs_query, job_config=job_config).to_dataframe()
    labs_dfs.append(df_batch)
    print(f"Batch {i//5000 + 1} done: {len(df_batch)} rows")

labs_raw = pd.concat(labs_dfs, ignore_index=True)
print(f"Total lab rows: {len(labs_raw)}")
labs_raw.to_csv(f'{base}/data/raw/labs_raw.csv', index=False)
```

### 2.5 — Pull vasopressor events (fixes intervention censoring)
When a clinician gives vasopressors, MAP may never drop below 65 even though the patient was
at risk. Without this, those timesteps would be mislabeled "stable." Including vasopressor
start as a label trigger captures these censored instability events. The CDSS's vitals
simulator (`vitalsEngine.js`) also runs this same on/off logic live, driven by simulated MAP,
so the served model always has a `vasopressorOn` flag to consume.

Itemids:
- `221906` = Norepinephrine
- `221289` = Epinephrine
- `222315` = Vasopressin
- `221749` = Phenylephrine
- `221662` = Dopamine

```python
vaso_query = """
SELECT
    ie.stay_id,
    ie.starttime,
    ie.endtime,
    ie.itemid,
    ie.amount,
    CASE ie.itemid
        WHEN 221906 THEN 'norepinephrine'
        WHEN 221289 THEN 'epinephrine'
        WHEN 222315 THEN 'vasopressin'
        WHEN 221749 THEN 'phenylephrine'
        WHEN 221662 THEN 'dopamine'
    END AS vasopressor
FROM `physionet-data.mimiciv_3_1_icu.inputevents` ie
WHERE
    ie.stay_id IN UNNEST(@stay_ids)
    AND ie.itemid IN (221906, 221289, 222315, 221749, 221662)
    AND ie.amount > 0
ORDER BY ie.stay_id, ie.starttime
"""

vaso_dfs = []
for i in range(0, len(all_stay_ids), 5000):
    batch = all_stay_ids[i:i+5000]
    job_config = bigquery.QueryJobConfig(
        query_parameters=[bigquery.ArrayQueryParameter("stay_ids", "INT64", batch)]
    )
    df_batch = client.query(vaso_query, job_config=job_config).to_dataframe()
    vaso_dfs.append(df_batch)
    print(f"Batch {i//5000 + 1} done: {len(df_batch)} rows")

vaso_raw = pd.concat(vaso_dfs, ignore_index=True)
print(f"Total vasopressor rows: {len(vaso_raw)}")
vaso_raw.to_csv(f'{base}/data/raw/vasopressors_raw.csv', index=False)
```

---

## Phase 3 — Preprocessing & label creation

Create `hemoalert_03_preprocessing.ipynb`.

### 3.1 — Load everything
```python
from google.colab import auth, drive
import pandas as pd
import numpy as np

auth.authenticate_user()
drive.mount('/content/drive')
base = '/content/drive/MyDrive/hemoalert'

cohort   = pd.read_csv(f'{base}/data/raw/cohort.csv', parse_dates=['intime','outtime'])
vitals   = pd.read_csv(f'{base}/data/raw/vitals_raw.csv', parse_dates=['charttime'])
labs     = pd.read_csv(f'{base}/data/raw/labs_raw.csv', parse_dates=['charttime'])
vaso     = pd.read_csv(f'{base}/data/raw/vasopressors_raw.csv', parse_dates=['starttime','endtime'])

train_ids = set(pd.read_csv(f'{base}/data/raw/train_stays.csv').iloc[:,0])
test_ids  = set(pd.read_csv(f'{base}/data/raw/test_stays.csv').iloc[:,0])
```

### 3.2 — Pivot vitals to wide format
```python
vitals_wide = vitals.pivot_table(
    index=['stay_id','charttime'], columns='vital_name', values='valuenum', aggfunc='mean'
).reset_index()
vitals_wide.columns.name = None
print(vitals_wide.columns.tolist())
print(vitals_wide.shape)
```

### 3.3 — Map labs to stay_id and pivot
```python
hadm_to_stay = cohort[['hadm_id','stay_id']].drop_duplicates()
labs = labs.merge(hadm_to_stay, on='hadm_id', how='inner')

labs_wide = labs.pivot_table(
    index=['stay_id','charttime'], columns='lab_name', values='valuenum', aggfunc='mean'
).reset_index()
labs_wide.columns.name = None
```

### 3.4 — Create vasopressor timeline flag per stay
```python
def mark_vasopressor_hours(stay_id, timeline_df, vaso_df):
    """Mark each hour in timeline as 1 if a vasopressor was infusing."""
    stay_vaso = vaso_df[vaso_df['stay_id'] == stay_id]
    flags = np.zeros(len(timeline_df), dtype=int)
    for _, row in stay_vaso.iterrows():
        start = row['starttime']
        end   = row['endtime'] if pd.notna(row['endtime']) else start + pd.Timedelta(hours=1)
        mask  = (timeline_df['charttime'] >= start) & (timeline_df['charttime'] <= end)
        flags[mask] = 1
    return flags
```

### 3.5 — Resample each stay to 1-hour intervals
This is the core preprocessing step. Takes 20–40 minutes on the full cohort.

```python
import os, gc
import pandas as pd
import numpy as np

processed_dir = f'{base}/data/processed/resampled_chunks'
os.makedirs(processed_dir, exist_ok=True)
CHUNK_SIZE = 250

print("Pre-grouping data...")
vitals_dict = {k: g.drop(columns='stay_id') for k, g in vitals_wide.groupby('stay_id')}
labs_dict   = {k: g.drop(columns='stay_id') for k, g in labs_wide.groupby('stay_id')}
vaso_dict   = {k: g for k, g in vaso.groupby('stay_id')}
print("Pre-grouping complete.")

def mark_vasopressor_hours_fast(timeline_df, stay_vaso):
    flags = np.zeros(len(timeline_df), dtype=int)
    if stay_vaso is None or len(stay_vaso) == 0:
        return flags
    for _, row in stay_vaso.iterrows():
        start = row['starttime']
        end = row['endtime'] if pd.notna(row['endtime']) else start + pd.Timedelta(hours=1)
        mask = (timeline_df['charttime'] >= start) & (timeline_df['charttime'] <= end)
        flags[mask] = 1
    return flags

def resample_stay_fast(stay_id, intime, outtime):
    timeline = pd.date_range(start=intime, end=outtime, freq='1h')
    df = pd.DataFrame({'charttime': timeline, 'stay_id': stay_id})

    sv = vitals_dict.get(stay_id)
    if sv is not None:
        df = df.merge(sv, on='charttime', how='left')
    sl = labs_dict.get(stay_id)
    if sl is not None:
        df = df.merge(sl, on='charttime', how='left')

    vital_cols = ['map','sbp','dbp','heart_rate','resp_rate','spo2','temp_f']
    lab_cols   = ['lactate','creatinine','bicarbonate','bun']

    for col in vital_cols:
        if col in df.columns:
            df[col] = df[col].ffill(limit=2)
    for col in lab_cols:
        if col in df.columns:
            df[col] = df[col].ffill(limit=6)

    if 'sbp' in df.columns and 'dbp' in df.columns:
        computed_map = df['dbp'] + (df['sbp'] - df['dbp']) / 3
        if 'map' in df.columns:
            df['map'] = df['map'].fillna(computed_map)
        else:
            df['map'] = computed_map

    stay_vaso = vaso_dict.get(stay_id)
    df['vasopressor_on'] = mark_vasopressor_hours_fast(df, stay_vaso)
    return df

existing_chunks = sorted([
    f for f in os.listdir(processed_dir) if f.startswith('resampled_chunk_') and f.endswith('.csv')
])
start_chunk = len(existing_chunks)
start_idx = start_chunk * CHUNK_SIZE
print(f"Found {start_chunk} existing chunks. Resuming from stay index {start_idx}")

cohort_list = cohort[['stay_id','intime','outtime']].values

for chunk_num, chunk_start in enumerate(range(start_idx, len(cohort_list), CHUNK_SIZE), start=start_chunk + 1):
    chunk_end = min(chunk_start + CHUNK_SIZE, len(cohort_list))
    chunk_rows = []
    print(f"\nProcessing chunk {chunk_num}: stays {chunk_start}–{chunk_end-1}")

    for stay_id, intime, outtime in cohort_list[chunk_start:chunk_end]:
        try:
            df = resample_stay_fast(stay_id, intime, outtime)
            chunk_rows.append(df)
        except Exception as e:
            print(f"Error stay {stay_id}: {e}")

    chunk_df = pd.concat(chunk_rows, ignore_index=True)
    chunk_path = f'{processed_dir}/resampled_chunk_{chunk_num:03d}.csv'
    chunk_df.to_csv(chunk_path, index=False)
    print(f"Saved {chunk_path} ({len(chunk_df)} rows)")

    del chunk_rows, chunk_df
    gc.collect()

print("\nAll chunks complete.")
```

### 3.6 — Create instability label (MAP < 65 OR vasopressor started)
A timestep is labeled 1 if, in the next 4–6 hours, either:
- MAP drops below 65 mmHg, OR
- A vasopressor is newly initiated (vasopressor_on transitions from 0 to 1)

```python
LEAD_MIN = 4
LEAD_MAX = 6

def create_labels(df):
    df = df.sort_values(['stay_id','charttime']).copy()
    df['map_crisis']      = (df['map'] < 65).astype(int)
    df['vaso_new_start']  = df.groupby('stay_id')['vasopressor_on'].diff().clip(lower=0).fillna(0).astype(int)
    df['instability_event'] = ((df['map_crisis'] == 1) | (df['vaso_new_start'] == 1)).astype(int)

    labeled = []
    for stay_id, group in df.groupby('stay_id'):
        group = group.reset_index(drop=True)
        n = len(group)
        labels = np.zeros(n, dtype=int)
        for t in range(n):
            future = group.iloc[t + LEAD_MIN : t + LEAD_MAX + 1]
            if len(future) > 0 and future['instability_event'].max() == 1:
                labels[t] = 1
        group['label'] = labels
        labeled.append(group)

    return pd.concat(labeled, ignore_index=True)

print("Creating labels — takes ~10 minutes...")
labeled = create_labels(resampled)

pos_rate = labeled['label'].mean()
print(f"Instability label rate: {pos_rate:.1%}")
# Expected: 10–20%. If near 0%: check MAP itemids. If >30%: thresholds too loose.

labeled.to_csv(f'{base}/data/processed/labeled.csv', index=False)
```

---

## Phase 4 — Feature engineering

Create `hemoalert_04_features.ipynb`.

**This phase must stay in lockstep with `packages/ml-service/features.py`.** That
file recomputes the same engineered features in real time, from a single
patient's recent vitals history, for live scoring. If you add/rename/change a
feature here, mirror the change there — otherwise the served model will be
fed columns it wasn't trained on, silently (they'll just be zero-filled).

### 4.1 — Load labeled data
```python
from google.colab import auth, drive
import pandas as pd
import numpy as np
import os

auth.authenticate_user()
drive.mount('/content/drive')
base = '/content/drive/MyDrive/hemoalert'

labeled_dir = f'{base}/data/processed/labeled_chunks'
chunks = sorted([f for f in os.listdir(labeled_dir) if f.endswith('.parquet')])
print(f"Loading {len(chunks)} labeled chunks...")

labeled = pd.concat([pd.read_parquet(f'{labeled_dir}/{f}') for f in chunks], ignore_index=True)
cohort = pd.read_csv(f'{base}/data/raw/cohort.csv', parse_dates=['intime','outtime'])

labeled = labeled.sort_values(['stay_id','charttime']).reset_index(drop=True)
features = labeled.copy()

print(f"Total rows: {len(labeled):,}")
print(f"Label rate: {labeled['label'].mean():.1%}")
```

### 4.2 — 6-hour rolling slopes (rate of change)
```python
def rolling_slope_vectorized(series, window=6):
    vals = series.values.astype(float)
    slopes = np.full(len(vals), np.nan)
    x = np.arange(window) - (window - 1) / 2
    for i in range(window - 1, len(vals)):
        y = vals[i - window + 1 : i + 1]
        mask = ~np.isnan(y)
        if mask.sum() >= 3:
            slopes[i] = np.polyfit(x[mask], y[mask], 1)[0]
    return slopes

for stay_id, group in features.groupby('stay_id'):
    idx = group.index
    features.loc[idx, 'map_slope']  = rolling_slope_vectorized(group['map'])
    features.loc[idx, 'hr_slope']   = rolling_slope_vectorized(group['heart_rate'])
    features.loc[idx, 'spo2_slope'] = rolling_slope_vectorized(group['spo2'])
```
`features.py:_slope()` computes the same thing on a 6-row trailing window
for a single patient — it just doesn't need the `groupby` since it's already
scoped to one stay.

### 4.3 — Rolling means and standard deviations
```python
WINDOW = 6
for col in ['map','heart_rate','spo2','resp_rate','sbp','dbp']:
    if col in features.columns:
        grp = features.groupby('stay_id')[col]
        features[f'{col}_mean6h'] = grp.transform(lambda x: x.rolling(WINDOW, min_periods=2).mean())
        features[f'{col}_std6h']  = grp.transform(lambda x: x.rolling(WINDOW, min_periods=2).std())
print("Rolling stats done")
```

### 4.4 — Lag features
```python
for col in ['map','heart_rate','lactate','creatinine']:
    if col in features.columns:
        for lag in [1, 2, 3]:
            features[f'{col}_lag{lag}'] = features.groupby('stay_id')[col].shift(lag)
print("Lag features done")
```

### 4.5 — Clinical interaction terms
```python
features['shock_index'] = features['heart_rate'] / features['sbp'].replace(0, np.nan)

if 'sbp' in features.columns and 'dbp' in features.columns:
    features['pulse_pressure'] = features['sbp'] - features['dbp']

features['hr_map_product'] = features['heart_rate'] * features['map']
features['compensation_signal'] = features['hr_slope'] - features['map_slope']
features['vaso_weaning'] = features.groupby('stay_id')['vasopressor_on'].diff().clip(upper=0).abs().fillna(0)
print("Interaction terms done")
```

### 4.6 — Time in ICU
```python
intime_map = cohort.drop_duplicates('stay_id').set_index('stay_id')['intime']
features['intime'] = features['stay_id'].map(intime_map)
features['hours_in_icu'] = (features['charttime'] - features['intime']).dt.total_seconds() / 3600
print("Time features done")
```

### 4.7 — Drop sparse rows and save
```python
exclude = ['stay_id','charttime','intime','outtime','instability_event',
           'label','hadm_id','subject_id','map_crisis','vaso_new_start',
           'vital_name','lab_name']
feature_cols = [c for c in features.columns if c not in exclude]

threshold = int(len(feature_cols) * 0.5)
features_clean = features.dropna(subset=feature_cols, thresh=threshold)

print(f"Rows before: {len(features)}")
print(f"Rows after:  {len(features_clean)}")
print(f"Feature count: {len(feature_cols)}")

features_clean.to_csv(f'{base}/data/processed/features.csv', index=False)
features_clean.to_parquet(f'{base}/data/processed/features.parquet', index=False)
pd.Series(feature_cols).to_csv(f'{base}/data/processed/feature_cols.csv', index=False)
```
`feature_cols.csv` is one of the four files that ships to
`packages/ml-service/model/` in Phase 7 — it's what tells the serving code
the exact column order the model expects.

---

## Phase 5 — Modelling

Create `hemoalert_05_model.ipynb`.

### 5.1 — Load and split
```python
from google.colab import auth, drive
import pandas as pd
import numpy as np
from sklearn.metrics import (roc_auc_score, average_precision_score,
                              classification_report, roc_curve)
from sklearn.calibration import CalibratedClassifierCV, calibration_curve
import xgboost as xgb
import shap
import joblib
import matplotlib.pyplot as plt

auth.authenticate_user()
drive.mount('/content/drive')
base = '/content/drive/MyDrive/hemoalert'

feature_cols = pd.read_csv(f'{base}/data/processed/feature_cols.csv').iloc[:,0].tolist()
train_ids    = set(pd.read_csv(f'{base}/data/raw/train_stays.csv').iloc[:,0])
test_ids     = set(pd.read_csv(f'{base}/data/raw/test_stays.csv').iloc[:,0])

cols_to_load = ['stay_id', 'label'] + feature_cols
features = pd.read_parquet(f'{base}/data/processed/features.parquet', columns=cols_to_load)

train = features[features['stay_id'].isin(train_ids)]
test  = features[features['stay_id'].isin(test_ids)]

del features
import gc; gc.collect()

X_train = train[feature_cols].fillna(0)
y_train = train['label']
X_test  = test[feature_cols].fillna(0)
y_test  = test['label']

del train, test
gc.collect()

print(f"Train: {X_train.shape} | positive rate: {y_train.mean():.1%}")
print(f"Test:  {X_test.shape}  | positive rate: {y_test.mean():.1%}")
```

### 5.2 — Train XGBoost with class imbalance correction
```python
ratio = (y_train == 0).sum() / (y_train == 1).sum()
print(f"scale_pos_weight = {ratio:.1f}")

xgb_model = xgb.XGBClassifier(
    n_estimators=500, max_depth=6, learning_rate=0.05,
    scale_pos_weight=ratio, subsample=0.8, colsample_bytree=0.8,
    eval_metric='auc', early_stopping_rounds=20, random_state=42, n_jobs=-1
)

xgb_model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=50)
print(f"Best iteration: {xgb_model.best_iteration}")
```

### 5.3 — Calibrate the risk score
```python
calibrated_model = CalibratedClassifierCV(xgb_model, method='sigmoid', cv='prefit')
calibrated_model.fit(X_train, y_train)
y_prob = calibrated_model.predict_proba(X_test)[:,1]

fraction_pos, mean_pred = calibration_curve(y_test, y_prob, n_bins=10)
plt.figure(figsize=(6,4))
plt.plot(mean_pred, fraction_pos, 's-', label='HemoAlert')
plt.plot([0,1],[0,1],'--', label='Perfect calibration')
plt.xlabel('Mean predicted probability'); plt.ylabel('Fraction positive')
plt.title('Calibration curve'); plt.legend(); plt.tight_layout()
plt.savefig(f'{base}/outputs/calibration_curve.png')
plt.show()
```

### 5.4 — Evaluate performance
```python
auc_roc = roc_auc_score(y_test, y_prob)
auc_pr  = average_precision_score(y_test, y_prob)
print(f"AUC-ROC: {auc_roc:.3f}")
print(f"AUC-PR:  {auc_pr:.3f}")

fpr, tpr, thresholds = roc_curve(y_test, y_prob)
target_sensitivity = 0.85
idx = np.argmin(np.abs(tpr - target_sensitivity))
chosen_threshold = thresholds[idx]
print(f"\nAt {tpr[idx]:.0%} sensitivity:")
print(f"  Threshold:   {chosen_threshold:.3f}")
print(f"  Specificity: {1 - fpr[idx]:.1%}")

y_pred = (y_prob >= chosen_threshold).astype(int)
print("\nClassification report:")
print(classification_report(y_test, y_pred, target_names=['Stable','Unstable']))
```
Note: `chosen_threshold` here is a *classification* cutoff for evaluation —
it is not the same thing as the `riskLevel` bands the CDSS uses
(`critical ≥0.8, high ≥0.6, medium ≥0.4`, from `Patient.updateRiskLevel()`).
The service returns the raw calibrated probability; the app buckets it.

### 5.5 — SHAP feature importance
```python
explainer  = shap.TreeExplainer(xgb_model)
shap_vals  = explainer.shap_values(X_test.iloc[:1000])

plt.figure()
shap.summary_plot(shap_vals, X_test.iloc[:1000], feature_names=feature_cols, max_display=15, show=False)
plt.tight_layout()
plt.savefig(f'{base}/outputs/shap_summary.png')
plt.show()
```

### 5.6 — Lead time analysis
```python
THRESHOLD = chosen_threshold
cols_needed = ['stay_id', 'charttime', 'label']
test_raw = pd.read_parquet(f'{base}/data/processed/features.parquet', columns=cols_needed)
test_df = test_raw[test_raw['stay_id'].isin(test_ids)].copy()
del test_raw
gc.collect()

test_df['charttime'] = pd.to_datetime(test_df['charttime'])
test_df['risk_score'] = y_prob
test_df['high_risk']  = (test_df['risk_score'] >= THRESHOLD).astype(int)

lead_times = []
for stay_id, group in test_df.groupby('stay_id'):
    group = group.sort_values('charttime')
    if group['label'].max() == 0:
        continue
    first_event = group[group['label'] == 1]['charttime'].min()
    first_alert = group[group['high_risk'] == 1]['charttime'].min()
    if pd.isna(first_alert):
        continue
    lead_h = (first_event - first_alert).total_seconds() / 3600
    if lead_h > 0:
        lead_times.append(lead_h)

lead_times = np.array(lead_times)
print(f"Median lead time:      {np.median(lead_times):.1f} hours")
print(f"Mean lead time:        {np.mean(lead_times):.1f} hours")
print(f"% with ≥4h warning:   {np.mean(lead_times >= 4):.1%}")
print(f"% with ≥6h warning:   {np.mean(lead_times >= 6):.1%}")
print(f"Stays with any alert:  {len(lead_times)}")
```

### 5.7 — Save model and metadata
```python
joblib.dump(calibrated_model, f'{base}/models/xgb_calibrated.pkl')
joblib.dump(xgb_model,        f'{base}/models/xgb_raw.pkl')
joblib.dump(explainer,        f'{base}/models/shap_explainer.pkl')

import json
metadata = {
    'threshold':        float(chosen_threshold),
    'auc_roc':          float(auc_roc),
    'auc_pr':           float(auc_pr),
    'median_lead_h':    float(np.median(lead_times)),
    'mean_lead_h':      float(np.mean(lead_times)),
    'pct_ge4h':         float(np.mean(lead_times >= 4)),
    'feature_count':    len(feature_cols),
}
with open(f'{base}/models/metadata.json', 'w') as f:
    json.dump(metadata, f, indent=2)

print("All model files saved.")
```

---

## Phase 5b — LSTM on Kaggle (optional, run after XGBoost is working)

Upload `features.csv`, `train_stays.csv`, `test_stays.csv`, `feature_cols.csv`
to Kaggle as a private dataset. Create a new Kaggle Notebook with GPU T4 x2 enabled.

```python
import pandas as pd
import numpy as np
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from sklearn.metrics import roc_auc_score

SEQ_LEN     = 6
BATCH_SIZE  = 256
EPOCHS      = 30
LR          = 1e-3
DEVICE      = 'cuda' if torch.cuda.is_available() else 'cpu'
print(f"Device: {DEVICE}")

features     = pd.read_csv('/kaggle/input/hemoalert/features.csv')
feature_cols = pd.read_csv('/kaggle/input/hemoalert/feature_cols.csv').iloc[:,0].tolist()
train_ids    = set(pd.read_csv('/kaggle/input/hemoalert/train_stays.csv').iloc[:,0])
test_ids     = set(pd.read_csv('/kaggle/input/hemoalert/test_stays.csv').iloc[:,0])

train = features[features['stay_id'].isin(train_ids)].fillna(0)
test  = features[features['stay_id'].isin(test_ids)].fillna(0)

def build_sequences(df, feature_cols, seq_len=6):
    X, y = [], []
    for stay_id, group in df.groupby('stay_id'):
        group = group.sort_values('charttime').reset_index(drop=True)
        vals   = group[feature_cols].values.astype(np.float32)
        labels = group['label'].values.astype(np.float32)
        for i in range(seq_len, len(group)):
            X.append(vals[i - seq_len : i])
            y.append(labels[i])
    return np.array(X), np.array(y)

print("Building sequences...")
X_train, y_train = build_sequences(train, feature_cols, SEQ_LEN)
X_test,  y_test  = build_sequences(test,  feature_cols, SEQ_LEN)
print(f"X_train: {X_train.shape} | X_test: {X_test.shape}")

class ICUDataset(Dataset):
    def __init__(self, X, y):
        self.X = torch.tensor(X)
        self.y = torch.tensor(y)
    def __len__(self):  return len(self.X)
    def __getitem__(self, i): return self.X[i], self.y[i]

pos_weight = torch.tensor([(y_train == 0).sum() / (y_train == 1).sum()]).to(DEVICE)
train_loader = DataLoader(ICUDataset(X_train, y_train), batch_size=BATCH_SIZE, shuffle=True)
test_loader  = DataLoader(ICUDataset(X_test, y_test), batch_size=BATCH_SIZE, shuffle=False)

class HemoLSTM(nn.Module):
    def __init__(self, input_size, hidden_size=64, num_layers=2, dropout=0.3):
        super().__init__()
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=dropout)
        self.fc   = nn.Linear(hidden_size, 1)
        self.dropout = nn.Dropout(dropout)
    def forward(self, x):
        out, _ = self.lstm(x)
        out = self.dropout(out[:, -1, :])
        return self.fc(out).squeeze(1)

model     = HemoLSTM(input_size=len(feature_cols)).to(DEVICE)
optimizer = torch.optim.Adam(model.parameters(), lr=LR)
criterion = nn.BCEWithLogitsLoss(pos_weight=pos_weight)

best_auc = 0
for epoch in range(EPOCHS):
    model.train()
    total_loss = 0
    for X_batch, y_batch in train_loader:
        X_batch, y_batch = X_batch.to(DEVICE), y_batch.to(DEVICE)
        optimizer.zero_grad()
        logits = model(X_batch)
        loss   = criterion(logits, y_batch)
        loss.backward()
        optimizer.step()
        total_loss += loss.item()

    model.eval()
    all_probs, all_labels = [], []
    with torch.no_grad():
        for X_batch, y_batch in test_loader:
            probs = torch.sigmoid(model(X_batch.to(DEVICE))).cpu().numpy()
            all_probs.extend(probs)
            all_labels.extend(y_batch.numpy())

    auc = roc_auc_score(all_labels, all_probs)
    print(f"Epoch {epoch+1:02d} | Loss: {total_loss/len(train_loader):.4f} | AUC: {auc:.4f}")
    if auc > best_auc:
        best_auc = auc
        torch.save(model.state_dict(), 'hemo_lstm_best.pt')

print(f"\nBest AUC: {best_auc:.4f}")
print("Model saved to hemo_lstm_best.pt")
# Download this file, but note: packages/ml-service currently only serves
# the XGBoost path (app.py loads xgb_calibrated.pkl). Wiring up the LSTM
# as an alternative/ensemble is future work, not part of this integration.
```

---

## Phase 6 — Offline demo (Streamlit, optional)

This is a standalone sanity-check dashboard for exploring the model
*outside* the CDSS — useful right after training, before you touch the app
at all. It duplicates the feature engineering as fixed sidebar sliders
(single timestep, no history) rather than reading real patient data.

```python
import os, shutil
os.makedirs('/content/hemoalert/models', exist_ok=True)
os.makedirs('/content/hemoalert/data/processed', exist_ok=True)
shutil.copy(f'{base}/models/xgb_calibrated.pkl',      '/content/hemoalert/models/')
shutil.copy(f'{base}/models/shap_explainer.pkl',       '/content/hemoalert/models/')
shutil.copy(f'{base}/models/metadata.json',            '/content/hemoalert/models/')
shutil.copy(f'{base}/data/processed/feature_cols.csv', '/content/hemoalert/data/processed/')
print("Files copied!")
```

```python
os.chdir('/content/hemoalert')
app_code = '''
import streamlit as st
import pandas as pd
import numpy as np
import joblib
import shap
import json
import matplotlib.pyplot as plt

st.set_page_config(page_title="HemoAlert", layout="wide", page_icon="\U0001fac0")

@st.cache_resource
def load_model():
    model     = joblib.load('models/xgb_calibrated.pkl')
    explainer = joblib.load('models/shap_explainer.pkl')
    feat_cols = pd.read_csv('data/processed/feature_cols.csv').iloc[:,0].tolist()
    with open('models/metadata.json') as f:
        meta = json.load(f)
    return model, explainer, feat_cols, meta

model, explainer, feature_cols, meta = load_model()
THRESHOLD = meta['threshold']

st.title("HemoAlert")
st.caption(f"AUC-ROC {meta['auc_roc']:.3f} · Median lead time {meta['median_lead_h']:.1f}h · "
           f"≥4h warning in {meta['pct_ge4h']:.0%} of cases")
st.divider()

st.sidebar.header("Patient vitals")
map_now    = st.sidebar.slider("MAP now (mmHg)",          40, 120, 82)
map_1h     = st.sidebar.slider("MAP 1h ago (mmHg)",       40, 120, 86)
map_3h     = st.sidebar.slider("MAP 3h ago (mmHg)",       40, 120, 90)
hr_now     = st.sidebar.slider("Heart rate now (bpm)",    40, 160, 88)
hr_1h      = st.sidebar.slider("HR 1h ago (bpm)",         40, 160, 82)
spo2       = st.sidebar.slider("SpO2 (%)",                70, 100, 96)
resp_rate  = st.sidebar.slider("Resp rate (breaths/min)", 8,  40,  18)
lactate    = st.sidebar.slider("Lactate (mmol/L)",        0.5, 10.0, 1.4)
creatinine = st.sidebar.slider("Creatinine (mg/dL)",      0.3, 10.0, 1.1)
sbp        = st.sidebar.slider("SBP (mmHg)",              60, 200, 118)
dbp        = st.sidebar.slider("DBP (mmHg)",              30, 120, 72)
vaso_on    = st.sidebar.toggle("Vasopressor currently running", value=False)

map_slope = (map_now - map_3h) / 3
hr_slope  = (hr_now  - hr_1h)

input_dict = {col: 0 for col in feature_cols}
input_dict.update({
    'map': map_now, 'map_lag1': map_1h, 'map_lag3': map_3h,
    'heart_rate': hr_now, 'heart_rate_lag1': hr_1h,
    'spo2': spo2, 'resp_rate': resp_rate, 'lactate': lactate,
    'creatinine': creatinine, 'sbp': sbp, 'dbp': dbp,
    'map_slope': map_slope, 'hr_slope': hr_slope,
    'shock_index': hr_now / max(sbp, 1), 'pulse_pressure': sbp - dbp,
    'hr_map_product': hr_now * map_now,
    'compensation_signal': hr_slope - map_slope,
    'vasopressor_on': int(vaso_on),
    'map_mean6h': np.mean([map_now, map_1h, map_3h]),
    'heart_rate_mean6h': np.mean([hr_now, hr_1h]),
})

X_input    = pd.DataFrame([input_dict])[feature_cols]
risk_score = model.predict_proba(X_input)[0][1]

col1, col2, col3 = st.columns(3)
col1.metric("Risk score",          f"{risk_score:.0%}")
col2.metric("Alert threshold",     f"{THRESHOLD:.0%}")
col3.metric("Estimated lead time", f"{meta['median_lead_h']:.1f}h median")

st.divider()
if risk_score >= THRESHOLD:
    st.error("HIGH RISK — Hemodynamic instability predicted within 4–6 hours.")
elif risk_score >= THRESHOLD * 0.6:
    st.warning("MODERATE RISK — Increased monitoring recommended.")
else:
    st.success("LOW RISK — Continue routine monitoring.")

st.subheader("What is driving this prediction?")
raw_model     = model.calibrated_classifiers_[0].estimator
raw_explainer = shap.TreeExplainer(raw_model)
shap_vals     = raw_explainer.shap_values(X_input)

fig, ax = plt.subplots(figsize=(10, 5))
shap.waterfall_plot(
    shap.Explanation(values=shap_vals[0], base_values=raw_explainer.expected_value,
                      data=X_input.iloc[0].values, feature_names=feature_cols),
    max_display=12, show=False
)
st.pyplot(fig)
plt.close()
'''

with open('/content/hemoalert/app.py', 'w') as f:
    f.write(app_code)
print("app.py updated!")
```

```python
!pip install -q streamlit pyngrok
!ngrok authtoken YOUR_NGROK_TOKEN_HERE

import subprocess, threading, time
def run_streamlit():
    subprocess.run(['streamlit', 'run', 'app.py', '--server.port', '8501', '--server.headless', 'true'])

threading.Thread(target=run_streamlit, daemon=True).start()
time.sleep(4)

from pyngrok import ngrok
url = ngrok.connect(8501)
print(f"\nHemoAlert dashboard live at: {url}")
```

---

## Phase 7 — Production serving: wire the model into the ARIA CDSS

This is the part that actually makes HemoAlert real inside the app, instead
of a Colab curiosity. It's already scaffolded in this repo
(`packages/ml-service`) — this phase is about dropping your trained
artifacts in and confirming the whole chain works end to end.

### 7.1 — Copy trained artifacts into the repo

From Drive, copy exactly these four files into `packages/ml-service/model/`:

```
packages/ml-service/model/
  xgb_calibrated.pkl   # from Phase 5.7
  feature_cols.csv     # from Phase 4.7
  metadata.json        # from Phase 5.7
```

(`shap_explainer.pkl` doesn't need to be copied — `app.py` derives a fresh
`TreeExplainer` from the calibrated model at startup, the same way the
Streamlit app does in Phase 6.)

### 7.2 — Install and run the service

```bash
cd packages/ml-service
python -m venv .venv
source .venv/bin/activate        # .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Or from the repo root: `pnpm dev:ml`.

Confirm it picked up the model:

```bash
curl http://localhost:8000/health
# {"status":"ok","modelLoaded":true,"featureCount":<N>,"metadata":{...}}
```

If `modelLoaded` is `false`, check the server log on startup — it prints why
loading failed (missing file, corrupt pickle, sklearn/xgboost version
mismatch between training and serving environments — pin versions in
`requirements.txt` to match what Colab used if this happens).

### 7.3 — How the backend calls it

`packages/backend/src/services/vitalsEngine.js` calls `POST /predict` on
every simulation tick (every 60s) for every active patient, sending that
patient's `admissionDate` and full `vitals` history. On success, it stores
the response directly onto the patient:

```js
patient.riskScore = prediction.riskScore;
patient.riskLevel = prediction.riskLevel;
patient.riskShap  = prediction.shapValues;
```

If the request fails for *any* reason — service not running, model not
loaded (503), timeout — `getMlPrediction()` returns `null` and the engine
falls back to its original mock formula (MAP/HR/SpO2 thresholds). Nothing
else in the app needs to know which path produced the score; both paths
write to the same `riskScore`/`riskLevel`/`riskShap` fields.

Set `ML_SERVICE_URL` in `packages/backend/.env` if the service isn't at the
default `http://localhost:8000` (e.g. a separate container/host).

### 7.4 — How the frontend shows it

`PatientDetail.tsx`'s SHAP tab already prefers `patient.riskShap` (the real
model's explanation) and only falls back to its heuristic bar chart when
`riskShap` is empty. A badge in the tab header ("HemoAlert model" vs.
"Heuristic estimate") makes it obvious at a glance which one is showing —
useful during the period where the model isn't trained yet, or if the
service temporarily drops out.

### 7.5 — Verifying the full loop

1. Start Mongo-backed backend (`pnpm dev:be`), frontend (`pnpm dev:fe`), and
   ml-service (`pnpm dev:ml`), in any order.
2. `curl http://localhost:8000/health` → `modelLoaded: true`.
3. Log in, open a patient, watch a couple of simulation ticks pass (60s
   each) — the SHAP tab badge should switch to "HemoAlert model" and the
   bars should reflect real SHAP contributions rather than the fixed
   heuristic thresholds.
4. Kill the ml-service process. Within one tick, risk scoring should keep
   working via the mock formula, and the SHAP tab should read "Heuristic
   estimate" again — confirming the fallback path doesn't crash the app.

### 7.6 — Deploying ml-service alongside the rest of the stack

`packages/ml-service/Dockerfile` builds a standalone image
(`uvicorn app:app --host 0.0.0.0 --port 8000`). In whatever compose/orchestration
setup hosts the Node backend and Mongo, add this as a third service and mount
or bake in the `model/` directory; point the backend's `ML_SERVICE_URL` at
its internal address.

---

## Summary of what changed from the original plan

| Original | Updated |
|---|---|
| Random train/test split | Time-based split (80/20 by admission date) |
| MAP from itemid 220052 only | MAP fallback: computed from SBP/DBP when arterial line absent |
| Binary label: MAP < 65 only | Co-label: MAP < 65 OR vasopressor newly started |
| No class imbalance handling | `scale_pos_weight` in XGBoost + `pos_weight` in LSTM loss |
| Raw score output | Platt scaling calibration (scores = true probabilities) |
| Colab for all training | Colab for XGBoost, Kaggle for LSTM |
| Ends at a standalone Streamlit demo | **Phase 7**: served from `packages/ml-service` (FastAPI), consumed live by `packages/backend`'s `vitalsEngine.js`, rendered in `packages/frontend`'s `PatientDetail.tsx` — with an automatic fallback to a mock formula whenever the model/service isn't available |
| CDSS tracked a subset of vitals | `Patient.js` extended with `creatinine`, `bicarbonate`, `bun`, `vasopressorOn`/`vasopressorAgent` so the live app can supply every feature the model was trained on |

---

*HemoAlert pipeline v3 — training (Phases 1–5b) unchanged in substance from v2;
Phase 6 is now explicitly optional; Phase 7 wires the trained model into the
actual CDSS. Start at Phase 1.3 (Colab setup) since you have data access;
skip straight to Phase 7 once you already have trained artifacts in Drive.*
