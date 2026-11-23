FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 APP_ENV=production
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-dejavu-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY yapr-source.tar.gz /tmp/yapr-source.tar.gz
RUN tar -xzf /tmp/yapr-source.tar.gz -C /app && pip install --no-cache-dir -r requirements.txt && rm /tmp/yapr-source.tar.gz
RUN useradd --create-home yapr && mkdir -p /app/runtime && chown yapr:yapr /app/runtime
USER yapr
EXPOSE 10000
CMD ["sh","-c","uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-10000} --proxy-headers"]
