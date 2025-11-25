#!/bin/bash
# KY Wash Backend Startup Script

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}KY Wash Backend Startup${NC}"
echo "================================"

# Check Python version
echo -e "${YELLOW}Checking Python version...${NC}"
python_version=$(python --version 2>&1 | awk '{print $2}')
echo "Python version: $python_version"

# Check if venv exists, if not create it
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Creating virtual environment...${NC}"
    python -m venv venv
fi

# Activate virtual environment
echo -e "${YELLOW}Activating virtual environment...${NC}"
source venv/bin/activate

# Install/upgrade dependencies
echo -e "${YELLOW}Installing dependencies...${NC}"
pip install -r requirements.txt

# Create .env if it doesn't exist
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}Creating .env file from template...${NC}"
    cp .env.example .env 2>/dev/null || echo "No .env.example found, using default .env"
fi

# Start the server
echo -e "${GREEN}Starting KY Wash Backend server...${NC}"
echo "Access the API at: http://localhost:8000"
echo "API Docs at: http://localhost:8000/api/docs"
echo "Press Ctrl+C to stop the server"
echo "================================"

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
