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

    socket.on('active_downloads', data => {
        for (const [id, info] of Object.entries(data)) {
            if (info.title && !downloads[id]) {
                createDownloadItem(id, info.title);
            }
            if (info.progress) {
                updateDownloadProgress(
                    id,
                    info.progress.percent || 0,
                    info.progress.eta,
                    info.progress.downloaded,
                    info.progress.total,
                    info.progress.speed
                );
            }
        }
    });

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
        let item = downloads[data.id];
        if (!item && data.title) {
            createDownloadItem(data.id, data.title);
            item = downloads[data.id];
        }
        if (item) {
            item.percentSpan.innerText = '⚠️ Già presente';
            item.bar.classList.remove('animate-pulse');
            item.active = false;
            updateNoDownloadsMessage();
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
            item.active = false;
            updateNoDownloadsMessage();
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
            item.active = false;
            updateNoDownloadsMessage();
        }
    })
}

document.addEventListener('DOMContentLoaded', async () => {
    mainUrl = await fetchUrl();
    populateUrl(mainUrl);
    updateNoDownloadsMessage();

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

window.addEventListener('load', () => {
    history.replaceState({ page: 'home' }, '', '#home');
});

window.addEventListener('popstate', (event) => {
    const state = event.state || { page: 'home' };
    if (state.page === 'home') {
        searchResultToHome(false);
    } else if (state.page === 'search') {
        homeToSearchResult(false);
    } else if (state.page === 'download') {
        if (state.filmId && state.slug && state.title) {
            searchResultToDownload(state.filmId, state.slug, state.title, false);
        } else {
            homeToSearchResult(false);
        }
    }
});
