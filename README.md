# DrishtiAI — 5-Model Fake Profile Photo Detection

```
██████╗ ██████╗ ██╗███████╗██╗  ██╗████████╗██╗ █████╗ ██╗
██╔══██╗██╔══██╗██║██╔════╝██║  ██║╚══██╔══╝██║██╔══██╗██║
██║  ██║██████╔╝██║███████╗███████║   ██║   ██║███████║██║
██║  ██║██╔══██╗██║╚════██║██╔══██║   ██║   ██║██╔══██║██║
██████╔╝██║  ██║██║███████║██║  ██║   ██║   ██║██║  ██║██║
╚═════╝ ╚═╝  ╚═╝╚═╝╚══════╝╚═╝  ╚═╝  ╚═╝   ╚═╝╚═╝  ╚═╝╚═╝
```

**Research-grade deepfake detection with 5-model comparison engine**

[![Python](https://img.shields.io/badge/Python-3.10+-blue?style=flat-square)](https://python.org)
[![Django](https://img.shields.io/badge/Django-4.2-green?style=flat-square)](https://djangoproject.com)
[![PyTorch](https://img.shields.io/badge/PyTorch-2.x-ee4c2c?style=flat-square)](https://pytorch.org)
[![React](https://img.shields.io/badge/React-19-61dafb?style=flat-square)](https://react.dev)

---

## Architecture Overview

DrishtiAI fuses **5 CNN architectures** into a single weighted ensemble for robust fake profile photo detection. Each image is processed by all models in parallel, and results are compared with statistical agreement analysis.

### Models

| Model        | Accuracy | AUC    | F1     | Params | Speed  | Best At           |
|--------------|----------|--------|--------|--------|--------|-------------------|
| DenseNet121  | **98.62%** | 99.79% | 98.61% | 8.0M  | 22ms   | Overall accuracy  |
| EfficientNet | 98.49%   | 99.73% | 98.48% | 5.3M   | 18ms   | Lowest FPR (1.08%)|
| ResNet18     | 98.26%   | **99.81%** | 98.25% | 11.7M | 12ms | Highest AUC     |
| MobileNetV2  | 98.31%   | 99.68% | 98.31% | 3.4M   | **8ms** | Speed/accuracy  |
| CustomCNN    | 94.57%   | 98.77% | 94.52% | 2.1M   | **5ms** | Smallest model  |

### Training
- **Dataset**: 200K Real vs AI Visuals (Kaggle)
- **Split**: 80% train / 10% val / 10% test
- **Epochs**: 10 | **Optimizer**: Adam (lr=1e-4) | **Image size**: 64×64

---

## Features

| Feature | Description |
|---------|-------------|
| 🔍 **Single Detection** | DenseNet121 (best) with confidence score + face meta |
| ⊞ **5-Model Compare** | All models run in parallel with ensemble weighted vote |
| 📊 **Research Page** | Interactive charts — radar, bar, scatter, confusion matrices |
| 👁 **Grad-CAM** | Attention heatmap showing which facial regions triggered verdict |
| 📈 **History** | Per-user detection history with filtering |
| 🔐 **JWT Auth** | 8-hour access tokens, 30-day rotating refresh |

---

## Project Structure

```
drishti-ai/
├── backend/
│   ├── config/              ← Django settings, URLs, WSGI
│   ├── users/               ← Custom User model + JWT auth endpoints
│   ├── detection/
│   │   ├── models/          ← DetectionResult Django model
│   │   ├── views/
│   │   │   ├── detect_v3.py        ← Single-model detection (DenseNet121)
│   │   │   └── comparison_view.py  ← Multi-model comparison endpoint
│   │   ├── services/
│   │   │   ├── multi_model_loader.py    ← All 5 model architectures + loaders
│   │   │   ├── multi_model_inference.py ← Parallel inference + ensemble
│   │   │   ├── face_detection.py        ← Haar cascade face crop
│   │   │   └── preprocess.py            ← CLAHE + ImageNet normalisation
│   │   └── urls/            ← All detection + comparison + research URLs
│   ├── ml_models/           ← Place your .pth files here
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── LandingPage.jsx   ← Public hero page
        │   ├── Dashboard.jsx     ← Stats + recent detections + model benchmarks
        │   ├── UploadPage.jsx    ← Single-image detection (DenseNet121)
        │   ├── ComparePage.jsx   ← 5-model side-by-side comparison
        │   ├── ResearchPage.jsx  ← Benchmark charts + confusion matrices
        │   └── HistoryPage.jsx   ← Detection history with filters
        ├── styles/              ← Per-page CSS (auth, compare, research, landing…)
        ├── api/                 ← Axios instance + API call functions
        ├── features/auth/       ← Redux auth slice + thunks
        └── routes/              ← React Router v7 routes
```

---

## Setup

### Prerequisites
- Python 3.10+
- Node.js 20+
- 5 `.pth` model files (ResNet18, EfficientNet, MobileNetV2, DenseNet121, CustomCNN)

### Backend

```bash
cd backend

# 1. Virtual environment
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Place model weights
mkdir -p ml_models
# Copy all 5 .pth files into ml_models/
# Required: ResNet18.pth, EfficientNet.pth, MobileNetV2.pth, DenseNet121.pth, CustomCNN.pth

# 4. Environment
cp .env.sample .env
# Edit .env — set DJANGO_SECRET_KEY and ML_MODELS_DIR

# 5. Database
python manage.py migrate

# 6. Run
python manage.py runserver
# → http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env   # VITE_API_BASE_URL=http://localhost:8000/api
npm run dev
# → http://localhost:5173
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register/` | Create user account |
| POST | `/api/login/` | Obtain JWT tokens |
| POST | `/api/refresh/` | Refresh access token |
| GET  | `/api/me/` | Current user info |
| POST | `/api/detection/` | Detect with DenseNet121 |
| GET  | `/api/detection/` | Detection history |
| GET  | `/api/detection/stats/` | User detection stats |
| POST | `/api/compare/` | Run all 5 models |
| POST | `/api/compare/single/` | Run one specific model |
| GET  | `/api/research/` | Static benchmark data |
| GET  | `/api/benchmark/` | Model performance metrics |
| GET  | `/api/docs/` | Swagger UI |

---

## Environment Variables

```env
# backend/.env
DJANGO_SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost
DB_ENGINE=django.db.backends.sqlite3
DB_NAME=db.sqlite3
ML_MODELS_DIR=/absolute/path/to/backend/ml_models

# frontend/.env
VITE_API_BASE_URL=http://localhost:8000/api
```

---

*दृष्टि (Drishti) — Sight · Vision · Clarity*
*Built with PyTorch, Django REST Framework, React 19 & Tailwind CSS v4*
