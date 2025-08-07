from utils.get_available_domains import get_available_domains
from utils.download_sc_video import download_sc_video
import asyncio
import threading
from queue import Queue, Empty
import humanize
import socket
import time
import re
import os
import subprocess

# 👇 Nuovo dizionario globale per gestire le cancellazioni
cancel_flags = {}

# Stato condiviso dei download
# Ogni download è identificato da un id e contiene
# informazioni su progresso e titolo.
download_states = {}

# Dominio corrente condiviso
stre_domain = None

def get_download_state():
    """Ritorna lo stato corrente di tutti i download."""
    return download_states


def sanitize(name: str) -> str:
    """Remove characters that are not safe for file paths."""
    return re.sub(r'[\\/*?:"<>|]', '', name).strip()

def check_connection(domain, port=80):
    try:
        socket.create_connection((domain, port))
        return True
    except OSError:
        return False

def get_stre_domain():
    domains = get_available_domains()
    print(domains)

    if not domains:
        print("Errore: nessun dominio disponibile trovato.")
        return

    domain = next(
        (d for d in domains if "streamingcommunity" in d.lower() or "streamingunity" in d.lower()),
        None
    )


    if not domain:
        print("Errore: nessun dominio di StreamingCommunity valido trovato.")
        return

    print(f"[INFO] Dominio selezionato automaticamente: {domain}")
    return domain


def refresh_stre_domain():
    """Aggiorna e restituisce il dominio di StreamingCommunity."""
    global stre_domain
    new_domain = get_stre_domain()
    if new_domain:
        stre_domain = new_domain
    return stre_domain

def search(sc, query):
    results = sc.search(query)
    return results

def get_info(sc, slug):
    results = sc.preview(slug)
    return results

def get_extended_info(sc, slug):
    results = sc.load(slug)
    return results

import subprocess

def get_git_version():
    try:
        tags = subprocess.check_output(['git', 'tag']).decode().splitlines()
        return tags[-1] if tags else None  # prende l'ultimo della lista
    except Exception as e:
        return f"Errore: {e}"

def download_with_socket(
    domain,
    filmid,
    socketio,
    download_id,
    episodeid=None,
    title=None,
    series=None,
    season=None,
    episode_name=None,
    episode=None,
):
    url = f'https://{domain}/it/watch/{filmid}'
    if episodeid:
        url += f'?e={episodeid}'
        if series and season and episode_name:
            safe_series = sanitize(series)
            if episode is not None:
                safe_ep = sanitize(f"E{episode} - {episode_name}")
            else:
                safe_ep = sanitize(episode_name)
            output_path = (
                f'downloads/SerieTV/{safe_series}/Stagione {season}/{safe_ep}.%(ext)s'
            )
        else:
            output_path = 'downloads/%(title)s/%(title)s.%(ext)s'
    else:
        if title:
            safe_title = sanitize(title)
            output_path = f'downloads/Film/{safe_title}/{safe_title}.%(ext)s'
        else:
            output_path = 'downloads/%(title)s/%(title)s.%(ext)s'

    # Prepara il titolo da comunicare sia in caso di download che quando il
    # contenuto è già presente
    display_title = None
    if episodeid and series and season and episode_name:
        if episode is not None:
            display_title = f"{series} - S{season}E{episode} - {episode_name}"
        else:
            display_title = f"{series} - {episode_name}"
    elif title:
        display_title = title

    final_path = output_path.replace('%(ext)s', 'mp4')
    if os.path.exists(final_path):
        socketio.emit(
            'download_exists',
            {'status': 'exists', 'id': download_id, 'title': display_title},
        )
        print('[INFO] Download non avviato: file gia esistente.')
        return
    queue = Queue()
    cancel_event = threading.Event()  # 👈 nuovo event per cancellazione

    # Salva il flag di cancellazione per questo socket
    cancel_flags[download_id] = cancel_event

    # Lancia il download in un thread
    thread = threading.Thread(
        target=download_sc_video,
        args=(url, queue, cancel_event, output_path),
    )
    thread.start()

    # Salva lo stato iniziale del download
    download_states[download_id] = {
        "downloading": True,
        "progress": None,
        "title": display_title,
    }

    if display_title:
        socketio.emit('download_started', {'title': display_title, 'id': download_id})

    def emit_updates():
        while thread.is_alive() or not queue.empty():
            try:
                d = queue.get(timeout=0.1)

                if cancel_event.is_set():
                    socketio.emit('download_cancelled', {'status': 'cancelled', 'id': download_id})
                    download_states.pop(download_id, None)
                    cancel_flags.pop(download_id, None)
                    print(f"[INFO] Download annullato: {download_id}")
                    break

                if d['status'] == 'downloading':
                    total = d.get('total_bytes') or d.get('total_bytes_estimate')
                    downloaded = d.get('downloaded_bytes', 0)
                    eta_seconds = d.get('eta')
                    speed = d.get('speed')

                    if total:
                        percent = round(downloaded / total * 100, 2)
                        progress_data = {'percent': percent}

                        if eta_seconds is not None:
                            minutes = eta_seconds // 60
                            seconds = eta_seconds % 60
                            progress_data['eta'] = f"{int(minutes)}:{int(seconds):02d}"

                        if speed:
                            progress_data['speed'] = humanize.naturalsize(speed, binary=True) + "/s"

                        progress_data['downloaded'] = humanize.naturalsize(downloaded, binary=True)
                        progress_data['total'] = humanize.naturalsize(total, binary=True)

                        if download_id in download_states:
                            download_states[download_id]["progress"] = progress_data
                        socketio.emit('download_progress', {**progress_data, 'id': download_id})

                elif d['status'] == 'finished':
                    socketio.emit('download_finished', {'status': 'done', 'id': download_id})
                    download_states.pop(download_id, None)
                    cancel_flags.pop(download_id, None)
                    break

            except Empty:
                time.sleep(0.1)

    threading.Thread(target=emit_updates).start()


# 👇 Funzione per segnare un download come "da annullare"
def cancel_download(download_id):
    if download_id in cancel_flags:
        cancel_flags[download_id].set()
        print(f"[INFO] Richiesta di annullamento per download {download_id}")
        download_states.pop(download_id, None)
        cancel_flags.pop(download_id, None)


