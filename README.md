
# Bruh Spam — README

![bruh logo](file:///mnt/data/logo.jpg)

> **Live**  
> **Backend (microservice):** https://bruh-spam.onrender.com  
> **Frontend (web app):** https://bruh-spam.vercel.app/

---

## 1. Product Description

**Bruh Spam** is a lightweight, production-ready spam detection system consisting of:

### ✔️ Backend Microservice  
A Flask-based API hosted on Render that exposes a `/predict` endpoint.  
Send raw email text → get `spam` or `not spam` predictions using a trained ML model.

### ✔️ Gmail Add-on  
Integrated directly into Gmail using Google Apps Script.  
Users can open any email → click **“Check with model”** → get real-time predictions.

### ✔️ Frontend  
A simple, clean web interface hosted on Vercel for testing the model manually.

### Use Cases
- Email filtering  
- Automated spam triage  
- Inbox hygiene tools  
- SaaS integrations  
- Browser plugins  
- App-level spam verification  

---

## 2. Gmail Add‑on

The Gmail Add‑on appears in your Gmail right sidebar.  
When a user opens an email, the add-on:

1. Extracts subject + snippet  
2. Sends it to the Bruh Spam microservice  
3. Returns spam analysis immediately  
4. Allows labeling as `Model-Spam` / `Model-Not-Spam`

The add-on is ideal for end-users who want quick, reliable spam checking inside Gmail.

---

## 3. Frontend Website

The live demo (Vercel) showcases the microservice:

👉 **https://bruh-spam.vercel.app/**

Features:
- Minimal UI for manual spam testing  
- Input field for text  
- Instantly displays prediction  
- Great for users who don’t want to use code  
- Useful for debugging & verifying the service  

---

## 4. Use the Microservice in Your Code  
The Bruh Spam microservice is built to be easily used in any environment.

---

# 🔌 API Integration  
### Endpoint  
```
POST https://bruh-spam.onrender.com/predict
```

### Headers  
```
Content-Type: application/json
x-api-key: YOUR_API_KEY
```

### Body  
```json
{
  "email_text": "your email text here"
}
```

### Response  
```json
{
  "prediction": "spam"
}
```
OR  
```json
{
  "prediction": "not spam"
}
```

---

## 4.1 — Python Example

```python
import requests

API_URL = "https://bruh-spam.onrender.com/predict"
API_KEY = "YOUR_KEY"

payload = {"email_text": "Congratulations! You've won a prize!"}

headers = {
    "x-api-key": API_KEY,
    "Content-Type": "application/json"
}

resp = requests.post(API_URL, json=payload, headers=headers)
print(resp.status_code, resp.json())
```

---

## 4.2 — JavaScript (Node.js)

```javascript
const fetch = require("node-fetch");

const API_URL = "https://bruh-spam.onrender.com/predict";
const API_KEY = "YOUR_KEY";

async function checkSpam(text) {
  const res = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": API_KEY
    },
    body: JSON.stringify({ email_text: text })
  });

  console.log(await res.json());
}

checkSpam("Get rich quick!");
```

---

## 4.3 — Browser (CORS enabled)

```javascript
fetch("https://bruh-spam.onrender.com/predict", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "YOUR_KEY"
  },
  body: JSON.stringify({ email_text: "browser test email" })
})
  .then(res => res.json())
  .then(console.log);
```

---

## 4.4 — Google Apps Script (for Gmail Add-on)

```javascript
const API_URL = "https://bruh-spam.onrender.com/predict";
const API_KEY = PropertiesService.getScriptProperties().getProperty("API_KEY");

function callModel(text) {
  const res = UrlFetchApp.fetch(API_URL, {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify({ email_text: text }),
    headers: { "x-api-key": API_KEY },
    muteHttpExceptions: true
  });

  return JSON.parse(res.getContentText());
}
```

---

## 5. Troubleshooting

### ❌ 401 Unauthorized  
- API key missing or incorrect  
- Make sure header name is exactly `x-api-key`  

### ❌ 500 Internal Server Error  
- Missing model files (`.pkl`)  
- Wrong python/scikit-learn versions  

### ❌ CORS issues  
CORS is enabled, but recommended only for development.  
Use server-to-server requests in production.

---

## 6. Local Development

### Backend  
```bash
cd backend
docker build -t bruh-backend .
docker run -p 5000:5000 --env API_KEY=your_key bruh-backend
```

### Frontend  
```bash
cd frontend
npm install
npm run dev
```

---

## 7. Contributing

Pull Requests are welcome.  
Please don’t commit private API keys or secrets.

---

## 8. License  
MIT License

---

## 9. Contact  
Open an issue or reach out to the project owner for API key access or collaboration.

