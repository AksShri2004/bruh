# app.py (replace your current file with this)
import os
import pickle
from flask import Flask, request, jsonify, abort
from flask_cors import CORS

app = Flask(__name__)

# --- CORS ---
# For now we enable CORS for the /predict route from any origin.
# Change origins argument to a list of allowed origins (e.g. ["https://example.com"]) for production.
CORS(app)

# --- API key configuration ---
# Single admin key (optional) - set API_KEY on Render
ADMIN_KEY = os.environ.get("API_KEY")

# Multiple client keys (comma-separated) - set API_KEYS on Render
# Example: "key1,key2,key3"
raw_keys = os.environ.get("API_KEYS", "")
CLIENT_KEYS = set([k.strip() for k in raw_keys.split(",") if k.strip()])

def is_valid_key_from_request(req):
    # Accept either x-api-key header or Authorization: Bearer <key>
    key = req.headers.get("x-api-key")
    if not key:
        auth = req.headers.get("Authorization", "")
        if auth.lower().startswith("bearer "):
            key = auth.split(None, 1)[1].strip()
    if not key:
        return False
    if ADMIN_KEY and key == ADMIN_KEY:
        return True
    if key in CLIENT_KEYS:
        return True
    return False

# --- Load model and vectorizer (your existing code) ---
# Make sure the following files exist in the container: spam_model.pkl, tfidf_vectorizer.pkl
try:
    model = pickle.load(open('spam_model.pkl', 'rb'))
    tfidf = pickle.load(open('tfidf_vectorizer.pkl', 'rb'))
except Exception as e:
    # If loading fails, log and continue so the container starts; endpoints will return 500 when used.
    print("Model loading error:", repr(e))
    model = None
    tfidf = None

@app.route('/predict', methods=['POST'])
def predict_spam():
    # API key check
    if not is_valid_key_from_request(request):
        # 401 Unauthorized
        abort(401)

    if model is None or tfidf is None:
        return jsonify({'error': 'model not loaded'}), 500

    data = request.get_json(force=True, silent=True)
    if not data or 'email_text' not in data:
        return jsonify({'error': 'missing email_text field'}), 400

    email_text = data.get('email_text', '')
    try:
        email_vec = tfidf.transform([email_text])
        prediction = model.predict(email_vec)[0]
        label = 'spam' if prediction == 1 else 'not spam'
        return jsonify({'prediction': label})
    except Exception as e:
        # log exception details to server logs, but return safe message
        print("Prediction error:", repr(e))
        return jsonify({'error': 'prediction failed'}), 500

# Optional health endpoint
@app.route('/health', methods=['GET'])
def health():
    ok = model is not None and tfidf is not None
    return jsonify({'ok': ok})

if __name__ == "__main__":
    import os
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
