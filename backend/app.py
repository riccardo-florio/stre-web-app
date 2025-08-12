from flask import Flask, send_from_directory, jsonify, Response, request
from asyncio import sleep
from flask_socketio import SocketIO, emit
import json
from pathlib import Path
from uuid import uuid4
from models import db, User, VideoProgress
from utils.app_functions import (
    refresh_stre_domain,
    search,
    get_info,
    get_extended_info,
    download_with_socket,
    cancel_download,
    get_download_state,
    check_connection,
    get_git_version,
    get_links
)
from scuapi import API
from utils.fixed_api import API as FixedAPI

BASE_DIR = Path(__file__).resolve().parent
FRONTEND_DIR = BASE_DIR.parent / "frontend"

# Wrapper per dominio e API aggiornabile


class StreAPI:
    def __init__(self):
        self.domain = refresh_stre_domain()
        self.sc = API(self.domain)
        self.fixed_sc = FixedAPI(self.domain)

    def refresh(self):
        self.domain = refresh_stre_domain()
        self.sc = API(self.domain)
        self.fixed_sc = FixedAPI(self.domain)


stre = StreAPI()

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

with app.app_context():
    db.create_all()

socketio = SocketIO(app)

@socketio.on("connect")
def handle_connect():
    sid = request.sid
    states = get_download_state()
    emit("active_downloads", {
        dl_id: {
            "title": state.get("title"),
            "progress": state.get("progress"),
        }
        for dl_id, state in states.items()
    }, to=sid)
    for dl_id, state in states.items():
        if state.get("title"):
            emit("download_started", {"title": state.get("title"), "id": dl_id}, to=sid)
        if state.get("progress"):
            emit("download_progress", {**state.get("progress"), "id": dl_id}, to=sid)

@app.route("/")
def home():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/api/get-stre-domain")
def get_main_domain():
    return jsonify(stre.domain)

@app.route("/api/get-app-version")
def get_app_version():
    return jsonify(get_git_version())

@app.route("/api/refresh-domain", methods=["POST"])
def refresh_domain():
    stre.refresh()
    return jsonify({"domain": stre.domain})

@app.route("/api/check-domain/<domain_to_check>")
def check_domain(domain_to_check):
    reachable = check_connection(domain_to_check)
    return jsonify({"reachable": reachable})

@app.route("/api/search/<query>")
def search_query(query):
    results = search(stre.sc, query)
    return Response(
        json.dumps(results, ensure_ascii=False, sort_keys=False),
        content_type="application/json"
    )

@app.route("/api/getinfo/<slug>")
def get_title_info(slug):
    results = get_info(stre.sc, slug)
    return jsonify(results)

@app.route("/api/get-extended-info/<slug>")
def get_full_info(slug):
    results = get_extended_info(stre.fixed_sc, slug)
    return jsonify(results)

@app.route("/api/get-streaming-links/<content_id>")
def get_streaming_links(content_id):
    episode_id = request.args.get("episode_id")
    results = get_links(stre.fixed_sc, content_id, episode_id)
    return jsonify(results)


@app.route("/api/users", methods=["POST"])
def create_user():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "username and password required"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "username already exists"}), 400
    user = User(username=username)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify({"id": user.id, "username": user.username}), 201


@app.route("/api/login", methods=["POST"])
def login_user():
    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    if not username or not password:
        return jsonify({"error": "username and password required"}), 400
    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "invalid credentials"}), 401
    return jsonify({"id": user.id, "username": user.username})


@app.route("/api/progress/<int:user_id>/<film_id>", methods=["GET", "POST"])
def video_progress(user_id, film_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    entry = VideoProgress.query.filter_by(user_id=user_id, film_id=film_id).first()
    if request.method == "GET":
        return jsonify({"progress": entry.progress if entry else 0})

    data = request.get_json() or {}
    progress = data.get("progress")
    if progress is None:
        return jsonify({"error": "progress required"}), 400
    if not entry:
        entry = VideoProgress(user_id=user_id, film_id=film_id, progress=progress)
        db.session.add(entry)
    else:
        entry.progress = progress
    db.session.commit()
    return jsonify({"progress": entry.progress})

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
    download_id = str(uuid4())
    socketio.start_background_task(
        download_with_socket,
        domain,
        filmid,
        socketio,
        download_id,
        episodeid,
        title,
        series,
        season,
        episode_name,
        episode_number,
    )

@socketio.on("cancel_download")
def handle_cancel_download(data):
    download_id = data.get("id")
    cancel_download(download_id)
    emit("download_cancelled", {"status": "cancelled", "id": download_id})

if __name__ == "__main__":
    # Allow the built-in Werkzeug server when running inside Docker.
    # Expose the server on all interfaces for external access.
    socketio.run(app, debug=True, host="0.0.0.0", allow_unsafe_werkzeug=True)
