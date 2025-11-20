import requests, json

URL = "http://127.0.0.1:8080/predict"   # ← updated port for container
payload = {"email_text": "You won a prize! Click here to claim."}
resp = requests.post(URL, json=payload)
print(resp.status_code)
print(resp.text)
