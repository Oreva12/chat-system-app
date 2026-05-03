# ChatApp

A real-time chat application built with React, Node.js, Socket.io, and MongoDB.

## Live Demo
> Coming end of Week 4

## Features (Week 1 Complete)
- ✅ User registration and login with JWT authentication
- ✅ Secure password hashing with bcrypt
- ✅ httpOnly refresh token cookie strategy
- ✅ Protected routes — unauthenticated users redirected to login
- ✅ Session persistence on page refresh
- ✅ 16 automated auth tests passing

## Tech Stack
| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, React Router v6 |
| Backend | Node.js, Express |
| Real-Time | Socket.io (Week 2) |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcrypt |
| Testing | Jest + Supertest |
| Deployment | Vercel + Railway (Week 4) |

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB Atlas account

### Setup

```bash
git clone <your-repo-url>
cd chat-system-app

# Server
cd server
npm install
cp .env.example .env   # fill in your values

# Client
cd ../client
npm install
cp .env.example .env
```

### Run in Development

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

### Run Tests

```bash
cd server && npm test
```

## Project Structure

```
chat-system-app/
├── client/          # React SPA
└── server/          # Express API
    └── src/
        ├── controllers/
        ├── middleware/
        ├── models/
        ├── routes/
        └── tests/
```