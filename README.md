# ChatApp

A real-time chat application built with React, Node.js, Socket.io, and MongoDB.

## Tech Stack
- **Frontend:** React 18, Vite, Tailwind CSS
- **Backend:** Node.js, Express
- **Real-Time:** Socket.io
- **Database:** MongoDB + Mongoose
- **Auth:** JWT + bcrypt

## Getting Started

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### Setup

```bash
# Clone the repo
git clone <your-repo-url>

# Install server deps
cd server && npm install

# Install client deps
cd ../client && npm install
```

### Run in development

```bash
# Terminal 1 — server
cd server && npm run dev

# Terminal 2 — client
cd client && npm run dev
```

## Environment Variables
See `server/.env.example` for required variables.