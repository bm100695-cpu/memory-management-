# 🤖 Personal AI Agent — JARVIS

A voice-first, full-stack personal AI assistant supporting Hindi, English, and Hinglish. Runs on your laptop with persistent memory, daily task journaling, browser automation, and AI-powered chat.

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite + Tailwind CSS |
| Backend | Node.js + Express |
| Database | MongoDB Atlas + Mongoose |
| AI | Configurable LLM (OpenAI / Gemini / local) |
| Voice | Web Speech API + TTS (ElevenLabs / OpenAI TTS) |
| Browser | Chrome Extension (Manifest V3) |
| Auth | JWT (access + refresh tokens) |

---

## 📁 Project Structure

```
personal-ai-agent/
  frontend/          # React + Vite + Tailwind
  backend/           # Node.js + Express API
    src/
      config/        # DB, env, constants
      middleware/    # Auth, rate-limit, validation, error
      models/        # Mongoose schemas
      routes/        # Express routers
      controllers/   # Request handlers
      services/      # Business logic (ai, memory, tasks, voice...)
      validators/    # Joi/Zod schemas
      jobs/          # Scheduled jobs (daily summary, etc.)
      utils/         # Helpers, logger
      app.js
      server.js
  chrome-extension/  # MV3 Chrome Extension
  docs/              # Architecture & API docs
  .env.example
  .gitignore
```

---

## ⚡ Quick Start

### Prerequisites
- Node.js 20+
- MongoDB Atlas account (or local MongoDB)
- npm 10+

### 1. Clone & install

```bash
cd personal-ai-agent

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### 2. Configure environment

```bash
cp .env.example backend/.env
# Edit backend/.env with your keys
```

### 3. Run development servers

```bash
# Terminal 1 — backend
cd backend && npm run dev

# Terminal 2 — frontend
cd frontend && npm run dev
```

Backend: http://localhost:5000  
Frontend: http://localhost:5173

---

## 🔑 Environment Variables

See `.env.example` for all required variables.

---

## 🧪 Testing

```bash
cd backend && npm test
```

---

## 📋 Implementation Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ Complete | Project structure, architecture, security baseline |
| 2 | ✅ Complete | Authentication, JWT access & refresh tokens, password hashing |
| 3 | ✅ Complete | Daily tasks, CRUD, date-based work history, priority tracking |
| 4 | ✅ Complete | Long-term memory engine with tags, search, and category indexing |
| 5 | ✅ Complete | Voice-first chat with Hindi, English, and Hinglish multi-lingual NLP |
| 6 | ✅ Complete | Chrome Extension (Manifest V3) for browser form auto-filling |
| 7 | ✅ Complete | Daily summary generator, cron scheduler, journal narrative |
| 8 | ✅ Complete | Modern dark-mode UI with cards, glassmorphism, responsive sidebar |
| 9 | ✅ Complete | Security, data sovereignty, GDPR full JSON export, audit logging |
| 10 | ✅ Complete | Production bundle verified, test suite, and complete documentation |

---

## 🔒 Security Notes

- Never commit `.env` files.
- API keys are server-side only.
- JWT tokens use httpOnly cookies for refresh.
- All routes require authentication except `/api/auth/*`.
- Rate limiting is applied to all routes.
- Input validation on every endpoint.
