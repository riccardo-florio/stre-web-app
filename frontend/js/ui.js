function populateUrl(data) {
    const streUrl = document.getElementById("stre-url");

    if (!data || !data.domain) {
        streUrl.classList.add("text-red-600");
        streUrl.innerHTML = "Nessun link trovato per StreamingCommunity";
        return;
    }

    if (data.reachable) {
        streUrl.classList.remove("text-red-600");
        streUrl.innerHTML = `<a href="https://${data.domain}" target="_blank" class="text-blue-600">${data.domain}</a>`;
    } else {
        streUrl.classList.add("text-red-600");
        streUrl.innerHTML = `Dominio non raggiungibile: ${data.domain}<div class="mt-2 flex gap-2"><input id="custom-url-input" type="text" placeholder="Inserisci dominio" class="border p-1 rounded"><button id="custom-url-btn" class="bg-blue-500 text-white px-3 py-1 rounded">Usa</button></div>`;
        document.getElementById("custom-url-btn").addEventListener("click", () => {
            const val = document.getElementById("custom-url-input").value.trim();
            if (val) {
                mainUrl = val;
                streUrl.classList.remove("text-red-600");
                streUrl.innerHTML = `<a href="https://${val}" target="_blank" class="text-blue-600">${val}</a>`;
            }
        });
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
                    <div class="border rounded-[2em] flex gap-10 items-center shadow overflow-hidden h-56 p-4 pr-6 bg-white">
                        <img src="${imgUrl}" alt="${title}" class="h-48 aspect-video object-contain rounded-2xl">
                        <div class="flex flex-col justify-between h-full flex-1">
                            <div class="flex flex-col">
                                <span 
                                    class="font-semibold text-xl line-clamp-1 mb-4" 
                                    title="${title}">
                                    ${title}
                                </span>
                                <span>Valutazione: <span class="font-semibold">${data.score || "?"}</span></span>
                                <span>Tipo: <span class="font-semibold">${data.type === "movie" ? "Movie" : "Serie TV"}</span></span>
                                <span>Uscita: <span class="font-semibold">${year}</span></span>
                            </div>
                            <div class="mt-4 grid grid-cols-2 gap-3 w-full">
                                <a href="https://${mainUrl}/it/watch/${data.id}" target="_blank" class="bg-gray-200 rounded-[0.5em] text-gray-800 px-4 py-2 font-medium text-center">Guarda</a>
                                <button onClick="searchResultToDownload(${data.id}, '${data.slug}', '${title}')" class="bg-blue-500 rounded-[0.5em] text-white px-4 py-2 font-medium">Info</button>
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

async function populateDownloadSection(slug, title) {
    let completeSlug = `${filmId}-${slug}`;
    let data = await fetchInfo(completeSlug, mainUrl);
    console.log('preview', data);

    const coverUrl = `https://cdn.${mainUrl}/images/${data.images[2].filename}`;
    const uppercaseType =  data.type.charAt(0).toUpperCase() + data.type.slice(1);
    const genresString = data.genres.map(g => g.name).join(", ");

    document.getElementById('download-title').innerHTML = 'Info su ' + title;
    document.getElementById('choose-cover').src = coverUrl;
    document.getElementById('choose-plot').innerHTML = data.plot;
    document.getElementById('choose-plot').title = data.plot;
    document.getElementById('choose-info').innerHTML = `${uppercaseType} - ${data.release_date.split("-")[0]} - ${data.runtime} min`;
    document.getElementById('choose-genres').innerHTML = `Genere: ${genresString}`;
    
    if (data.type == "tv") {
        const wrapper = document.getElementById('choose-episodes');
        const select = document.getElementById('season-select');
        const epContainer = document.getElementById('episodes-container');
        wrapper.classList.remove('hidden');

        let extendedData = await fetchExtendedInfo(completeSlug, mainUrl);

        const episodesBySeason = {};
        extendedData.episodeList.forEach(ep => {
            if (!episodesBySeason[ep.season]) {
                episodesBySeason[ep.season] = [];
            }
            episodesBySeason[ep.season].push(ep);
        });

        select.innerHTML = '';
        Object.keys(episodesBySeason).sort((a, b) => a - b).forEach(season => {
            const opt = document.createElement('option');
            opt.value = season;
            opt.textContent = 'Stagione ' + season;
            select.appendChild(opt);
        });

        function renderSeason(season) {
            epContainer.innerHTML = '';
            epContainer.scrollLeft = 0;
            episodesBySeason[season].forEach(ep => {
                const card = document.createElement('div');
                card.className = 'bg-white rounded-lg shadow overflow-hidden flex flex-col w-40 sm:w-48 flex-none';
                const img = document.createElement('img');
                if (ep.images && ep.images.length) {
                    img.src = `https://cdn.${mainUrl}/images/${ep.images[0].filename}`;
                }
                img.alt = ep.name;
                img.className = 'w-full object-cover';
                card.appendChild(img);

                const body = document.createElement('div');
                body.className = 'p-2 flex flex-col gap-1';
                const titleEl = document.createElement('h4');
                titleEl.className = 'font-semibold text-sm';
                titleEl.textContent = `E${ep.episode} - ${ep.name}`;
                body.appendChild(titleEl);
                const desc = document.createElement('p');
                desc.className = 'text-xs line-clamp-3';
                desc.textContent = ep.description || '';
                body.appendChild(desc);
                const btn = document.createElement('button');
                btn.className = 'bg-blue-500 text-white rounded px-2 py-1 text-xs mt-auto';
                btn.textContent = 'Scarica';
                btn.onclick = () => {
                    socket.emit('start_download', {
                        domain: mainUrl,
                        filmid: ep.id
                    });
                };
                body.appendChild(btn);

                card.appendChild(body);
                epContainer.appendChild(card);
            });
        }

        select.onchange = () => renderSeason(select.value);
        // render first season by default
        renderSeason(select.value || Object.keys(episodesBySeason)[0]);
    } else {
        document.getElementById('choose-episodes').classList.add('hidden');
    }
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

function startSearchLoading() {
    document.getElementById("search-button").innerHTML = `
    <svg width="20" height="20" stroke="#ffff" viewBox="0 0 24 24"
                                xmlns="http://www.w3.org/2000/svg">
        <style>
            .spinner_V8m1 {
                transform-origin: center;
                animation: spinner_zKoa 2s linear infinite
            }

            .spinner_V8m1 circle {
                stroke-linecap: round;
                animation: spinner_YpZS 1.5s ease-in-out infinite
            }

            @keyframes spinner_zKoa {
                100% {
                    transform: rotate(360deg)
                }
            }

            @keyframes spinner_YpZS {
                0% {
                    stroke-dasharray: 0 150;
                    stroke-dashoffset: 0
                }

                47.5% {
                    stroke-dasharray: 42 150;
                    stroke-dashoffset: -16
                }

                95%,
                100% {
                    stroke-dasharray: 42 150;
                    stroke-dashoffset: -59
                }
            }
        </style>
        <g class="spinner_V8m1">
            <circle cx="12" cy="12" r="9.5" fill="none" stroke-width="3"></circle>
        </g>
    </svg>
    `
}

function stopSearchLoading() {
    document.getElementById("search-button").innerHTML = `
    <span class="material-symbols-rounded text-[20px]">
        search
    </span>
    `
}

const form = document.querySelector('form');
const searchResults = document.getElementById('search-results');
const downloadTab = document.getElementById('download-tab');
const slidingContainer = document.getElementById('sliding-container');

function homeToSearchResult() {
    slidingContainer.classList.remove('translate-y-0');
    slidingContainer.classList.add('-translate-y-1/3');
    slidingContainer.classList.remove('-translate-y-2/3');

    form.classList.add('opacity-0');
    searchResults.classList.remove('opacity-0');
    downloadTab.classList.add('opacity-0');
}

function searchResultToHome() {
    slidingContainer.classList.add('translate-y-0');
    slidingContainer.classList.remove('-translate-y-1/3');
    slidingContainer.classList.remove('-translate-y-2/3');

    form.classList.remove('opacity-0');
    searchResults.classList.add('opacity-0');
    downloadTab.classList.add('opacity-0');
}

function searchResultToDownload(id, slug, title) {
    filmId = id;

    populateDownloadSection(slug, title)

    slidingContainer.classList.remove('translate-y-0');
    slidingContainer.classList.remove('-translate-y-1/3');
    slidingContainer.classList.add('-translate-y-2/3');

    form.classList.add('opacity-0');
    searchResults.classList.add('opacity-0');
    downloadTab.classList.remove('opacity-0');
}

function downloadToSearchResult() {
    slidingContainer.classList.remove('translate-y-0');
    slidingContainer.classList.add('-translate-y-1/3');
    slidingContainer.classList.remove('-translate-y-2/3');

    form.classList.add('opacity-0');
    searchResults.classList.remove('opacity-0');
    downloadTab.classList.add('opacity-0');
}