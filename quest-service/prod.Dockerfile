FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Using uv instead of pip
COPY --from=ghcr.io/astral-sh/uv:0.6.7 /uv /uvx /bin/
ENV UV_LINK_MODE=copy

COPY quest-service/requirements.txt ./requirements.txt
RUN --mount=type=cache,target=/root/.cache/uv \
    uv pip install --system -r requirements.txt

COPY shared/ ./shared/
COPY quest-service/ ./

RUN cp shared/models/language_content.py app/models/language_content.py && \
    cp shared/models/base.py app/models/base.py

RUN python -m compileall -q /usr/local/lib/python3.12/site-packages

# Switch to the non-root user
RUN useradd -m -d /usr/src/app appuser && \
    chown -R appuser:appuser /usr/src/app
USER appuser

CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
