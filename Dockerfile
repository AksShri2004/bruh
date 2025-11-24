# Use Python 3.10
FROM python:3.10-slim

WORKDIR /app

# Copy requirements and then overwrite/append pinned versions
COPY requirements.txt /app/requirements.txt

# Install system build tools (sometimes needed for binary wheels)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc && \
    rm -rf /var/lib/apt/lists/*

# Upgrade pip and install pinned versions that match the pickle environment.
# We pin sklearn to 1.6.1 (the version mentioned in the warnings) and use a modern numpy range.
# Adjust these pins if you know the exact versions used to create the pickle.
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt && \
    pip install --no-cache-dir "numpy>=1.25,<2" "scikit-learn==1.6.1"

# Copy app files
COPY . /app

EXPOSE 5000

CMD ["python", "app.py"]
