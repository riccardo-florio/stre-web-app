from utils.get_available_domains import get_available_domains
from utils.download_sc_video import download_sc_video
import asyncio
import threading
from queue import Queue, Empty
import humanize

def check_connection(domain, port=80):
    try:
        socket.create_connection((domain, port))
        return True
    except OSError:
        return False

def get_stre_domain():
    domains = get_available_domains()
    
    if not domains:
        print("Errore: nessun dominio disponibile trovato.")
        return
    
    domain = next(
        (d for d in domains if d.startswith("streamingcommunity.") or d.startswith("streamingunity.")),
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

def download_with_socket(domain, filmid, socketio, sid):
    url = f'https://{domain}/it/watch/{filmid}'
    queue = Queue()

    # Lancia il download in un thread
    thread = threading.Thread(target=download_sc_video, args=(url, queue))
    thread.start()

    # Esegui un loop asincrono per leggere dalla coda
    async def emit_updates():
        while thread.is_alive() or not queue.empty():
            try:
                d = queue.get(timeout=0.1)
                if d['status'] == 'downloading':
                    total = d.get('total_bytes') or d.get('total_bytes_estimate')
                    downloaded = d.get('downloaded_bytes', 0)
                    eta_seconds = d.get('eta')
                    speed = d.get('speed')

                    if total:
                        percent = round(downloaded / total * 100, 2)
                        progress_data = {'percent': percent}

                        # ETA
                        if eta_seconds is not None:
                            minutes = eta_seconds // 60
                            seconds = eta_seconds % 60
                            progress_data['eta'] = f"{int(minutes)}:{int(seconds):02d}"

                        # Velocità
                        if speed:
                            progress_data['speed'] = humanize.naturalsize(speed, binary=True) + "/s"

                        # Dati scaricati / totali
                        progress_data['downloaded'] = humanize.naturalsize(downloaded, binary=True)
                        progress_data['total'] = humanize.naturalsize(total, binary=True)

                        socketio.emit('download_progress', progress_data, to=sid)

                elif d['status'] == 'finished':
                    socketio.emit('download_finished', {'status': 'done'}, to=sid)
            except Empty:
                await asyncio.sleep(0.1)

    return emit_updates()
