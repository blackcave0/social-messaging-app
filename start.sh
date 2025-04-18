#!/bin/bash

# Get the current IP address (used for the frontend to connect to backend)
if command -v ipconfig &> /dev/null; then
    # Windows
    IP_ADDRESS=$(ipconfig | grep -i "IPv4" | head -1 | awk '{print $NF}')
else
    # Linux/Mac
    IP_ADDRESS=$(ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1)
fi

echo "Your IP address is: $IP_ADDRESS"

# Update config.ts with actual IP
sed -i.bak "s|http://10.0.2.2:5000|http://$IP_ADDRESS:5000|g" frontend/src/utils/config.ts
echo "Updated frontend/src/utils/config.ts with IP: $IP_ADDRESS"

# Start backend in background
echo "Starting backend server..."
cd backend && npm run dev &
BACKEND_PID=$!

# Wait for backend to start
sleep 5

# Start frontend
echo "Starting frontend..."
cd frontend && npm start

# Clean up when frontend is closed
kill $BACKEND_PID 