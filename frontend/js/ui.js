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

function homeToSearchResult() {
    document.querySelector('form').classList.add('hidden');
    document.getElementById('search-results').classList.remove('hidden');
}

function searchResultToHome() {
    document.querySelector('form').classList.remove('hidden');
    document.getElementById('search-results').classList.add('hidden');
}

function searchResultToDownload() {
    document.getElementById('search-results').classList.add('hidden')
    document.getElementById('download-tab').classList.remove('hidden')
}

function downloadToSearchResult() {
    document.getElementById('search-results').classList.remove('hidden')
    document.getElementById('download-tab').classList.add('hidden')
}