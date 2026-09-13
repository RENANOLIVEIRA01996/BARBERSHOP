/**
 * Upload de imagens — serviços, portfólio, barbeiros, logo/banner.
 */
import express from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { ok, fail } from '../utils.js';
import { requireAuth } from '../middleware/auth.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) return cb(new Error('Formato inválido. Use PNG, JPG, WEBP ou GIF.'));
    cb(null, true);
  },
});

const router = express.Router();
router.use(requireAuth);

// POST /api/upload — retorna o caminho público do arquivo
router.post('/', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) return fail(res, err.message || 'Falha no upload.');
    if (!req.file) return fail(res, 'Nenhum arquivo enviado.');
    return ok(res, { url: `/uploads/${req.file.filename}` });
  });
});

export default router;