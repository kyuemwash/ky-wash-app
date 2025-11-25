@echo off
REM KY Wash Backend Startup Script for Windows

echo.
echo KY Wash Backend Startup
echo ================================

REM Check if venv exists, if not create it
if not exist "venv\" (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo Installing dependencies...
pip install -r requirements.txt

REM Create .env if it doesn't exist
if not exist ".env" (
    echo Creating .env file...
    copy .env.example .env 2>nul || (
        echo Creating default .env
        type .env > .env
    )
)

REM Start the server
echo.
echo Starting KY Wash Backend server...
echo Access the API at: http://localhost:8000
echo API Docs at: http://localhost:8000/api/docs
echo Press Ctrl+C to stop the server
echo ================================
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

pause
