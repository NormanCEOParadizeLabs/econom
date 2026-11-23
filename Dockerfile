FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY v2/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY v2/api ./api
COPY v2/web ./web
RUN adduser --disabled-password --gecos '' yapr && chown -R yapr:yapr /app
USER yapr
EXPOSE 10000
CMD ["sh","-c","uvicorn api.server:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers"]
