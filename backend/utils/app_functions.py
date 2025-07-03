from utils.get_available_domains import get_available_domains

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