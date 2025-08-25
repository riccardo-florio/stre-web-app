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

// Fetch streaming links directly from the StreamingCommunity domain without
// hitting the backend API. It builds the iframe URL, parses the returned HTML
// to obtain playlist information and returns the final playlist URL.
async function fetchStreamingLinksDirect(contentId, episodeId = null) {
    const domain = window.mainUrl || await fetchUrl();
    const qs = episodeId ? `?episode_id=${episodeId}` : '';
    const pageUrl = `https://${domain}/it/iframe/${contentId}${qs}`;

    const proxyBase = window.scProxy || null;

    async function corsFetch(url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error('HTTP error');
            return res;
        } catch (err) {
            if (proxyBase) {
                const proxyRes = await fetch(proxyBase + encodeURIComponent(url));
                if (!proxyRes.ok) throw new Error('Proxy HTTP error');
                return proxyRes;
            }
            throw new Error('CORS blocked and no proxy configured');
        }
    }

    const pageRes = await corsFetch(pageUrl);
    const pageHtml = await pageRes.text();

    const iframeMatch = pageHtml.match(/<iframe[^>]+src\s*=\s*["']([^"']+)/i);
    if (!iframeMatch) throw new Error('Iframe not found');
    const iframeUrl = iframeMatch[1];

    const iframeRes = await corsFetch(iframeUrl);
    const iframeHtml = await iframeRes.text();

    const paramsMatch = iframeHtml.match(/window\.masterPlaylist[^:]+params:[^{]+({[^<]+?})/);
    const urlMatch = iframeHtml.match(/window\.masterPlaylist[^<]+url:[^<]+'([^<]+?)'/);
    const fhdMatch = iframeHtml.match(/window\.canPlayFHD\s*=\s*(\w+)/);
    const streamsMatch = iframeHtml.match(/window\.streams[^=]+=[^[]+(\[.*?\])/);

    if (!paramsMatch || !urlMatch) throw new Error('Playlist info missing');

    const paramsRaw = paramsMatch[1].replace(/'/g, '"').replace(/,[^"}]+}/, '}');
    const playlistParams = JSON.parse(paramsRaw);

    // Parse streams even if not directly used, to mimic backend behaviour
    try { JSON.parse(streamsMatch ? streamsMatch[1] : '[]'); } catch (_) {}

    const playlistUrl = urlMatch[1];
    const canPlayFHD = fhdMatch ? fhdMatch[1] === 'true' : false;
    return `${playlistUrl}${playlistUrl.includes('?') ? '&' : '?'}expires=${playlistParams.expires}&token=${playlistParams.token}${canPlayFHD ? '&h=1' : ''}`;
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

async function fetchUsers() {
    const res = await fetch('/api/users', {
        headers: { 'X-Role': localStorage.getItem('role') || '' }
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Errore nel recupero degli utenti');
    }
    return data;
}

async function updateUser(id, first_name, last_name, email, role) {
    const res = await fetch(`/api/users/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'X-Role': localStorage.getItem('role') || ''
        },
        body: JSON.stringify({ first_name, last_name, email, role })
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Errore nella modifica utente');
    }
    return data;
}

async function deleteUser(id) {
    const res = await fetch(`/api/users/${id}`, {
        method: 'DELETE',
        headers: { 'X-Role': localStorage.getItem('role') || '' }
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Errore nella cancellazione utente');
    }
    return data;
}

async function fetchAllProgress() {
    const res = await fetch('/api/progress', {
        headers: { 'X-Role': localStorage.getItem('role') || '' }
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Errore nel recupero del progresso');
    }
    return data.progress || [];
}

async function deleteProgress(userId, filmId) {
    const res = await fetch(`/api/progress/${userId}/${filmId}`, {
        method: 'DELETE',
        headers: { 'X-Role': localStorage.getItem('role') || '' }
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Errore nella cancellazione del progresso');
    }
    return data;
}

async function exportDatabase() {
    const res = await fetch('/api/export-db', {
        headers: { 'X-Role': localStorage.getItem('role') || '' }
    });
    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Errore nell\'esportazione del DB');
    }
    return await res.blob();
}


async function fetchUser(id) {
    const res = await fetch(`/api/users/${id}`);
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || 'Errore nel recupero utente');
    }
    return data;
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
