from utils.get_available_domains import get_available_domains
from utils.download_sc_video import download_sc_video

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

def download(domain, id):
    link = f'https://{domain}/it/watch/{id}'
    download_sc_video(link)
    return