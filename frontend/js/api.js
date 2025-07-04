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

function fetchDownload(domain, id) {
    fetch(`/api/download/${domain}/${id}`);    
}