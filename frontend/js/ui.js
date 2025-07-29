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
    let data = await fetchInfo(completeSlug);
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
    
    const downloadBtn = document.getElementById('download-btn');

    if (data.type == "tv") {
        const wrapper = document.getElementById('choose-episodes');
        const select = document.getElementById('season-select');
        const epContainer = document.getElementById('episodes-container');
        wrapper.classList.remove('hidden');
        downloadBtn.classList.add('hidden');

        let extendedData = await fetchExtendedInfo(completeSlug);

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
                        filmid: filmId,
                        episodeid: ep.id,
                        series: filmTitle,
                        season: ep.season,
                        episode_name: ep.name,
                        episode: ep.episode
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
        downloadBtn.classList.remove('hidden');
    }
}

function updateDownloadProgress(id, percent, eta = null, downloaded = null, total = null, speed = null) {
    const item = downloads[id];
    if (!item) return;

    if (item.loading) {
        item.loading = false;
        item.bar.classList.remove('animate-pulse');
    }

    item.percentSpan.innerHTML = percent + '%';
    item.bar.style.width = percent + '%';

    if (eta) {
        item.etaSpan.innerHTML = 'ETA: ' + eta;
    }
    if (downloaded && total) {
        item.dataSpan.innerHTML = `${downloaded} / ${total}`;
    }
    if (speed) {
        item.speedSpan.innerHTML = `Velocità: ${speed}`;
    }
}

function createDownloadItem(id, title) {
    const container = document.getElementById('downloads-container');
    const wrapper = document.createElement('div');
    wrapper.className = 'border-b pb-4 mb-4';

    const header = document.createElement('div');
    header.className = 'flex justify-between items-center mb-2';
    const titleSpan = document.createElement('span');
    titleSpan.className = 'font-semibold';
    titleSpan.textContent = title;
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'bg-red-600 rounded-[0.5em] text-white px-4 py-2 font-medium';
    cancelBtn.textContent = 'Annulla';
    cancelBtn.onclick = () => { socket.emit('cancel_download', { id }); };
    header.appendChild(titleSpan);
    header.appendChild(cancelBtn);
    wrapper.appendChild(header);

    const barWrap = document.createElement('div');
    barWrap.className = 'my-2 w-full h-2.5 bg-gray-200 rounded-full overflow-hidden';
    const bar = document.createElement('div');
    bar.className = 'bg-blue-500 h-full w-full rounded-full animate-pulse';
    barWrap.appendChild(bar);
    wrapper.appendChild(barWrap);

    const line1 = document.createElement('div');
    line1.className = 'flex justify-between text-sm text-gray-600';
    const percentSpan = document.createElement('span');
    percentSpan.textContent = 'Caricamento in corso...';
    const etaSpan = document.createElement('span');
    etaSpan.textContent = 'ETA: --:--';
    line1.appendChild(percentSpan);
    line1.appendChild(etaSpan);
    wrapper.appendChild(line1);

    const line2 = document.createElement('div');
    line2.className = 'text-sm text-gray-600 mt-1 flex justify-between';
    const dataSpan = document.createElement('span');
    dataSpan.textContent = '0 / 0';
    const speedSpan = document.createElement('span');
    speedSpan.textContent = 'Velocità: --';
    line2.appendChild(dataSpan);
    line2.appendChild(speedSpan);
    wrapper.appendChild(line2);

    container.appendChild(wrapper);
    container.scrollTop = container.scrollHeight;

    downloads[id] = { bar, percentSpan, etaSpan, dataSpan, speedSpan, cancelBtn, loading: true };
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
const infoTab = document.getElementById('info-tab');
const slidingContainer = document.getElementById('sliding-container');
const downloads = {};

function homeToSearchResult() {
    slidingContainer.classList.remove('translate-y-0');
    slidingContainer.classList.add('-translate-y-1/3');
    slidingContainer.classList.remove('-translate-y-2/3');

    form.classList.add('opacity-0');
    searchResults.classList.remove('opacity-0');
    infoTab.classList.add('opacity-0');
}

function searchResultToHome() {
    slidingContainer.classList.add('translate-y-0');
    slidingContainer.classList.remove('-translate-y-1/3');
    slidingContainer.classList.remove('-translate-y-2/3');

    form.classList.remove('opacity-0');
    searchResults.classList.add('opacity-0');
    infoTab.classList.add('opacity-0');
}

function searchResultToDownload(id, slug, title) {
    filmId = id;
    filmTitle = title;

    populateDownloadSection(slug, title)

    slidingContainer.classList.remove('translate-y-0');
    slidingContainer.classList.remove('-translate-y-1/3');
    slidingContainer.classList.add('-translate-y-2/3');

    form.classList.add('opacity-0');
    searchResults.classList.add('opacity-0');
    infoTab.classList.remove('opacity-0');
}

function downloadToSearchResult() {
    slidingContainer.classList.remove('translate-y-0');
    slidingContainer.classList.add('-translate-y-1/3');
    slidingContainer.classList.remove('-translate-y-2/3');

    form.classList.add('opacity-0');
    searchResults.classList.remove('opacity-0');
    infoTab.classList.add('opacity-0');
}