from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import auth, users, maps, files

app = FastAPI(title="Admin Dashboard API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router,  prefix="/auth",  tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(maps.router,  prefix="/maps",  tags=["maps"])
app.include_router(files.router, prefix="/files", tags=["files"])


@app.get("/")
def root():
    return {"message": "Admin Dashboard API is running"}
