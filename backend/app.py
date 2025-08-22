from flask import Flask, send_from_directory, send_file, jsonify, Response, request
from asyncio import sleep
from flask_socketio import SocketIO, emit
import json
from pathlib import Path
from uuid import uuid4
from models import db, User, VideoProgress
from sqlalchemy import text
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
        self.sc.session.verify = False
        self.fixed_sc = FixedAPI(self.domain)
        self.fixed_sc.session.verify = False

    def refresh(self):
        self.domain = refresh_stre_domain()
        self.sc = API(self.domain)
        self.sc.session.verify = False
        self.fixed_sc = FixedAPI(self.domain)
        self.fixed_sc.session.verify = False


stre = StreAPI()

app = Flask(__name__, static_folder=str(FRONTEND_DIR), static_url_path="")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///users.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
db.init_app(app)

def ensure_video_progress_columns():
    info = db.session.execute(text("PRAGMA table_info(video_progress)"))
    columns = [row[1] for row in info]
    if "duration" not in columns:
        db.session.execute(
            text("ALTER TABLE video_progress ADD COLUMN duration REAL DEFAULT 0")
        )
    if "slug" not in columns:
        db.session.execute(
            text("ALTER TABLE video_progress ADD COLUMN slug VARCHAR(255)")
        )
    if "title" not in columns:
        db.session.execute(
            text("ALTER TABLE video_progress ADD COLUMN title VARCHAR(255)")
        )
    if "cover" not in columns:
        db.session.execute(
            text("ALTER TABLE video_progress ADD COLUMN cover VARCHAR(255)")
        )
    db.session.commit()


def ensure_user_columns():
    info = db.session.execute(text("PRAGMA table_info(user)"))
    columns = [row[1] for row in info]
    if "email" not in columns:
        db.session.execute(text("ALTER TABLE user ADD COLUMN email VARCHAR(120)"))
    if "first_name" not in columns:
        db.session.execute(text("ALTER TABLE user ADD COLUMN first_name VARCHAR(120)"))
    if "last_name" not in columns:
        db.session.execute(text("ALTER TABLE user ADD COLUMN last_name VARCHAR(120)"))
    if "role" not in columns:
        db.session.execute(
            text("ALTER TABLE user ADD COLUMN role VARCHAR(20) DEFAULT 'normal'")
        )
    db.session.execute(text("UPDATE user SET role='normal' WHERE role IS NULL"))
    db.session.commit()


with app.app_context():
    db.create_all()
    ensure_video_progress_columns()
    ensure_user_columns()

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


def is_admin_request() -> bool:
    """Return True if the request is performed by an admin user."""
    return request.headers.get("X-Role") == "admin"


@app.route("/api/users", methods=["POST", "GET"])
def create_user():
    if request.method == "GET":
        if not is_admin_request():
            return jsonify({"error": "forbidden"}), 403
        users = User.query.all()
        return jsonify(
            [
                {
                    "id": u.id,
                    "username": u.username,
                    "first_name": u.first_name,
                    "last_name": u.last_name,
                    "email": u.email,
                    "role": u.role,
                }
                for u in users
            ]
        )

    data = request.get_json() or {}
    username = data.get("username")
    password = data.get("password")
    nome = data.get("nome")
    cognome = data.get("cognome")
    email = data.get("email")
    role = data.get("role", "normal")
    if User.query.count() == 0:
        role = "admin"
    if role not in {"admin", "privileged", "normal"}:
        return jsonify({"error": "invalid role"}), 400
    if not all([username, password, nome, cognome, email]):
        return jsonify({"error": "missing required fields"}), 400
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "username already exists"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already exists"}), 400
    user = User(
        username=username,
        email=email,
        first_name=nome,
        last_name=cognome,
        role=role,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
        }
    ), 201


