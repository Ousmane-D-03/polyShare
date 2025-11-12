const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });


const app = express();
const PORT = process.env.PORT || 5000;

// ==============================================
// MIDDLEWARE
// ==============================================

// Sécurité
app.use(helmet());

// CORS - Autoriser le frontend à communiquer
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

// Parser le JSON dans les requêtes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir les fichiers uploadés (pour le MVP)
app.use('/uploads', express.static('uploads'));

// Logger les requêtes en développement
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ==============================================
// ROUTES
// ==============================================

// Import des routes
const authRoutes = require('./routes/authRoutes');
const documentRoutes = require('./routes/documentRoutes');
const metadataRoutes = require('./routes/metadataRoutes');

// Monter les routes
app.use('/api/auth', authRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/metadata', metadataRoutes);

// Route de test
app.get('/', (req, res) => {
  res.json({ 
    message: 'PolyShare API is running! 🚀',
    version: '1.0.0',
    status: 'OK',
    endpoints: {
      auth: '/api/auth',
      users: '/api/users',
      documents: '/api/documents'
    }
  });
});

// Health check (pour vérifier que le serveur tourne)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API endpoint is working!',
    data: {
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    }
  });
});

// ==============================================
// ERROR HANDLERS
// ==============================================

// 404 - Route non trouvée
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} non trouvée`
  });
});

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Erreur serveur interne',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack,
      error: err 
    })
  });
});

// ==============================================
// DÉMARRAGE DU SERVEUR
// ==============================================

app.listen(PORT, () => {
  console.log('='.repeat(50));
  console.log('🚀 PolyShare API Server');
  console.log('='.repeat(50));
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌍 Server: http://localhost:${PORT}`);
  console.log(`💚 Health: http://localhost:${PORT}/health`);
  console.log(`🧪 Test: http://localhost:${PORT}/api/test`);
  console.log('='.repeat(50));
});