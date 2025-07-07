from utils.get_available_domains import get_available_domains
from utils.download_sc_video import download_sc_video
import asyncio
import threading
from queue import Queue, Empty
import humanize
import socket
import time

# 👇 Nuovo dizionario globale per gestire le cancellazioni
cancel_flags = {}

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

def search(sc, query):
    results = sc.search(query)
    return results

def get_info(sc, slug):
    results = sc.preview(slug)
    return results

def download_with_socket(domain, filmid, socketio, sid):
    url = f'https://{domain}/it/watch/{filmid}'
    queue = Queue()
    cancel_event = threading.Event()  # 👈 nuovo event per cancellazione

    # Salva il flag di cancellazione per questo socket
    cancel_flags[sid] = cancel_event

    # Lancia il download in un thread
    thread = threading.Thread(target=download_sc_video, args=(url, queue, cancel_event))
    thread.start()

    def emit_updates():
        while thread.is_alive() or not queue.empty():
            try:
                d = queue.get(timeout=0.1)

                if cancel_event.is_set():
                    socketio.emit('download_cancelled', {'status': 'cancelled'}, to=sid)
                    print(f"[INFO] Download annullato per {sid}")
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

                        socketio.emit('download_progress', progress_data, to=sid)

                elif d['status'] == 'finished':
                    socketio.emit('download_finished', {'status': 'done'}, to=sid)

            except Empty:
                time.sleep(0.1)

    threading.Thread(target=emit_updates).start()


# 👇 Funzione per segnare un download come "da annullare"
def cancel_download(sid):
    if sid in cancel_flags:
        cancel_flags[sid].set()
        print(f"[INFO] Richiesta di annullamento per socket {sid}")

