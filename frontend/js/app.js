document.addEventListener('DOMContentLoaded', async () => {
    const mainUrl = await fetchUrl();
    populateUrl(mainUrl);

    const form = document.querySelector('form');
    const resultsCardsContainer = document.getElementById('search-cards-container');
    const downloadBtn = document.getElementById('download-btn');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const input = form.querySelector('input[type="text"]');
        const query = input.value.trim();

        if (!query) {
            alert("Inserisci un titolo!");
            return;
        }

        const encodedQuery = encodeURIComponent(query);

        try {
            const response = await fetch(`/api/search/${encodedQuery}`);
            const results = await response.json();

            //console.log(results);

            homeToSearchResult(); // cambia pagina

            document.getElementById('search-query-title').innerHTML = `Risultati per: ${input.value}`

            // Pulisci container
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
                                <button onClick="searchResultToDownload()" class="bg-green-500 rounded-[0.5em] text-white px-4 py-2 font-medium">Scarica</button>
                                <a href="https://${mainUrl}/it/watch/${data.id}" target="_blank" class="bg-blue-500 rounded-[0.5em] text-white px-4 py-2 font-medium">Guarda</a>
                            </div>
                        </div>
                    </div>
                `;

                resultsCardsContainer.innerHTML += card;
            }
        } catch (err) {
            console.error("Errore nella ricerca:", err);
            resultsCardsContainer.innerHTML = `<p class="text-red-500">Errore nella ricerca. Riprova più tardi.</p>`;
        }
    });

    downloadBtn.addEventListener('click', async (e) => {
        alert('ora ci si diverte')
    })
});
