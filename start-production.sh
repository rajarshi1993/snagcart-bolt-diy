#!/bin/bash
# Start the Vite dev server in background
pnpm run dev --host --port 5173 &
SERVER_PID=$!

# Wait for the server to be ready
echo "Waiting for server to start..."
for i in $(seq 1 60); do
  if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "Server is up! Warming up Vite deps..."
    # Make a request to trigger dep optimization
    curl -s http://localhost:5173 > /dev/null 2>&1
    sleep 5
    # Make another request after deps are optimized
    curl -s http://localhost:5173 > /dev/null 2>&1
    sleep 3
    echo "Warmup complete! Server is ready."
    break
  fi
  sleep 2
done

# Keep the script running (wait for the server process)
wait $SERVER_PID
