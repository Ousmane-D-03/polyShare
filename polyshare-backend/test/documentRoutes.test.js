const request = require('supertest');
const express = require('express');

// Mock des controllers
jest.mock('../src/controllers/documentController', () => ({
  uploadDocument: (req, res) => res.status(201).json({ called: 'uploadDocument' }),
  getAllDocuments: (req, res) => res.status(200).json({ called: 'getAllDocuments' }),
  getMyDocuments: (req, res) => res.status(200).json({ called: 'getMyDocuments' }),
  getDocumentById: (req, res) => res.status(200).json({ called: 'getDocumentById' }),
  recordDownload: (req, res) => res.status(200).json({ called: 'recordDownload' }),
  deleteDocument: (req, res) => res.status(200).json({ called: 'deleteDocument' })
}));

// Mock des middlewares d'auth
jest.mock('../src/middleware/authMiddleware', () => ({
  requireAuth: (req, res, next) => { req.user = { id: 'user-1', karma_points: 5, role: 'user' }; next(); },
  optionalAuth: (req, res, next) => next()
}));

// Mock du middleware d'upload
jest.mock('../src/middleware/uploadMiddleware', () => ({
  upload: { single: () => (req, res, next) => next() },
  handleMulterError: (err, req, res, next) => { if (err) return res.status(400).json({ error: err.message }); next(); }
}));

// Mock des validators
jest.mock('../src/utils/validators', () => ({
  uploadDocumentValidation: (req, res, next) => next()
}));

const router = require('../src/routes/documentRoutes');
const app = express();
app.use(express.json());
app.use('/api/documents', router);

describe('Routes documents (unitaires, mocks)', () => {
  test('POST /api/documents -> uploadDocument', async () => {
    const res = await request(app)
      .post('/api/documents')
      .send({ title: 'Titre test', description: 'desc', course_id: '00000000-0000-0000-0000-000000000000' });

    expect(res.status).toBe(201);
    expect(res.body.called).toBe('uploadDocument');
  });

  test('GET /api/documents -> getAllDocuments', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(200);
    expect(res.body.called).toBe('getAllDocuments');
  });

  test('GET /api/documents/my/uploads -> getMyDocuments', async () => {
    const res = await request(app).get('/api/documents/my/uploads');
    expect(res.status).toBe(200);
    expect(res.body.called).toBe('getMyDocuments');
  });

  test('GET /api/documents/:id -> getDocumentById', async () => {
    const res = await request(app).get('/api/documents/123');
    expect(res.status).toBe(200);
    expect(res.body.called).toBe('getDocumentById');
  });

  test('POST /api/documents/:id/download -> recordDownload', async () => {
    const res = await request(app).post('/api/documents/123/download');
    expect(res.status).toBe(200);
    expect(res.body.called).toBe('recordDownload');
  });

  test('DELETE /api/documents/:id -> deleteDocument', async () => {
    const res = await request(app).delete('/api/documents/123');
    expect(res.status).toBe(200);
    expect(res.body.called).toBe('deleteDocument');
  });
});
