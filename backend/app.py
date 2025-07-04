from flask import Flask, send_from_directory, jsonify, Response, request
from asyncio import sleep
from flask_socketio import SocketIO
import json
from pathlib import Path
from utils.app_functions import get_stre_domain, search, download_with_socket, cancel_download
from scuapi import API

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

# Inizializza dominio e API subito
domain = get_stre_domain()
sc = API(domain)

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
socketio = SocketIO(app)

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

@app.route("/api/download/<domain>/<filmid>/<socketid>")
async def download_link(domain, filmid, socketid):
    await download_with_socket(domain, filmid, socketio, sid=socketid)
    return jsonify({"status": "started"})  # 👈 Risposta valida

@socketio.on("cancel_download")
def handle_cancel_download():
    sid = request.sid
    cancel_download(sid)
    emit("download_cancelled", {"status": "cancelled"}, to=sid)

if __name__ == "__main__":
    socketio.run(app, debug=True)
