# ClaudeForge - Angular 19 Frontend

Modern, production-ready Angular frontend for AI SaaS platform with SSE streaming.

## ✨ Features

- ✅ **Angular 19** with standalone components
- ✅ **SSE Streaming** for real-time AI responses  
- ✅ **JWT Authentication** with auto-refresh
- ✅ **Optimistic UI** for instant feedback
- ✅ **Signals API** for reactive state management
- ✅ **TypeScript** strict mode
- ✅ **Lazy Loading** routes
- ✅ **HTTP Interceptors** for auth & errors

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start
# Navigate to http://localhost:4200

# Backend proxy configured to http://localhost:3000
```

## 📁 Project Structure

```
src/
├── app/
│   ├── auth/                  # Authentication
│   │   └── services/
│   │       └── auth.service.ts
│   ├── chat/                  # Chat with SSE streaming
│   │   ├── components/
│   │   │   └── chat-container.component.ts
│   │   └── services/
│   │       └── chat.service.ts
│   ├── core/                  # Core services
│   │   └── interceptors/
│   │       └── http.interceptor.ts
│   └── shared/                # Shared models
│       └── models/
│           └── index.ts
├── environments/              # Environment configs
└── styles.scss               # Global styles
```

## 🔧 Configuration

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  apiUrl: '/api/v1',  // Proxied to backend
  apiTimeout: 30000,
  tokenRefreshThreshold: 300000,
};
```

## 📦 Build

```bash
# Development build
npm run build

# Production build (optimized)
npm run build:prod

# Output: dist/claudeforge-frontend/
```

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests (if configured)
npm run e2e
```

## 🎯 Key Technologies

| Technology | Version | Purpose |
|-----------|---------|---------|
| Angular | 19.x | Framework |
| TypeScript | 5.5.x | Type safety |
| RxJS | 7.8.x | Reactive programming |
| Fetch API | Native | SSE streaming |

## 🔐 Authentication Flow

1. User logs in → receives JWT + refresh token
2. Access token stored in localStorage
3. HTTP interceptor adds token to requests
4. Auto-refresh on 401 errors
5. Logout clears tokens

## 💬 Chat Streaming Flow

1. User sends message → optimistic UI update
2. POST to `/api/v1/chat/conversations/:id/messages`
3. Accept: `text/event-stream` header
4. Fetch API reads SSE stream
5. Real-time UI updates as tokens arrive
6. Message finalized on `done` event

## 🎨 Styling

Plain CSS with BEM methodology (no external CSS framework).

**Easy to integrate:**
- Tailwind CSS
- Angular Material
- Bootstrap
- PrimeNG

## 📊 Performance

- ✅ OnPush change detection (via signals)
- ✅ Lazy loaded routes
- ✅ Tree-shakeable standalone components
- ✅ Production build < 500KB

## 🚀 Deployment

### Netlify / Vercel
```bash
npm run build:prod
# Upload dist/ folder
```

### Nginx
```nginx
server {
  listen 80;
  root /var/www/html;
  
  location / {
    try_files $uri $uri/ /index.html;
  }
  
  location /api {
    proxy_pass http://backend:3000;
  }
}
```

### Docker
```dockerfile
FROM nginx:alpine
COPY dist/claudeforge-frontend /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
```

## 📚 Documentation

See `IMPLEMENTATION.md` for detailed architecture guide.

## 🤝 Backend Integration

Works with NestJS backend:
- Auth endpoints: `/api/v1/auth/*`
- Chat endpoints: `/api/v1/chat/*`
- Dashboard: `/api/v1/usage/*`
- Admin: `/api/v1/admin/*`

## 🔮 Future Enhancements

- [ ] PWA support
- [ ] Markdown rendering
- [ ] Code syntax highlighting
- [ ] File upload
- [ ] Dark mode
- [ ] Internationalization (i18n)

## 📄 License

MIT

---

Built with ❤️ using Angular 19
