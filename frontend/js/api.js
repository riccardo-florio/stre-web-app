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

async function checkDomainReachable(domain) {
    try {
        const res = await fetch(`/api/check-domain/${domain}`);
        const data = await res.json();
        return data.reachable;
    } catch (err) {
        console.error('Errore nel controllo del dominio', err);
        return false;
    }
}