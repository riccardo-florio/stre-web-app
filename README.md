# Stre Downloader Web App

Questa applicazione permette di cercare e scaricare contenuti dal sito StreamingCommunity tramite una semplice interfaccia web.

Il progetto è diviso in:

- **backend**: server Flask che espone alcune API e gestisce il download dei contenuti.
- **frontend**: pagina HTML/JavaScript che interagisce con il backend.
- **requirements.txt**: dipendenze Python necessarie.

## Requisiti

- Python 3.10+
- `ffmpeg` installato nel sistema (necessario per `yt_dlp`).

## Installazione

1. Creare e attivare un virtualenv (opzionale)
2. Installare le dipendenze:
   ```bash
   pip install -r requirements.txt
   ```

## Avvio del server

Eseguire lo script `backend/app.py`:

```bash
python backend/app.py
```

Il server partirà sulla porta `5000`. Aprendo `http://localhost:5000` si accede all'interfaccia web.

## Come funziona

Al lancio il backend recupera automaticamente il dominio valido di StreamingCommunity ed inizializza l'API:

```python
# backend/app.py
from utils.app_functions import get_stre_domain
from scuapi import API

domain = get_stre_domain()
sc = API(domain)
```

Le API principali sono:

- `GET /api/get-stre-domain` – restituisce il dominio individuato.
- `GET /api/search/<query>` – effettua la ricerca nel catalogo.
- `GET /api/download/<domain>/<filmid>/<socketid>` – avvia il download e invia via SocketIO gli avanzamenti.

Estratto del codice dei percorsi:

```python
@app.route("/api/search/<query>")
def search_query(query):
    results = search(sc, query)
    return Response(
        json.dumps(results, ensure_ascii=False, sort_keys=False),
        content_type="application/json"
    )
```

Il download è gestito in un thread separato e gli aggiornamenti vengono inviati al frontend tramite websocket:

```python
# backend/utils/app_functions.py
thread = threading.Thread(target=download_sc_video, args=(url, queue))
thread.start()
...
if total:
    percent = round(downloaded / total * 100, 2)
    progress_data = {'percent': percent}
    socketio.emit('download_progress', progress_data, to=sid)
```

Sul frontend viene aperta una connessione a SocketIO per ricevere i progressi:

```javascript
// frontend/js/app.js
const socket = io();
socket.on('download_progress', data => {
    updateDownloadProgress(
        data.percent,
        data.eta,
        data.downloaded,
        data.total,
        data.speed
    );
});
```

## Utilizzo

1. Aprire la pagina `http://localhost:5000`.
2. Inserire il titolo da cercare e avviare la ricerca.
3. Dalla lista dei risultati è possibile avviare il download o aprire il link diretto sul sito.
4. Durante il download verrà mostrato l'avanzamento in tempo reale.

## Struttura dei file

- `backend/app.py` – definisce le route Flask e l'integrazione con SocketIO.
- `backend/utils/` – funzioni di supporto per la ricerca del dominio e il download.
- `frontend/` – interfaccia utente realizzata con HTML, Tailwind CSS e JavaScript.


## TODO

- gestione download interrotto dal server
- implementare gestione accessi multipli
- implementare download multipli

