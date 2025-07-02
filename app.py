from flask import Flask, request, render_template, Response, stream_with_context
import threading
import queue
import json
from scuapi import API
from utils.get_available_domains import get_available_domains
from utils.download_sc_video import download_sc_video

app = Flask(__name__)


def get_domain():
    domains = get_available_domains()
    for d in domains:
        if d.startswith("streamingcommunity.") or d.startswith("streamingunity."):
            return d
    return None


DOMAIN = get_domain()
if not DOMAIN:
    raise RuntimeError("Nessun dominio StreamingCommunity disponibile.")

api = API(domain=DOMAIN)


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/preview/<slug>")
def preview(slug):
    data = api.preview(slug)
    return render_template("preview.html", data=data, domain=DOMAIN)


@app.post("/api/search")
def api_search():
    payload = request.get_json(silent=True) or {}
    query = payload.get("query", "").strip()
    if not query:
        return {"error": "Missing query"}, 400
    return api.search(query)


@app.get("/api/preview/<slug>")
def api_preview(slug):
    return api.preview(slug)


@app.get("/api/download/<content_id>")
def api_download(content_id):
    episode_id = request.args.get("e")
    watch_url = f"https://{DOMAIN}/it/watch/{content_id}"
    if episode_id:
        watch_url += f"?e={episode_id}"

    def generate():
        q = queue.Queue()

        def cb(d):
            q.put(d)

        thread = threading.Thread(target=download_sc_video, args=(watch_url,), kwargs={"progress_callback": cb})
        thread.start()

        while True:
            data = q.get()
            status = data.get("status")
            if status == "downloading":
                total = data.get("total_bytes") or data.get("total_bytes_estimate") or 0
                downloaded = data.get("downloaded_bytes", 0)
                percent = int(downloaded * 100 / total) if total else 0
                yield f"data: {percent}\n\n"
            elif status == "finished":
                yield "data: complete\n\n"
                break

        thread.join()

    return Response(stream_with_context(generate()), mimetype="text/event-stream")


@app.route("/download/<content_id>")
def download(content_id):
    episode_id = request.args.get("e")
    watch_url = f"https://{DOMAIN}/it/watch/{content_id}"
    if episode_id:
        watch_url += f"?e={episode_id}"
    download_sc_video(watch_url)
    return f"Download avviato: {watch_url}"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
