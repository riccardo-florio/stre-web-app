let socket = null;
let socketid = undefined;
let mainUrl = null;
let filmId = null;
let filmTitle = null;
let filmSlug = null;
let filmCover = null;
let lastSearchQuery = null;
const playerModal = document.getElementById('player-modal');

let serverAlertShown = false;
function notifyServerUnreachable() {
    if (serverAlertShown) return;
    serverAlertShown = true;
    alert('Server non raggiungibile. Controlla la connessione e riprova.');
    if (typeof downloads !== 'undefined') {
        Object.values(downloads).forEach(item => {
            if (item.active) {
                item.percentSpan.innerText = '❌ Connessione persa';
                item.bar.classList.remove('animate-pulse');
                item.active = false;
            }
        });
        updateNoDownloadsMessage();
    }
}
window.notifyServerUnreachable = notifyServerUnreachable;
function isServerReachable() {
    return socket && socket.connected;
}
window.isServerReachable = isServerReachable;

window.onload = () => {
    socket = io({ autoConnect: false });

    const handleConnectionError = (err) => {
        console.error('Errore di connessione al server', err);
        notifyServerUnreachable();
    };

    socket.on('connect_error', handleConnectionError);
    socket.on('error', handleConnectionError);
    socket.on('disconnect', handleConnectionError);
    socket.io.on('reconnect_error', handleConnectionError);
    socket.io.on('reconnect_failed', handleConnectionError);

    socket.on("connect", () => {
        console.log("Connected!");
        socketid = socket.id;
        console.log("Socket id: " + socketid);
        serverAlertShown = false;
    });

    socket.connect();

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

    socket.on('download_in_progress', data => {
        let item = downloads[data.id];
        if (!item && data.title) {
            createDownloadItem(data.id, data.title);
            item = downloads[data.id];
        }
        if (item) {
            item.percentSpan.innerText = '⚠️ Già in corso';
            item.bar.classList.add('animate-pulse');
            item.active = true;
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
    checkVersions();
    const storedUser = localStorage.getItem('username');
    if (storedUser) {
        updateMainTitle(storedUser);
    } else {
        showLoginModal();
    }
    populateContinueWatching();

    const form = document.querySelector('form');
    const downloadBtn = document.getElementById('download-btn');
    const watchBtn = document.getElementById('watch-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = form.querySelector('input[type="text"]');
        const query = input.value.trim();
        if (!query) {
            alert("Inserisci un titolo!");
            return;
        }
        input.blur(); // rimuove il focus e chiude la tastiera su mobile
        searchAndShowResults(query);
    });

    downloadBtn.addEventListener('click', async (e) => {
        if (!isServerReachable()) {
            notifyServerUnreachable();
            return;
        }
        socket.emit("start_download", {
            domain: mainUrl,
            filmid: filmId,
            title: filmTitle
        });
    });

    watchBtn.addEventListener('click', async () => {
        try {
            const links = await fetchStreamingLinks(filmId);
            const hlsLink = links.find(l => l.includes('playlist') || l.includes('.m3u8'));
            if (hlsLink) {
                showPlayer(hlsLink, filmId, filmSlug, filmTitle, filmCover);
            } else {
                alert('Nessun link disponibile');
            }
        } catch (err) {
            console.error('Errore nel recupero dei link', err);
            alert('Errore nel recupero dei link');
        }
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
    if (!playerModal.classList.contains('hidden')) {
        hidePlayer();
    } else {
        handleNavigationFromURL();
    }
});
