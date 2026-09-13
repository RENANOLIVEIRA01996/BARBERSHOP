# HENRIQUE BARBER

Sistema de agendamento para barbearia — backend + frontend, 100% independentes.

---

## 🔒 Portas (IMPORTANTE — conflitos evitados)

Nesta máquina, as portas padrão abaixo **pertencem a OUTROS projetos** e **NÃO** devem ser usadas:

| Porta | Dono | Uso no Henrique Barber |
|-------|------|------------------------|
| 3000 | Outro projeto (Evolution Manager / Docker) | **NÃO usar** |
| 5173 | Outro projeto (Vite padrão) | **NÃO usar** |
| **3333** | **HENRIQUE BARBER** | Backend (API) |
| **5174** | **HENRIQUE BARBER** | Frontend (Vite) |

> A porta 3333 foi escolhida por estar livre; a porta 5174 evita o conflito com 5173.

---

## 🚀 Como rodar

### 1. Backend (porta 3333)

```bash
cd server
npm install
copy .env.example .env   # Windows
# edite o .env se necessário
npm run dev
```

API em: `http://localhost:3333`

Health check: `http://localhost:3333/api/health`

### 2. Frontend (porta 5174)

```bash
cd web
npm install
copy .env.example .env   # Windows
npm run dev
```

Frontend em: `http://localhost:5174`

Agendamento público: `http://localhost:5174/agendar`

---

## 📌 Configuração de variáveis de ambiente

### Backend (`server/.env`)

| Variável | Descrição |
|----------|-----------|
| `PORT` | Porta do servidor (use `3333` nesta máquina) |
| `DATABASE_URL` | URL do PostgreSQL (produção) |
| `JWT_SECRET` | Segredo do token JWT |
| `CORS_ORIGIN` | Origem permitida no CORS (frontend) |
| `PUBLIC_BASE_URL` | URL pública da aplicação |

### Frontend (`web/.env`)

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL base da API (BACKEND) — `http://localhost:3333` |

> **Nunca** use `localhost:3000` ou `:5173` para o Henrique Barber — são de outros projetos.

---

## 🗂️ Estrutura

```
BARBERSHOP/
├── server/          # Backend (Node + Express)
│   └── src/
│       ├── routes/
│       ├── middleware/
│       └── ...
└── web/             # Frontend (Vite + React)
    └── src/
        ├── pages/
        └── ...
```

---

## ✅ Verificação rápida

1. Backend respondendo: `Invoke-RestMethod http://localhost:3333/api/health`
2. Dados públicos: `Invoke-RestMethod http://localhost:3333/api/public/shop`
3. Frontend servindo: abrir `http://localhost:5174`
4. Agendamento: `http://localhost:5174/agendar` → escolher serviço, barbeiro, data, horário e confirmar