from flask import Flask, request, render_template, url_for, redirect
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
    download_sc_video(watch_url)
    return f"Download avviato: {watch_url}"


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
