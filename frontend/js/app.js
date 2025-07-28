let socket = null;
let socketid = undefined;
let mainUrl = null;
let filmId = null;
let filmTitle = null;

window.onload = () => {
    socket = io();
    socket.connect("http://127.0.0.1:5000");

    socket.on("connect", () => {
        console.log("Connected!");
        socketid = socket.id;
        console.log("Socket id: " + socketid);
    })

    socket.on('download_started', data => {
        if (data.title && !downloads[data.id]) {
            createDownloadItem(data.id, data.title);
        }
    });

    // Gestione dello stato del download
    socket.on('download_progress', data => {
        updateDownloadProgress(
            data.id,
            data.percent,
            data.eta,
            data.downloaded,
            data.total,
            data.speed
        );
    });

    socket.on('download_exists', data => {
        const item = downloads[data.id];
        if (item) {
            item.percentSpan.innerText = '⚠️ Già presente';
        }
    });

    // Gestione dell'annullamento del download
    socket.on("download_cancelled", data => {
        updateDownloadProgress(data.id, 0);
        const item = downloads[data.id];
        if (item) {
            item.percentSpan.innerText = "❌ Annullato";
            if (item.cancelBtn) {
                item.cancelBtn.disabled = true;
                item.cancelBtn.classList.add('opacity-50');
            }
        }
    });

    // Gestione download completato
    socket.on("download_finished", data => {
        updateDownloadProgress(data.id, 0);
        const item = downloads[data.id];
        if (item) {
            item.percentSpan.innerText = "✔️ Completato";
            if (item.cancelBtn) {
                item.cancelBtn.disabled = true;
                item.cancelBtn.classList.add('opacity-50');
            }
        }
    })
}

document.addEventListener('DOMContentLoaded', async () => {
    mainUrl = await fetchUrl();
    populateUrl(mainUrl);

    const form = document.querySelector('form');
    const downloadBtn = document.getElementById('download-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const input = form.querySelector('input[type="text"]');
        const query = input.value.trim();

        if (!query) {
            alert("Inserisci un titolo!");
            return;
        }

        const encodedQuery = encodeURIComponent(query);

        startSearchLoading();

        try {
            const response = await fetch(`/api/search/${encodedQuery}`);
            const results = await response.json();

            //console.log(results);

            homeToSearchResult(); // cambia pagina
            populateSearchResults(results, input.value, mainUrl);

        } catch (err) {
            console.error("Errore nella ricerca:", err);
            populateSearchResultError();
        }

        stopSearchLoading();
    });

    downloadBtn.addEventListener('click', async (e) => {
        socket.emit("start_download", {
            domain: mainUrl,
            filmid: filmId,
            title: filmTitle
        });
    });
});
