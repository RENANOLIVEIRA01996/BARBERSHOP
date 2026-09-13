/*
 * Schema completo do banco de dados HENRIQUE BARBER - PostgreSQL.
 */
import { db } from './db.js';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
    id            SERIAL PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role          TEXT NOT NULL DEFAULT 'admin',
    active        INTEGER NOT NULL DEFAULT 1,
    created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbershops (
    id               INTEGER PRIMARY KEY CHECK (id = 1),
    name             TEXT NOT NULL DEFAULT 'HENRIQUE BARBER',
    slug             TEXT NOT NULL DEFAULT 'henrique-barber',
    logo_principal   TEXT,
    logo_horizontal  TEXT,
    icone            TEXT,
    banner           TEXT,
    perfil_social    TEXT,
    wallpaper        TEXT,
    simbolo          TEXT,
    favicon          TEXT,
    textura          TEXT,
    tagline          TEXT NOT NULL DEFAULT 'Barbearia premium',
    description      TEXT NOT NULL DEFAULT 'Experiência premium em cortes e barba.',
    phone            TEXT,
    whatsapp         TEXT,
    instagram        TEXT,
    address          TEXT,
    cep              TEXT,
    city             TEXT,
    state            TEXT,
    map_url          TEXT,
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS barbers (
    id           SERIAL PRIMARY KEY,
    name         TEXT NOT NULL,
    slug         TEXT NOT NULL,
    photo        TEXT,
    description  TEXT,
    phone        TEXT,
    whatsapp     TEXT,
    specialties  TEXT NOT NULL DEFAULT '[]',
    status       TEXT NOT NULL DEFAULT 'active',
    position     INTEGER NOT NULL DEFAULT 0,
    created_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS services (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    description      TEXT,
    photo            TEXT,
    price            REAL NOT NULL,
    duration_minutes INTEGER NOT NULL,
    status           TEXT NOT NULL DEFAULT 'active',
    position         INTEGER NOT NULL DEFAULT 0,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customers (
    id               SERIAL PRIMARY KEY,
    name             TEXT NOT NULL,
    whatsapp         TEXT UNIQUE,
    email            TEXT,
    notes            TEXT,
    first_visit_at   TIMESTAMP WITH TIME ZONE,
    last_visit_at    TIMESTAMP WITH TIME ZONE,
    visits_count     INTEGER NOT NULL DEFAULT 0,
    total_spent      REAL NOT NULL DEFAULT 0,
    created_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS appointments (
    id             SERIAL PRIMARY KEY,
    code           TEXT NOT NULL UNIQUE,
    customer_id    INTEGER NOT NULL,
    service_id     INTEGER NOT NULL,
    barber_id      INTEGER,
    date           DATE NOT NULL,
    start_time     TIME NOT NULL,
    end_time       TIME NOT NULL,
    value          REAL NOT NULL,
    status         TEXT NOT NULL DEFAULT 'scheduled',
    payment_method TEXT,
    notes          TEXT,
    created_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
    FOREIGN KEY (service_id)  REFERENCES services(id)  ON DELETE RESTRICT,
    FOREIGN KEY (barber_id)   REFERENCES barbers(id)   ON DELETE SET NULL
);
`;

export function initSchema() {
    return db.query(SCHEMA);
}