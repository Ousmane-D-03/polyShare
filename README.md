# PolyShare API

API Backend pour la plateforme de partage de polycopiés PolyShare.

## Technologies
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Multer pour upload de fichiers

## Installation locale
```bash
npm install
cp .env.example .env
# Configurer DATABASE_URL dans .env
npm run db:init
npm run dev
```

## Variables d'environnement
```
PORT=5000
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_EXPIRE=7d
FRONTEND_URL=https://...
```

## Endpoints

- POST `/api/auth/register` - Inscription
- POST `/api/auth/login` - Connexion
- GET `/api/auth/me` - Profil
- POST `/api/documents` - Upload document
- GET `/api/documents` - Liste documents
- GET `/api/documents/:id` - Détails document
- POST `/api/documents/:id/download` - Enregistrer téléchargement
- DELETE `/api/documents/:id` - Supprimer document
- GET `/api/metadata/universities` - Liste universités
- GET `/api/metadata/courses` - Liste cours