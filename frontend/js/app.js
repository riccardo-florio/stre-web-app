let socket = null;
let socketid = undefined;
let mainUrl = null;
let filmId = null;
let filmTitle = null;
let lastSearchQuery = null;

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

async function searchAndShowResults(query, updateHistory = true) {
    if (!query) return;
    const encodedQuery = encodeURIComponent(query);

    startSearchLoading();
    try {
        const response = await fetch(`/api/search/${encodedQuery}`);
        const results = await response.json();
        lastSearchQuery = query;
        homeToSearchResult(query, updateHistory);
        populateSearchResults(results, query, mainUrl);
    } catch (err) {
        console.error("Errore nella ricerca:", err);
        populateSearchResultError();
    }
    stopSearchLoading();
}

document.addEventListener('DOMContentLoaded', async () => {
    mainUrl = await fetchUrl();
    populateUrl(mainUrl);
    if (mainUrl) {
        const reachable = await checkDomainReachable(mainUrl);
        if (!reachable) {
            const el = document.getElementById('stre-url');
            const link = el.querySelector('a');
            if (link) {
                link.classList.remove('text-blue-600');
                link.classList.add('text-red-600');
            } else {
                el.classList.add('text-red-600');
            }
        }
    }
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
        searchAndShowResults(query);
    });

    downloadBtn.addEventListener('click', async (e) => {
        socket.emit("start_download", {
            domain: mainUrl,
            filmid: filmId,
            title: filmTitle
        });
    });

    handleNavigationFromURL();
});

async function handleNavigationFromURL() {
    const hash = location.hash || '#home';
    const [page, queryString] = hash.slice(1).split('?');
    const params = new URLSearchParams(queryString || '');

    if (page === 'search') {
        const q = params.get('q');
        if (q) {
            await searchAndShowResults(q, false);
        } else {
            homeToSearchResult(null, false);
        }
        history.replaceState({ page: 'search', query: q }, '', hash);
    } else if (page === 'download') {
        const id = params.get('id');
        const slug = params.get('slug');
        const title = params.get('title');
        if (id && slug && title) {
            searchResultToDownload(id, slug, title, false);
            history.replaceState({ page: 'download', filmId: id, slug, title }, '', hash);
        } else {
            searchResultToHome(false);
            history.replaceState({ page: 'home' }, '', '#home');
        }
    } else {
        searchResultToHome(false);
        history.replaceState({ page: 'home' }, '', '#home');
    }
}

window.addEventListener('popstate', () => {
    handleNavigationFromURL();
});