let idSelezione = null;

document.addEventListener('DOMContentLoaded', async () => {
    const socket = io(); // <--- Inizializza connessione WebSocket

    const mainUrl = await fetchUrl();
    populateUrl(mainUrl);

    const form = document.querySelector('form');
    const downloadBtn = document.getElementById('download-btn');
    const progressContainer = document.getElementById('download-progress-container');
    const progressBar = document.getElementById('download-progress-bar');
    const progressText = document.getElementById('download-progress-text');

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
            const results = await fetchSearch(encodedQuery);
            homeToSearchResult();
            populateResults(results, mainUrl, query);
        } catch (err) {
            console.error("Errore nella ricerca:", err);
            populateResultsError();
        }
    });

    downloadBtn.addEventListener('click', async () => {
        if (!idSelezione) {
            alert("Seleziona un contenuto da scaricare.");
            return;
        }

        // Mostra barra di progresso
        progressContainer.classList.remove("hidden");
        progressBar.style.width = "0%";
        progressText.textContent = "0%";

        // Avvia il download
        try {
            await fetch(`/api/download/${mainUrl}/${idSelezione}`);
        } catch (err) {
            console.error("Errore durante l'avvio del download:", err);
        }
    });

    // Ascolta aggiornamenti dal server
    socket.on("download_progress", data => {
        const percent = data.percent;
        progressBar.style.width = percent + "%";
        progressText.textContent = percent + "%";
    });

    socket.on("download_finished", () => {
        progressText.textContent = "✅ Download completato";
        progressBar.style.width = "100%";
    });
});
