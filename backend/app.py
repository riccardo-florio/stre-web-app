from flask import Flask, send_from_directory, jsonify, Response, request
from asyncio import sleep
from flask_socketio import SocketIO, emit
import json
from pathlib import Path
from utils.app_functions import (
    get_stre_domain,
    search,
    get_info,
    get_extended_info,
    download_with_socket,
    cancel_download,
    get_download_state,
)
from scuapi import API
from utils.fixed_api import API as FixedAPI

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

# Inizializza dominio e API subito
domain = get_stre_domain()
sc = API(domain)

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
socketio = SocketIO(app)

@socketio.on("connect")
def handle_connect():
    sid = request.sid
    state = get_download_state()
    if state.get("downloading") and state.get("progress"):
        emit("download_started", {"title": state.get("title")}, to=sid)
        emit("download_progress", state.get("progress"), to=sid)

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

@app.route("/api/getinfo/<slug>")
def get_title_info(slug):
    results = get_info(sc, slug)
    return jsonify(results)

@app.route("/api/get-extended-info/<slug>")
def get_full_info(slug):
    new_sc = FixedAPI(domain)
    results = get_extended_info(new_sc, slug)
    return jsonify(results)

@socketio.on("start_download")
def handle_start_download(data):
    domain = data.get("domain")
    filmid = data.get("filmid")
    episodeid = data.get("episodeid")
    title = data.get("title")
    series = data.get("series")
    season = data.get("season")
    episode_name = data.get("episode_name")
    episode_number = data.get("episode")
    sid = request.sid
    print(f"[INFO] Avvio download per {filmid} dal dominio {domain} (SID: {sid})")
    # Avvia il download in un thread
    socketio.start_background_task(
        download_with_socket,
        domain,
        filmid,
        socketio,
        sid,
        episodeid,
        title,
        series,
        season,
        episode_name,
        episode_number,
    )

@socketio.on("cancel_download")
def handle_cancel_download():
    sid = request.sid
    cancel_download(sid)
    emit("download_cancelled", {"status": "cancelled"}, broadcast=True)

if __name__ == "__main__":
    socketio.run(app, debug=True)
