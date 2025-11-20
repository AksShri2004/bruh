# Option A — use Python 3.10 so prebuilt wheels for numpy / scikit-learn are used
FROM python:3.10-slim

WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=8080

# Install pip build helpers
RUN pip install --upgrade pip setuptools wheel

COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# copy app and artifacts
COPY app.py /app/app.py
COPY test.py /app/test.py
COPY spam_model.pkl /app/spam_model.pkl
COPY tfidf_vectorizer.pkl /app/tfidf_vectorizer.pkl

EXPOSE 8080
CMD ["gunicorn", "app:app", "-b", "0.0.0.0:8080", "--workers", "2", "--timeout", "120"]
