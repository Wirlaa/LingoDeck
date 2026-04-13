FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev && rm -rf /var/lib/apt/libs/*

# requirements.txt lives in card-service/
COPY card-service/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# shared models from repo-root/shared
COPY shared/ ./shared/

# copy card-service source into the image
COPY card-service/ ./

RUN cp shared/models/language_content.py app/models/language_content.py && \
    cp shared/models/base.py app/models/base.py

EXPOSE 8002
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002"]