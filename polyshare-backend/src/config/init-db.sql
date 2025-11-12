-- ================================================
-- PolyShare Database Schema
-- ================================================

-- Supprimer les tables existantes (pour reset)
DROP TABLE IF EXISTS downloads CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS majors CASCADE;
DROP TABLE IF EXISTS faculties CASCADE;
DROP TABLE IF EXISTS universities CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Activer l'extension UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ================================================
-- TABLE: Universities
-- ================================================
CREATE TABLE universities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL UNIQUE,
  country VARCHAR(100) DEFAULT 'Sénégal',
  city VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- TABLE: Faculties (Facultés)
-- ================================================
CREATE TABLE faculties (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  university_id UUID NOT NULL REFERENCES universities(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, university_id)
);

-- ================================================
-- TABLE: Majors (Filières)
-- ================================================
CREATE TABLE majors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  faculty_id UUID NOT NULL REFERENCES faculties(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(name, faculty_id)
);

-- ================================================
-- TABLE: Courses (Matières/Cours)
-- ================================================
CREATE TABLE courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  semester INTEGER CHECK (semester >= 1 AND semester <= 10),
  major_id UUID NOT NULL REFERENCES majors(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(code, major_id)
);

-- ================================================
-- TABLE: Users
-- ================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username VARCHAR(100) NOT NULL,
  karma_points INTEGER DEFAULT 10 CHECK (karma_points >= 0),
  role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'moderator', 'admin')),
  university_id UUID REFERENCES universities(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- TABLE: Documents (Polycopiés)
-- ================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
  file_url VARCHAR(500) NOT NULL,
  file_size INTEGER CHECK (file_size > 0),
  file_hash VARCHAR(64) UNIQUE,
  downloads_count INTEGER DEFAULT 0 CHECK (downloads_count >= 0),
  status VARCHAR(20) DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ================================================
-- TABLE: Downloads (Historique des téléchargements)
-- ================================================
CREATE TABLE downloads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  downloaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, document_id, downloaded_at)
);

-- ================================================
-- INDEX pour optimisation des requêtes
-- ================================================
CREATE INDEX idx_faculties_university ON faculties(university_id);
CREATE INDEX idx_majors_faculty ON majors(faculty_id);
CREATE INDEX idx_courses_major ON courses(major_id);
CREATE INDEX idx_documents_course ON documents(course_id);
CREATE INDEX idx_documents_uploader ON documents(uploaded_by);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_downloads_user ON downloads(user_id);
CREATE INDEX idx_downloads_document ON downloads(document_id);
CREATE INDEX idx_users_email ON users(email);

-- ================================================
-- DONNÉES DE TEST - UCAD
-- ================================================

-- Université
INSERT INTO universities (name, country, city) VALUES 
  ('Université Cheikh Anta Diop (UCAD)', 'Sénégal', 'Dakar'),
  ('Université Gaston Berger (UGB)', 'Sénégal', 'Saint-Louis');

-- Facultés UCAD
INSERT INTO faculties (name, university_id) 
SELECT 'Faculté des Sciences et Techniques', id FROM universities WHERE name LIKE '%UCAD%'
UNION ALL
SELECT 'Faculté des Lettres et Sciences Humaines', id FROM universities WHERE name LIKE '%UCAD%'
UNION ALL
SELECT 'Faculté de Médecine', id FROM universities WHERE name LIKE '%UCAD%';

-- Filières (Informatique à la FST)
INSERT INTO majors (name, faculty_id)
SELECT 'Licence Informatique', id FROM faculties WHERE name = 'Faculté des Sciences et Techniques'
UNION ALL
SELECT 'Master Informatique', id FROM faculties WHERE name = 'Faculté des Sciences et Techniques'
UNION ALL
SELECT 'Licence Mathématiques', id FROM faculties WHERE name = 'Faculté des Sciences et Techniques';

-- Cours pour Licence Informatique (Semestre 3)
INSERT INTO courses (name, code, semester, major_id)
SELECT 'Algorithmique et Structures de Données', 'INFO301', 3, id 
FROM majors WHERE name = 'Licence Informatique'
UNION ALL
SELECT 'Base de Données', 'INFO302', 3, id 
FROM majors WHERE name = 'Licence Informatique'
UNION ALL
SELECT 'Programmation Orientée Objet', 'INFO303', 3, id 
FROM majors WHERE name = 'Licence Informatique'
UNION ALL
SELECT 'Systèmes d''Exploitation', 'INFO304', 3, id 
FROM majors WHERE name = 'Licence Informatique'
UNION ALL
SELECT 'Réseaux Informatiques', 'INFO305', 3, id 
FROM majors WHERE name = 'Licence Informatique';

-- Utilisateur de test (password: test123)
-- Hash bcrypt pour "test123" avec salt 10
INSERT INTO users (email, password_hash, username, karma_points, university_id)
SELECT 
  'test@ucad.sn',
  '$2b$10$rH5H5vZhZQXJKYxYxYxYxOeKjH5H5vZhZQXJKYxYxYxYxYxYxYxYx',
  'TestUser',
  50,
  id
FROM universities WHERE name LIKE '%UCAD%';

-- ================================================
-- FUNCTIONS & TRIGGERS
-- ================================================

-- Fonction pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger pour users
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger pour documents
CREATE TRIGGER update_documents_updated_at 
  BEFORE UPDATE ON documents 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- Vue pour récupérer les documents avec toutes les infos
-- ================================================
CREATE OR REPLACE VIEW documents_full_info AS
SELECT 
  d.id,
  d.title,
  d.description,
  d.file_url,
  d.file_size,
  d.downloads_count,
  d.status,
  d.created_at,
  d.updated_at,
  -- Course info
  c.name as course_name,
  c.code as course_code,
  c.semester,
  -- Major info
  m.name as major_name,
  -- Faculty info
  f.name as faculty_name,
  -- University info
  u.name as university_name,
  u.city as university_city,
  -- Uploader info
  up.username as uploaded_by_username,
  up.id as uploaded_by_id
FROM documents d
JOIN courses c ON d.course_id = c.id
JOIN majors m ON c.major_id = m.id
JOIN faculties f ON m.faculty_id = f.id
JOIN universities u ON f.university_id = u.id
LEFT JOIN users up ON d.uploaded_by = up.id;

-- ================================================
-- FIN DU SCRIPT
-- ================================================
