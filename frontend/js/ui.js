function populateUrl(url) {
    streUrl = document.getElementById("stre-url");
    //console.log(url)
    if (url == null) {
        streUrl.classList.add("text-red-600");
        streUrl.innerHTML = "Nessun link trovato per StreamingCommunity";
    } else {
        streUrl.innerHTML = `<a href="https://${url}" target="_blank" class="text-blue-600">${url}</a>`
    }
}

function populateSearchResults(results, query, mainUrl) {

    document.getElementById('search-query-title').innerHTML = `Risultati per: ${query}`;

    const resultsCardsContainer = document.getElementById('search-cards-container');

    if (!results || Object.keys(results).length === 0) {
        resultsCardsContainer.innerHTML = "Nessun titolo corrisponde alla tua ricerca.";
        return;
    }

    resultsCardsContainer.innerHTML = "";

    for (const [title, data] of Object.entries(results)) {
        const cover = data.images.find(img => img.type === "cover");
        const imgUrl = cover
            ? `https://cdn.${mainUrl}/images/${cover.filename}`
            : "https://upload.wikimedia.org/wikipedia/commons/thumb/6/65/No-Image-Placeholder.svg/495px-No-Image-Placeholder.png";

        const year = data.last_air_date ? data.last_air_date.split("-")[0] : "?";

        const card = `
                    <div class="border rounded-[2em] flex gap-10 items-center shadow overflow-hidden max-h-56 p-4 bg-white">
                        <img src="${imgUrl}" alt="${title}" class="h-48 aspect-video object-contain rounded-2xl">
                        <div class="flex flex-col gap-1">
                            <span class="font-bold text-xl">${title}</span>
                            <span>Valutazione: ${data.score || "?"}</span>
                            <span>${data.type === "movie" ? "Movie" : "Serie TV"}</span>
                            <span>${year}</span>
                            <div class="mt-4 flex gap-2">
                                <button onClick="searchResultToDownload(${data.id})" class="bg-green-500 rounded-[0.5em] text-white px-4 py-2 font-medium">Scarica</button>
                                <a href="https://${mainUrl}/it/watch/${data.id}" target="_blank" class="bg-blue-500 rounded-[0.5em] text-white px-4 py-2 font-medium">Guarda</a>
                            </div>
                        </div>
                    </div>
                `;

        resultsCardsContainer.innerHTML += card;
    }
}

function populateSearchResultError() {
    const resultsCardsContainer = document.getElementById('search-cards-container');
    resultsCardsContainer.innerHTML = `<p class="text-red-500">Errore nella ricerca. Riprova più tardi.</p>`;
}

function updateDownloadProgress(percent, eta = null, downloaded = null, total = null, speed = null) {
    document.getElementById('progress-span').innerHTML = percent + '%';
    document.getElementById('progress-bar').style.width = percent + '%';

    if (eta) {
        document.getElementById('progress-eta').innerHTML = 'ETA: ' + eta;
    }
    if (downloaded && total) {
        document.getElementById('progress-data').innerHTML = `${downloaded} / ${total}`;
    }
    if (speed) {
        document.getElementById('progress-speed').innerHTML = `Velocità: ${speed}`;
    }
}

function homeToSearchResult() {
    document.querySelector('form').classList.add('hidden');
    document.getElementById('search-results').classList.remove('hidden');
}

function searchResultToHome() {
    document.querySelector('form').classList.remove('hidden');
    document.getElementById('search-results').classList.add('hidden');
}

function searchResultToDownload(id) {
    filmId = id;
    document.getElementById('search-results').classList.add('hidden')
    document.getElementById('download-tab').classList.remove('hidden')
}

function downloadToSearchResult() {
    document.getElementById('search-results').classList.remove('hidden')
    document.getElementById('download-tab').classList.add('hidden')
}