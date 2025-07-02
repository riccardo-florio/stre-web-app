from flask import Flask, request, render_template, Response
import json
from scuapi import API
from utils.get_available_domains import get_available_domains
from utils.download_sc_video import download_sc_video_stream

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


@app.route("/api/search", methods=["POST"])
def api_search():
    data = request.get_json(force=True)
    query = data.get("query", "").strip()
    if not query:
        return {"error": "Inserisci una query."}, 400
    results = api.search(query)
    return results


@app.route("/api/preview/<slug>")
def api_preview(slug):
    data = api.preview(slug)
    return data


@app.route("/api/download/<content_id>")
def download(content_id):
    episode_id = request.args.get("e")
    watch_url = f"https://{DOMAIN}/it/watch/{content_id}"
    if episode_id:
        watch_url += f"?e={episode_id}"

    def generate():
        for prog in download_sc_video_stream(watch_url):
            yield f"data: {json.dumps(prog)}\n\n"

    return Response(generate(), mimetype="text/event-stream")


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
