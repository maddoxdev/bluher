#!/bin/bash

echo "Starting VoIP Application Development Environment"
echo "================================================"

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "Error: Docker is not running. Please start Docker first."
    exit 1
fi

# Start infrastructure services
echo "Starting PostgreSQL, Redis, and TURN server..."
docker-compose up -d postgres redis coturn

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check if .NET is installed
if ! command -v dotnet &> /dev/null; then
    echo "Error: .NET SDK is not installed"
    exit 1
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed"
    exit 1
fi

# Start server in background
echo "Starting ASP.NET Core server..."
cd server
dotnet ef database update --no-build
dotnet run &
SERVER_PID=$!
cd ..

# Start client in background
echo "Starting Angular client..."
cd client
npm install
npm start &
CLIENT_PID=$!
cd ..

echo ""
echo "================================================"
echo "Development environment is running!"
echo "================================================"
echo "Client:     http://localhost:4200"
echo "Server:     http://localhost:5000"
echo "PostgreSQL: localhost:5432"
echo "Redis:      localhost:6379"
echo ""
echo "Press Ctrl+C to stop all services"

# Handle termination
trap "echo 'Stopping services...'; kill $SERVER_PID $CLIENT_PID; docker-compose down; exit" INT TERM

# Wait for processes
wait
