@echo off
echo ===========================================
echo   Founded AI - Quick Start
echo ===========================================
echo.

echo [1/3] Starting backend...
cd backend
start cmd /k "python -m venv venv && venv\Scripts\activate && pip install -r requirements.txt && uvicorn main:app --reload --port 8000"
cd ..

echo [2/3] Waiting for backend to start...
timeout /t 5 /nobreak > nul

echo [3/3] Starting frontend...
cd frontend
start cmd /k "npm install && npm run dev"
cd ..

echo.
echo Founded AI is starting!
echo   Frontend: http://localhost:5173
echo   Backend API: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo Demo Login: admin@founded.ai / founded2024
pause