@app.route("/api/users/<int:user_id>", methods=["GET", "PUT", "DELETE"])
def manage_user(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    if request.method == "GET":
        return jsonify({
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
        })

    if not is_admin_request():
        return jsonify({"error": "forbidden"}), 403

    if request.method == "DELETE":
        db.session.delete(user)
        db.session.commit()
        return jsonify({"status": "deleted"})

    data = request.get_json() or {}
    first_name = data.get("first_name")
    last_name = data.get("last_name")
    email = data.get("email")
    role = data.get("role")
    if role and role not in {"admin", "privileged", "normal"}:
        return jsonify({"error": "invalid role"}), 400
    if first_name is not None:
        user.first_name = first_name
    if last_name is not None:
        user.last_name = last_name
    if email is not None:
        if User.query.filter_by(email=email).filter(User.id != user_id).first():
            return jsonify({"error": "email already exists"}), 400
        user.email = email
    if role is not None:
        user.role = role
    db.session.commit()
    return jsonify(
        {
            "id": user.id,
            "username": user.username,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
        }
    )


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
    return jsonify({
        "id": user.id,
        "username": user.username,
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "role": user.role,
    })


@app.route("/api/logout", methods=["POST"])
def logout_user():
    return jsonify({"status": "logged out"})


@app.route("/api/progress/<int:user_id>/<film_id>", methods=["GET", "POST", "DELETE"])
def video_progress(user_id, film_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404

    entry = VideoProgress.query.filter_by(user_id=user_id, film_id=film_id).first()

    if request.method == "GET":
        if not entry:
            return jsonify({"progress": 0})
        return jsonify(
            {
                "progress": entry.progress,
                "duration": entry.duration,
                "slug": entry.slug,
                "title": entry.title,
                "cover": entry.cover,
            }
        )

    if request.method == "DELETE":
        if not is_admin_request():
            return jsonify({"error": "forbidden"}), 403
        if not entry:
            return jsonify({"error": "progress not found"}), 404
        db.session.delete(entry)
        db.session.commit()
        return jsonify({"status": "deleted"})

    data = request.get_json() or {}
    progress = data.get("progress")
    if progress is None:
        return jsonify({"error": "progress required"}), 400
    slug = data.get("slug")
    title = data.get("title")
    cover = data.get("cover")
    duration = data.get("duration", 0)
    if not entry:
        entry = VideoProgress(
            user_id=user_id,
            film_id=film_id,
            progress=progress,
            duration=duration,
            slug=slug,
            title=title,
            cover=cover,
        )
        db.session.add(entry)
    else:
        entry.progress = progress
        if slug is not None:
            entry.slug = slug
        if title is not None:
            entry.title = title
        if cover is not None:
            entry.cover = cover
        if duration is not None:
            entry.duration = duration
    db.session.commit()
    return jsonify({"progress": entry.progress})


@app.route("/api/progress", methods=["GET"])
def all_progress():
    if not is_admin_request():
        return jsonify({"error": "forbidden"}), 403
    entries = (
        db.session.query(VideoProgress, User.username)
        .join(User, VideoProgress.user_id == User.id)
        .all()
    )
    return jsonify(
        {
            "progress": [
                {
                    "id": vp.id,
                    "user_id": vp.user_id,
                    "username": username,
                    "film_id": vp.film_id,
                    "progress": vp.progress,
                    "duration": vp.duration,
                    "slug": vp.slug,
                    "title": vp.title,
                    "cover": vp.cover,
                }
                for vp, username in entries
            ]
        }
    )


@app.route("/api/progress/<int:user_id>", methods=["GET"])
def user_progress(user_id):
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "user not found"}), 404
    entries = VideoProgress.query.filter_by(user_id=user_id).all()
    return jsonify(
        {
            "progress": [
                {
                    "film_id": e.film_id,
                    "progress": e.progress,
                    "duration": e.duration,
                    "slug": e.slug,
                    "title": e.title,
                    "cover": e.cover,
                }
                for e in entries
                if e.progress > 0
            ]
        }
    )


@app.route("/api/export-db", methods=["GET"])
def export_db():
    """Allow an admin to download the raw SQLite database file."""
    if not is_admin_request():
        return jsonify({"error": "forbidden"}), 403
    db_path = BASE_DIR.parent / "instance/users.db"
    print(db_path)
    if not db_path.exists():
        return jsonify({"error": "db not found"}), 404
    return send_file(db_path, as_attachment=True, download_name="users.db")

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
