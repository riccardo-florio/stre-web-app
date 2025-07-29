import sys, socket
import os
from scuapi import API
from utils.fixed_api import API as FixedAPI
from utils.get_available_domains import get_available_domains
from utils.download_sc_video import download_sc_video

DOWNLOAD_DIR = os.environ.get("DOWNLOAD_DIR", "downloads")

def choose_result(results_dict):
    print("\n=== Risultati trovati ===")
    keys = list(results_dict.keys())
    for i, name in enumerate(keys):
        year = results_dict[name].get("release_date", "").split("-")[0] if results_dict[name].get("release_date") else "?"
        print(f"{i}: {name} ({year})")
    while True:
        choice = input("Scegli il numero del contenuto: ")
        if choice.isdigit() and 0 <= int(choice) < len(keys):
            return results_dict[keys[int(choice)]]
        print("Scelta non valida. Riprova.")

def check_connection(domain, port=80):
    try:
        socket.create_connection((domain, port))
        return True
    except OSError:
        return False

def main():
    domains = get_available_domains()
    if not domains:
        print("Errore: nessun dominio disponibile trovato.")
        sys.exit(1)

    # ✅ selezione automatica del primo dominio valido
    domain = next(
        (d for d in domains if "streamingcommunity" in d.lower() or "streamingunity" in d.lower()),
        None
    )

    if not domain:
        print("Errore: nessun dominio di StreamingCommunity valido trovato.")
        sys.exit(1)

    print(f"[INFO] Dominio selezionato automaticamente: {domain}")

    if not check_connection(domain): 
        print("Impossibile raggiungere " + domain)
        sys.exit(1)
    
    api = API(domain=domain)

    query = input("\nInserisci il titolo da cercare: ")
    results = api.search(query)

    if not results:
        print("Nessun risultato trovato.")
        sys.exit(0)

    selected = choose_result(results)
    id = selected["id"]
    slug = selected["url"].split("/")[-1]  # esempio: "1234-titolo-del-film"
    print(f"\nCaricamento dettagli per: {selected['name']}")
    data = FixedAPI(domain).load(slug)
    print(f"\nTipo: {data['type']}")

    if data["type"] == "movie":
        link = f'https://{domain}/it/watch/{id}'
        print(f"\n✅ Link del film: {link}")
        choose = input("Scaricare il film s/n? ")
        if (choose == "s"):
            download_sc_video(
                link,
                output_path=f"{DOWNLOAD_DIR}/%(title)s/%(title)s.%(ext)s",
            )
    else:
        print(f"\nSerie TV con {data['seasons_count']} stagioni.")
        episodes = data["episodeList"]
        for i, ep in enumerate(episodes):
            print(f"{i}: S{ep['season']}E{ep['episode']} - {ep['name']}")
    #     while True:
    #         choice = input("Scegli l'indice dell'episodio da scaricare: ")
    #         if choice.isdigit() and 0 <= int(choice) < len(episodes):
    #             ep = episodes[int(choice)]
    #             break
    #         print("Scelta non valida. Riprova.")
    #     iframe, dl_url = api.get_links(data["id"], episode_id=ep["id"])
    #     print(f"\nEpisodio selezionato: {ep['name']}")
    #     print(f"Iframe:\n{iframe}\n")
    #     print(f"Link diretto:\n{dl_url}")

if __name__ == "__main__":
    main()
