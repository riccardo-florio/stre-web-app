async function fetchUrl() {
    const res = await fetch('/api/get-stre-domain');
    const data = await res.json();
    return data;
}

async function fetchSearch(query) {
    const res = await fetch(`/api/search/${query}`);
    const data = await res.json();
    return data;
}

async function fetchInfo(slug) {
    const res = await fetch(`/api/getinfo/${slug}`);
    const data = await res.json();
    return data;
}

async function fetchExtendedInfo(slug) {
    const res = await fetch(`/api/get-extended-info/${slug}`);
    const data = await res.json();
    return data;
}

async function fetchAppVersion() {
    const res = await fetch('/api/get-app-version');
    const data = await res.json();
    return data;
}

async function fetchStreamingLinks(id, episodeId = null) {
    const url = episodeId
        ? `/api/get-streaming-links/${id}?episode_id=${episodeId}`
        : `/api/get-streaming-links/${id}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
}

async function fetchSignIn(nome, cognome, username, email, password) {
    const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cognome, username, email, password })
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Errore nella creazione dell\'account');
    }
    return data;
}

async function fetchLogIn(username, password) {
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Credenziali non valide');
    }
    return data;
}

async function fetchVideoProgress(userId, filmId) {
    const res = await fetch(`/api/progress/${userId}/${filmId}`);
    const data = await res.json();
    return data.progress || 0;
}

async function fetchUserProgress(userId) {
    const res = await fetch(`/api/progress/${userId}`);
    const data = await res.json();
    return data.progress || [];
}

async function saveVideoProgress(userId, filmId, progress, slug, title, cover, duration) {
    await fetch(`/api/progress/${userId}/${filmId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progress, slug, title, cover, duration })
    });
}

async function checkDomainReachable(domain) {
    try {
        const res = await fetch(`/api/check-domain/${domain}`);
        const data = await res.json();
        if (data.reachable) {
            return true;
        }
    } catch (err) {
        console.error('Errore nel controllo del dominio', err);
    }

    try {
        await fetch('/api/refresh-domain', { method: 'POST' });
        const newDomain = await fetchUrl();
        if (newDomain) {
            try {
                const retry = await fetch(`/api/check-domain/${newDomain}`);
                const retryData = await retry.json();
                if (retryData.reachable) {
                    window.mainUrl = newDomain;
                    return true;
                }
            } catch (err) {
                console.error('Errore nel controllo del nuovo dominio', err);
            }
        }
    } catch (err) {
        console.error('Errore nel refresh del dominio', err);
    }
    return false;
}
