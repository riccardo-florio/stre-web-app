from flask import Flask, request, render_template, jsonify, Response, stream_with_context
from scuapi import API
from utils.get_available_domains import get_available_domains
from utils.download_sc_video import download_sc_video, download_sc_video_progress

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
    return render_template("index.html", domain=DOMAIN)


@app.route("/preview/<slug>")
def preview(slug):
    data = api.preview(slug)
    return render_template("preview.html", data=data, domain=DOMAIN)


@app.route("/api/search", methods=["POST"])
def api_search():
    query = request.form.get("query", "").strip()
    if not query:
        return jsonify({"error": "Missing query"}), 400
    results = api.search(query)
    return jsonify(results)


@app.route("/api/preview/<slug>")
def api_preview(slug):
    data = api.preview(slug)
    return jsonify(data)


@app.route("/api/download/<content_id>")
def api_download(content_id):
    episode_id = request.args.get("e")
    watch_url = f"https://{DOMAIN}/it/watch/{content_id}"
    if episode_id:
        watch_url += f"?e={episode_id}"

    def generate():
        for progress in download_sc_video_progress(watch_url):
            yield f"data:{progress}\n\n"

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
