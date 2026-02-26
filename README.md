# ⚡ JetJot

> Sprint-based todo board — your plans, your pace.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white&style=flat-square)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=white&style=flat-square)
![Firebase](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black&style=flat-square)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3-06B6D4?logo=tailwindcss&logoColor=white&style=flat-square)
![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=white&style=flat-square)

---

## ✨ Features

| Feature | Details |
|---|---|
| 🗓 **Sprint Planning** | Create date-range sprints (up to 60 days) with a custom name |
| 📋 **Kanban Board** | Per-day columns with drag-and-drop todo reordering |
| ✅ **Subtasks** | Nested sub-tasks with drag-and-drop reordering |
| 🔁 **Recurring Todos** | Add a task to every day of the sprint at once, with undo |
| 🌤 **Weather** | Automatic weather forecast for each sprint day |
| 🗺 **Travel Log** | Pin locations on a map and attach a photo per day |
| 🔔 **Reminders** | Browser notifications for time-based todos |
| 🌙 **Dark Mode** | Persisted dark/light theme toggle |
| 🔗 **Share** | Copy a shareable sprint link for read-only viewing |
| 🛡 **Admin Panel** | User management, disable/delete accounts, sprint leaderboard |
| 📱 **PWA** | Installable on mobile/desktop, works offline |

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- A [Firebase](https://console.firebase.google.com) project with **Firestore** enabled

### 1. Clone the repo

```bash
git clone https://github.com/your-username/jetjot.git
cd jetjot
npm install
```

### 2. Configure environment

Create a `.env` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id

VITE_OPENWEATHER_API_KEY=your_openweather_api_key
```

> Get Firebase credentials from: **Firebase Console → Project Settings → Your Apps → Web App → Config**  
> Get a free weather key from: [openweathermap.org](https://openweathermap.org/api)

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## 🗂 Project Structure

```
src/
├── components/
│   ├── LoginPage.jsx       # Auth screen
│   ├── CalendarPage.jsx    # Home — sprint picker & history
│   ├── BoardPage.jsx       # Active sprint board
│   ├── DayColumn.jsx       # Single day column with todos
│   ├── TodoItem.jsx        # Todo card with subtasks & drag-drop
│   ├── AdminPage.jsx       # Admin dashboard
│   ├── MapView.jsx         # Leaflet travel map
│   ├── DayTravelLog.jsx    # Per-day photo + location log
│   └── Footer.jsx
├── context/
│   └── AppContext.jsx      # Global state (user, sprint, todos)
├── lib/
│   ├── auth.js             # Login / register logic (bcrypt)
│   ├── todos.js            # Firestore CRUD for todos & sprints
│   ├── travelLog.js        # Firestore CRUD for locations & photos
│   ├── admin.js            # Admin Firestore helpers
│   ├── weather.js          # OpenWeatherMap integration
│   ├── rateLimiter.js      # Client-side brute-force protection
│   └── imageUtils.js       # Image compression helpers
└── firebase.js             # Firebase app init
```

---

## 🔐 Admin Access

1. Log in with any account
2. In **Firebase Console → Firestore → users → `<your-username>`**, set `isAdmin: true`
3. Log out and back in
4. A shield icon appears in the navbar → click to open **Admin Panel**

From the Admin Panel you can promote other users to admin, disable/enable accounts, and view sprint stats.

---

## 🏗 Build & Deploy

```bash
# Production build
npm run build

# Preview the build locally
npm run preview
```

Deploy the `dist/` folder to any static host:
- [Vercel](https://vercel.com) — `vercel --prod`
- [Netlify](https://netlify.com) — drag & drop `dist/`
- [Firebase Hosting](https://firebase.google.com/docs/hosting) — `firebase deploy`

> **SPA routing**: Make sure your host is configured to serve `index.html` for all routes.

---

## 🛠 Tech Stack

- **React 19** + **Vite 5**
- **Firebase Firestore** (database)
- **Tailwind CSS** (styling)
- **Framer Motion** (animations)
- **React Router v7** (routing)
- **Lucide React** (icons)
- **bcryptjs** (password hashing)
- **Leaflet** (maps)
- **date-fns** (date utilities)
- **vite-plugin-pwa** (PWA support)

---

## 📄 License

MIT © [iTarunGM](https://github.com/itarungm)


The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
