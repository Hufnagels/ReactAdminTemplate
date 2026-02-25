## Project structure
ReactAdminTemplate/
├── frontend/               # Vite + React + TS
│   └── src/
│       ├── app/store.ts                   # Redux store
│       ├── features/
│       │   ├── auth/authSlice.ts          # JWT auth state
│       │   └── theme/themeSlice.ts        # dark/light toggle
│       ├── theme/muiTheme.ts              # MUI orange/dark themes
│       ├── routes/routes.tsx              # Routes config object
│       ├── components/layout/
│       │   ├── Sidebar.tsx                # MUI Drawer (permanent/temporary)
│       │   ├── Header.tsx                 # AppBar + avatar dropdown
│       │   └── MainLayout.tsx             # Layout wrapper
│       ├── pages/
│       │   ├── Landing.tsx                # Public landing page
│       │   ├── SignIn.tsx                 # Auth form
│       │   ├── Dashboard.tsx              # Stat cards + bar chart
│       │   ├── UserAccount.tsx            # Profile editor
│       │   ├── Typography.tsx             # All MUI type variants
│       │   ├── Charts.tsx                 # Bar + donut (Recharts)
│       │   ├── RidgelineChart.tsx         # D3.js joy plot
│       │   └── Table.tsx                  # Sortable + paginated table
│       ├── App.tsx                        # Router + protected routes
│       └── main.tsx                       # Redux Provider entry
└── backend/                # FastAPI
    ├── main.py              # App + CORS
    └── routes/
        ├── auth.py          # POST /auth/login → JWT
        └── users.py         # GET /users/me, GET /users

## To run
### Frontend:
```bash
cd frontend && npm run dev
```

### Backend:
```bash
cd backend && .venv/bin/uvicorn main:app --reload
```

Demo login: admin@example.com / password123

