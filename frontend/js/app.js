let socketid = undefined;
let filmId = null;

window.onload = () => {
    const socket = io();
    socket.connect("http://127.0.0.1:5000");

    socket.on("connect", () => {
        console.log("Connected!");
        socketid = socket.id;
        console.log("Socket id: " + socketid);
    })

    /* Gestione dello stato del download */
    socket.on('download_progress', data => {
        updateDownloadProgress(
            data.percent,
            data.eta,
            data.downloaded,
            data.total,
            data.speed
        );
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    const mainUrl = await fetchUrl();
    populateUrl(mainUrl);

    const form = document.querySelector('form');
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
            populateSearchResults(results, input.value, mainUrl);

        } catch (err) {
            console.error("Errore nella ricerca:", err);
            populateSearchResultError();
        }
    });

    downloadBtn.addEventListener('click', async (e) => {
        fetch(`/api/download/${mainUrl}/${filmId}/${socketid}`);
    })
});
