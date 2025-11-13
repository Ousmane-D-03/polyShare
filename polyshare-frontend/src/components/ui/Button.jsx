import axios from 'axios';

// URL de base de l'API
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Instance Axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Intercepteur pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ============================================
// AUTH API
// ============================================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout')
};

// ============================================
// DOCUMENTS API
// ============================================
export const documentsAPI = {
  getAll: (params) => api.get('/documents', { params }),
  getById: (id) => api.get(`/documents/${id}`),
  upload: (formData) => api.post('/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  recordDownload: (id) => api.post(`/documents/${id}/download`),
  delete: (id) => api.delete(`/documents/${id}`),
  getMyUploads: () => api.get('/documents/my/uploads')
};

// ============================================
// METADATA API
// ============================================
export const metadataAPI = {
  getUniversities: () => api.get('/metadata/universities'),
  getFaculties: (universityId) => api.get('/metadata/faculties', {
    params: { university_id: universityId }
  }),
  getMajors: (facultyId) => api.get('/metadata/majors', {
    params: { faculty_id: facultyId }
  }),
  getCourses: (majorId) => api.get('/metadata/courses', {
    params: { major_id: majorId }
  })
};

export default api;
