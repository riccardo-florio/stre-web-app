from flask import Flask, send_from_directory, jsonify, Response
import json
from pathlib import Path
from utils.app_functions import get_stre_domain, search, download
from scuapi import API

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

# Inizializza dominio e API subito
domain = get_stre_domain()
sc = API(domain)

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")

@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/api/get-stre-domain")
def get_main_domain():
    return jsonify(domain)

@app.route("/api/search/<query>")
def search_query(query):
    results = search(sc, query)
    return Response(
        json.dumps(results, ensure_ascii=False, sort_keys=False),
        content_type="application/json"
    )

@app.route("/api/download/<domain>/<id>")
def download_link(domain, id):
    download(domain, id)
    return

if __name__ == "__main__":
    app.run(debug=True)
