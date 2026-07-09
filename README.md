# ChatApp

> A production-quality real-time chat application built in 4 weeks.

🔴 **[Live Demo](https://your-app.vercel.app)**  
🎥 **[Demo Video](https://loom.com/your-video-link)**

---

## Screenshots

### Chat Interface
![Chat](screenshots/chat.png)

### Mobile View
![Mobile](screenshots/mobile.png)

### Room Permissions
![Permissions](screenshots/permissions.png)

---

## Features

### 🔐 Authentication
- JWT access token (15min) + httpOnly refresh cookie
- bcrypt password hashing (cost factor 12)
- Protected routes with session persistence
- Rate limiting on auth endpoints

### 💬 Real-Time Messaging
- Socket.io with JWT auth on every handshake
- Sent / Delivered / Seen ticks (like WhatsApp)
- Edit and delete messages (soft delete)
- Emoji picker with cursor-position insertion
- Image sharing with fullscreen viewer
- Typing indicators + online presence

### 🏠 Rooms & Permissions
- Public rooms — anyone joins freely
- Private rooms — admin approval required  
- Invite-only rooms — hidden, direct invite only
- Direct Messages — private 1-on-1 conversations
- Real-time notification system

### 🎨 UI & Accessibility
- Tailwind CSS design system
- Fully responsive — mobile sidebar, touch-friendly
- ARIA labels, keyboard navigation, focus trapping
- Screen reader support with live announcements
- Lighthouse 85+ score

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, Tailwind CSS |
| Backend | Node.js, Express |
| Real-Time | Socket.io |
| Database | MongoDB Atlas |
| Auth | JWT + bcrypt |
| Deployment | Vercel + Railway |

## Architecture Decisions

**Why Socket.io over raw WebSockets?**  
Automatic reconnection, room abstractions, and long-polling fallback.

**Why soft delete for messages?**  
Hard deleting creates conversation gaps. Soft delete preserves thread integrity — the same approach used by Slack and WhatsApp.

**Why cursor-based pagination?**  
Offset pagination breaks when new messages arrive. Cursor pagination is stable regardless of inserts.

**Why two-token JWT auth?**  
Short-lived access token limits exposure window. httpOnly refresh token is inaccessible to JavaScript — immune to XSS.

## Getting Started

```bash
git clone https://github.com/yourusername/chat-system-app
cd chat-system-app

# Server
cd server && npm install && cp .env.example .env

# Client  
cd ../client && npm install && cp .env.example .env

# Run
cd ../server && npm run dev   # Terminal 1
cd ../client && npm run dev   # Terminal 2
```

## Tests

```bash
cd server && npm test
# 16 tests — all passing ✅
```