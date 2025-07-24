async function fetchUrl() {
    const res = await fetch('/api/get-stre-domain');
    const data = await res.json();
    return data;
}

async function fetchSearch(query, domain = null) {
    const url = domain ? `/api/search/${query}?domain=${domain}` : `/api/search/${query}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
}

async function fetchInfo(slug, domain = null) {
    const url = domain ? `/api/getinfo/${slug}?domain=${domain}` : `/api/getinfo/${slug}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
}

async function fetchExtendedInfo(slug, domain = null) {
    const url = domain ? `/api/get-extended-info/${slug}?domain=${domain}` : `/api/get-extended-info/${slug}`;
    const res = await fetch(url);
    const data = await res.json();
    return data;
}