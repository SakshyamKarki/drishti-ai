# Full-Stack Media Authenticity Verification System

## Project Structure

```
project/
├── backend/              # Django REST Framework API
│   ├── config/          # Django configuration
│   ├── apps/            # Django applications
│   │   ├── authentication/
│   │   ├── users/
│   │   ├── uploads/
│   │   ├── feed/
│   │   ├── ai_engine/
│   │   └── moderation/
│   ├── manage.py
│   └── requirements.txt
└── frontend/            # React + Vite application
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   └── App.jsx
    └── package.json
```

## Key Features

- AI-powered image authenticity verification (DenseNet121)
- News text categorization using TF-IDF
- Hard-coded cosine similarity algorithm
- Trust score calculation engine
- Role-based user management
- Admin moderation dashboard
- Public feed system

## Roles

- **User**: Upload news, view feed, check verification results
- **Admin**: Manage users, moderate uploads, override decisions

## AI Pipeline

1. Image → DenseNet121 → Confidence Score (REAL/FAKE/SUSPICIOUS)
2. Text → TF-IDF Vectorization → Category Classification
3. Trust Score = 0.7 * ImageScore + 0.3 * TextScore
4. Decision: >= 0.80 (REAL), 0.60-0.79 (SUSPICIOUS), < 0.60 (FAKE)

## Getting Started

### Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## API Base URL
`http://localhost:8000/api/`
