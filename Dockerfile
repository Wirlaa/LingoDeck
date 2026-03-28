FROM python:3.12-slim

# Set working directory inside the container
WORKDIR /app

# Install system dependencies needed to build asyncpg and other packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first so Docker can cache this layer
# If requirements.txt hasn't changed, Docker skips pip install on rebuild
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application code
COPY . .

# Expose the port uvicorn will listen on
EXPOSE 8000

# Start the server
# - app.main:app  tells uvicorn where to find the FastAPI instance
# - --host 0.0.0.0  makes it reachable from outside the container
# - --port 8000  the port it listens on
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
