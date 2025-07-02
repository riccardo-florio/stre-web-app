from flask import Flask, request, render_template, url_for, redirect, Response, jsonify
import threading
from queue import Queue
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


@app.route("/", methods=["GET", "POST"])
def index():
    if request.method == "POST":
        query = request.form.get("query", "").strip()
        if not query:
            return render_template("index.html", error="Inserisci una query."), 400
        results = api.search(query)
        return render_template("results.html", query=query, results=results)
    return render_template("index.html")


@app.route("/api/search")
def api_search():
    query = request.args.get("q", "").strip()
    if not query:
        return jsonify({"error": "missing query"}), 400
    results = api.search(query)
    return jsonify(results)


@app.route("/api/preview/<slug>")
def api_preview(slug):
    data = api.preview(slug)
    return jsonify(data)


@app.route("/preview/<slug>")
def preview(slug):
    data = api.preview(slug)
    return render_template("preview.html", data=data, domain=DOMAIN)


@app.route("/download/<content_id>")
def download(content_id):
    episode_id = request.args.get("e")
    watch_url = f"https://{DOMAIN}/it/watch/{content_id}"
    if episode_id:
        watch_url += f"?e={episode_id}"

    def generate():
        q = Queue()

        def hook(d):
            if d.get('status') == 'downloading':
                total = d.get('total_bytes') or d.get('total_bytes_estimate') or 1
                downloaded = d.get('downloaded_bytes', 0)
                percent = int(downloaded * 100 / total)
                q.put(percent)
            elif d.get('status') == 'finished':
                q.put('complete')

        def run():
            download_sc_video(watch_url, progress_cb=hook)

        threading.Thread(target=run, daemon=True).start()

        while True:
            progress = q.get()
            yield f"data: {progress}\n\n"
            if progress == 'complete':
                break

    return Response(generate(), mimetype='text/event-stream')


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
