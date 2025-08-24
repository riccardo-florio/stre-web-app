function toggleMobileMenu() {
    document.getElementById('download-tab').classList.toggle('opacity-0');
    document.getElementById('download-tab').classList.toggle('pointer-events-none');
}

function handleAccountModal() {
    const username = localStorage.getItem('username');
    if (username) {
        showUserModal();
    } else {
        showLoginModal();
    }
}

function showLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.remove('opacity-0');
    modal.classList.remove('pointer-events-none');
    const usernameInput = modal.querySelector('input[name="username"]');
    if (usernameInput) usernameInput.focus();
}

function hideLoginModal() {
    const modal = document.getElementById('login-modal');
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
    const usernameInput = modal.querySelector('input[name="username"]');
    const passwordInput = modal.querySelector('input[type="password"]');
    const errorEl = document.getElementById('login-error-message');
    if (usernameInput) usernameInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (errorEl) errorEl.textContent = '';
}

function showRegisterModal() {
    hideLoginModal();
    const modal = document.getElementById('register-modal');
    modal.classList.remove('opacity-0');
    modal.classList.remove('pointer-events-none');
    const nameInput = modal.querySelector('input[name="nome"]');
    if (nameInput) nameInput.focus();
}

function hideRegisterModal() {
    const modal = document.getElementById('register-modal');
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
    modal.querySelectorAll('input').forEach(input => {
        if (input.type !== 'submit') input.value = '';
    });
    const errorEl = document.getElementById('register-error-message');
    if (errorEl) errorEl.textContent = '';
}

function showUserModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.remove('opacity-0');
    modal.classList.remove('pointer-events-none');
    document.getElementById('detail-nome').textContent = `Nome: ${localStorage.getItem('first_name') || '-'}`;
    document.getElementById('detail-cognome').textContent = `Cognome: ${localStorage.getItem('last_name') || '-'}`;
    document.getElementById('detail-username').textContent = `Username: ${localStorage.getItem('username') || '-'}`;
    document.getElementById('detail-email').textContent = `Email: ${localStorage.getItem('email') || '-'}`;
    const role = localStorage.getItem('role');
    const roleEl = document.getElementById('detail-role');
    const adminBtn = document.getElementById('admin-dashboard-btn');
    if (role === 'admin') {
        roleEl.textContent = `Ruolo: ${role}`;
        roleEl.classList.remove('hidden');
        adminBtn.classList.remove('hidden');
    } else {
        roleEl.classList.add('hidden');
        adminBtn.classList.add('hidden');
    }
}

function hideUserModal() {
    const modal = document.getElementById('user-modal');
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
}

function showAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.classList.remove('opacity-0');
    modal.classList.remove('pointer-events-none');
    showAdminSection('users');
}

function hideAdminModal() {
    const modal = document.getElementById('admin-modal');
    modal.classList.add('opacity-0');
    modal.classList.add('pointer-events-none');
}

function showAdminSection(section) {
    const usersLink = document.getElementById('admin-users-link');
    const progressLink = document.getElementById('admin-progress-link');
    const updateLink = document.getElementById('admin-update-link');
    const usersSection = document.getElementById('admin-users-section');
    const progressSection = document.getElementById('admin-progress-section');
    const updateSection = document.getElementById('admin-update-section');

    usersLink.classList.remove('bg-gray-200');
    progressLink.classList.remove('bg-gray-200');
    updateLink.classList.remove('bg-gray-200');
    usersSection.classList.add('hidden');
    progressSection.classList.add('hidden');
    updateSection.classList.add('hidden');

    if (section === 'users') {
        usersLink.classList.add('bg-gray-200');
        usersSection.classList.remove('hidden');
        populateUserTable();
    } else if (section === 'progress') {
        progressLink.classList.add('bg-gray-200');
        progressSection.classList.remove('hidden');
        populateProgressTable();
    } else if (section === 'update') {
        updateLink.classList.add('bg-gray-200');
        updateSection.classList.remove('hidden');
        populateUpdateSection();
    }
}

async function populateUserTable() {
    const container = document.getElementById('admin-users');
    container.innerHTML = '';
    try {
        const users = await fetchUsers();
        const table = document.createElement('table');
        table.className = 'min-w-full text-sm border border-gray-300';
        table.innerHTML = `
            <thead class="bg-gray-100">
                <tr>
                    <th class="border-b px-2 py-1 text-left">Username</th>
                    <th class="border-b px-2 py-1 text-left">Nome</th>
                    <th class="border-b px-2 py-1 text-left">Cognome</th>
                    <th class="border-b px-2 py-1 text-left">Email</th>
                    <th class="border-b px-2 py-1 text-left">Ruolo</th>
                    <th class="border-b px-2 py-1 text-left">Azioni</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        users.forEach(u => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="border-b px-2 py-1">${u.username}</td>
                <td class="border-b px-2 py-1"><input id="fn-${u.id}" value="${u.first_name}" class="border px-1 py-0.5 rounded w-full" /></td>
                <td class="border-b px-2 py-1"><input id="ln-${u.id}" value="${u.last_name}" class="border px-1 py-0.5 rounded w-full" /></td>
                <td class="border-b px-2 py-1"><input id="em-${u.id}" value="${u.email}" class="border px-1 py-0.5 rounded w-full" /></td>
                <td class="border-b px-2 py-1"><select id="rl-${u.id}" class="border px-1 py-0.5 rounded w-full">
                    <option value="normal" ${u.role === 'normal' ? 'selected' : ''}>normal</option>
                    <option value="privileged" ${u.role === 'privileged' ? 'selected' : ''}>privileged</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>admin</option>
                </select></td>
                <td class="border-b px-2 py-1">
                    <div class="flex gap-1">
                        <button onclick="updateUserHandler(${u.id})" class="bg-blue-500 text-white px-2 rounded">Salva</button>
                        <button onclick="deleteUserHandler(${u.id})" class="bg-red-500 text-white px-2 rounded">Elimina</button>
                    </div>
                </td>
            `;
            tbody.appendChild(row);
        });
        container.appendChild(table);
    } catch (err) {
        container.innerHTML = `<span class='text-red-600'>${err.message}</span>`;
    }
}

async function updateUserHandler(id) {
    const first_name = document.getElementById(`fn-${id}`).value.trim();
    const last_name = document.getElementById(`ln-${id}`).value.trim();
    const email = document.getElementById(`em-${id}`).value.trim();
    const role = document.getElementById(`rl-${id}`).value;
    try {
        const updated = await updateUser(id, first_name, last_name, email, role);
        if (String(id) === localStorage.getItem('userId')) {
            localStorage.setItem('first_name', updated.first_name);
            localStorage.setItem('last_name', updated.last_name);
            localStorage.setItem('email', updated.email);
            localStorage.setItem('role', updated.role);
            localStorage.setItem('username', updated.username);
            updateMainTitle(updated.first_name);
            updateRoleUI(updated.role);
            if (updated.role !== 'admin') {
                hideAdminModal();
            }
        }
        await populateUserTable();
    } catch (err) {
        alert(err.message);
    }
}

async function deleteUserHandler(id) {
    if (!confirm('Sei sicuro di voler eliminare questo utente?')) return;
    try {
        await deleteUser(id);
        await populateUserTable();
    } catch (err) {
        alert(err.message);
    }
}

async function populateProgressTable() {
    const container = document.getElementById('admin-progress');
    container.innerHTML = '';
    try {
        const entries = await fetchAllProgress();
        const table = document.createElement('table');
        table.className = 'min-w-full text-sm border border-gray-300';
        table.innerHTML = `
            <thead class="bg-gray-100">
                <tr>
                    <th class="border-b px-2 py-1 text-left">Username</th>
                    <th class="border-b px-2 py-1 text-left">Titolo</th>
                    <th class="border-b px-2 py-1 text-left">Progresso</th>
                    <th class="border-b px-2 py-1 text-left">Film ID</th>
                    <th class="border-b px-2 py-1 text-left">User ID</th>
                    <th class="border-b px-2 py-1 text-left">Aggiornato</th>
                    <th class="border-b px-2 py-1 text-left">Azioni</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;
        const tbody = table.querySelector('tbody');
        entries.forEach(e => {
            const percent = e.duration ? Math.round((e.progress / e.duration) * 100) : 0;
            const updatedAt = e.updatedAt ? new Date(e.updatedAt).toLocaleString() : '';
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="border-b px-2 py-1">${e.username}</td>
                <td class="border-b px-2 py-1">${e.title || e.slug || e.film_id}</td>
                <td class="border-b px-2 py-1">${percent}%</td>
                <td class="border-b px-2 py-1">${e.film_id}</td>
                <td class="border-b px-2 py-1">${e.user_id}</td>
                <td class="border-b px-2 py-1">${updatedAt}</td>
                <td class="border-b px-2 py-1"><button onclick="deleteProgressHandler(${e.user_id}, '${e.film_id}')" class="bg-red-500 text-white px-2 rounded">Elimina</button></td>
            `;
            tbody.appendChild(row);
        });
        container.appendChild(table);
    } catch (err) {
        container.innerHTML = `<span class='text-red-600'>${err.message}</span>`;
    }
}

async function populateUpdateSection() {
    const container = document.getElementById('admin-update');
    container.innerHTML = '';
    try {
        const release = await fetchLatestRelease();
        const published = release.published_at
            ? new Date(release.published_at).toLocaleString()
            : '';
        container.innerHTML = `
            <div class="flex flex-col gap-2">
                <span><strong>Versione:</strong> ${release.tag_name || ''}</span>
                <span><strong>Pubblicata:</strong> ${published}</span>
                <a href="${release.html_url}" target="_blank" class="text-blue-600 underline">Vedi su GitHub</a>
                <p class="text-pretty whitespace-pre-line">${release.body || ''}</p>
            </div>
        `;
    } catch (err) {
        container.innerHTML = `<span class='text-red-600'>Errore nel recupero della release</span>`;
        console.error('Errore nel recupero della release', err);
    }
}

async function deleteProgressHandler(userId, filmId) {
    if (!confirm('Eliminare questo progresso?')) return;
    try {
        await deleteProgress(userId, filmId);
        await populateProgressTable();
    } catch (err) {
        alert(err.message);
    }
}

async function handleExportDb() {
    try {
        const blob = await exportDatabase();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'users.db';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    } catch (err) {
        alert(err.message);
    }
}

async function register(event) {
    event.preventDefault();
    const form = document.getElementById('registration-form');
    const nome = form.querySelector('input[name="nome"]').value.trim();
    const cognome = form.querySelector('input[name="cognome"]').value.trim();
    const username = form.querySelector('input[name="username"]').value.trim();
    const email = form.querySelector('input[name="email"]').value.trim();
    const password = form.querySelector('input[name="password"]').value.trim();
    const errorEl = document.getElementById('register-error-message');
    if (errorEl) {
        errorEl.textContent = '';
        errorEl.classList.remove('text-green-600');
        errorEl.classList.add('text-red-600');
    }
    if (!nome || !cognome || !username || !email || !password) {
        if (errorEl) errorEl.textContent = 'Tutti i campi sono obbligatori';
        return;
    }
    try {
        const data = await fetchSignIn(nome, cognome, username, email, password);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userId', data.id);
        localStorage.setItem('first_name', data.first_name);
        localStorage.setItem('last_name', data.last_name);
        localStorage.setItem('email', data.email);
        localStorage.setItem('role', data.role);
        updateRoleUI(data.role);
        updateMainTitle(data.first_name);
        hideRegisterModal();
        populateContinueWatching();
    } catch (err) {
        if (errorEl) errorEl.textContent = err.message;
    }
}

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        hideLoginModal();
        hideRegisterModal();
        hideUserModal();
        hideAdminModal();
    }
});

function updateMainTitle(firstName) {
    const title = document.getElementById('main-title');
    if (!title) return;
    const role = localStorage.getItem('role');
    const action = role === 'admin' ? 'fare oggi' : 'guardare';
    if (firstName) {
        const formatted = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
        title.textContent = `Ciao ${formatted}, cosa vuoi ${action}?`;
    } else {
        title.textContent = `Cosa vuoi ${action}?`;
    }
}

function updateRoleUI(role = localStorage.getItem('role')) {
    const downloadBtn = document.getElementById('download-btn');
    const downloadTab = document.getElementById('download-tab');
    const mainAccountBtn = document.getElementById('main-account-btn');
    const mobileAccountBtn = document.getElementById('mobile-account-btn');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    if (role === 'admin') {
        if (downloadBtn) downloadBtn.classList.remove('hidden');
        if (downloadTab) downloadTab.classList.remove('hidden');
        if (mainAccountBtn) mainAccountBtn.classList.add('hidden');
        if (mobileAccountBtn) mobileAccountBtn.classList.add('hidden');
        if (mobileMenuBtn) mobileMenuBtn.classList.remove('hidden');
    } else {
        if (downloadBtn) downloadBtn.classList.add('hidden');
        if (downloadTab) downloadTab.classList.add('hidden');
        if (mainAccountBtn) mainAccountBtn.classList.remove('hidden');
        if (mobileAccountBtn) mobileAccountBtn.classList.remove('hidden');
        if (mobileMenuBtn) mobileMenuBtn.classList.add('hidden');
    }
}

async function getLatestReleaseVersion() {
  const url = 'https://api.github.com/repos/riccardo-florio/stre-web-app/releases/latest';

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error("Errore nella richiesta");

    const data = await response.json();
    return data.tag_name; // ad esempio: "v1.2.3"
  } catch (error) {
    console.error("Errore:", error);
    return null;
  }
}

async function checkVersions() {
    const latestVersion = await getLatestReleaseVersion();
    const currentVersion = await fetchAppVersion();

    console.log("Ultima release:", latestVersion);
    console.log("Versione corrente:", currentVersion);

    const releaseversion = document.getElementById("release-version");
    if (latestVersion == currentVersion) {
        releaseversion.innerHTML = currentVersion;
    } else {
        releaseversion.innerHTML = `${currentVersion} (<span class="text-green-600 font-semibold">new ${latestVersion}</span>)`;
    }
}

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
        resultsCardsContainer.innerHTML = "<p class=\"text-pretty\">Nessun titolo corrisponde alla tua ricerca.</p>";
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
            <div class="border rounded-[2em] flex flex-col sm:flex-row gap-6 sm:gap-10 shadow overflow-hidden p-4 sm:pr-6 bg-white">
                <img src="${imgUrl}" alt="${title}" class="w-full sm:w-auto sm:h-48 aspect-video object-contain rounded-2xl mx-auto" />
                <div class="flex flex-col justify-between flex-1">
                <div class="flex flex-col mt-4 sm:mt-0">
                    <span class="font-semibold text-xl line-clamp-1 mb-2 sm:mb-4 text-pretty" title="${title}">
                    ${title}
                    </span>
                    <span class="text-pretty">Valutazione: <span class="font-semibold">${data.score || "?"}</span></span>
                    <span class="text-pretty">Tipo: <span class="font-semibold">${data.type === "movie" ? "Movie" : "Serie TV"}</span></span>
                    <span class="text-pretty">Uscita: <span class="font-semibold">${year}</span></span>
                </div>
                <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                    <button onClick='watchFromSearch(${data.id}, ${JSON.stringify(data.slug)}, ${JSON.stringify(title)}, ${JSON.stringify(imgUrl)}, ${JSON.stringify(data.type)})'
                    class="bg-gray-200 rounded-[0.5em] text-gray-800 px-4 py-2 font-medium">Guarda</button>
                    <button onClick='searchResultToDownload(${data.id}, ${JSON.stringify(data.slug)}, ${JSON.stringify(title)})'
                    class="bg-blue-500 rounded-[0.5em] text-white px-4 py-2 font-medium">Info</button>
                </div>
                </div>
            </div>
        `;

        resultsCardsContainer.innerHTML += card;
    }
}

function populateSearchResultError() {
    const resultsCardsContainer = document.getElementById('search-cards-container');
    resultsCardsContainer.innerHTML = `<p class="text-red-500 text-pretty">Errore nella ricerca. Riprova più tardi.</p>`;
}

async function watchFromSearch(id, slug, title, cover, type) {
    try {
        let hlsLink = null;
        let finalId = id;
        let finalTitle = title;
        let finalCover = cover;
        if (type === 'tv') {
            const extended = await fetchExtendedInfo(`${id}-${slug}`);
            const firstEp = (extended.episodeList || []).reduce((acc, ep) => {
                if (!acc) return ep;
                if (ep.season < acc.season) return ep;
                if (ep.season === acc.season && ep.episode < acc.episode) return ep;
                return acc;
            }, null);
            if (!firstEp) {
                alert('Nessun episodio disponibile');
                return;
            }
            const links = await fetchStreamingLinks(id, firstEp.id);
            hlsLink = links.find(l => l.includes('playlist') || l.includes('.m3u8'));
            if (!hlsLink) {
                alert('Nessun link disponibile');
                return;
            }
            finalCover = (firstEp.images && firstEp.images.length)
                ? `https://cdn.${mainUrl}/images/${firstEp.images[0].filename}`
                : cover;
            finalId = `${id}-${firstEp.id}`;
            finalTitle = `${title} - S${firstEp.season}E${firstEp.episode} - ${firstEp.name}`;
        } else {
            const links = await fetchStreamingLinks(id);
            hlsLink = links.find(l => l.includes('playlist') || l.includes('.m3u8'));
            if (!hlsLink) {
                alert('Nessun link disponibile');
                return;
            }
        }
        filmId = finalId;
        filmTitle = finalTitle;
        filmSlug = slug;
        filmCover = finalCover;
        showPlayer(hlsLink, finalId, slug, finalTitle, finalCover);
    } catch (err) {
        console.error('Errore nel recupero dei link', err);
        alert('Errore nel recupero dei link');
    }
}

async function resumeFromProgress(id, slug, title, cover) {
    try {
        const [baseId, episodeId] = id.split('-');
        const links = await fetchStreamingLinks(baseId, episodeId || null);
        const hlsLink = links.find(l => l.includes('playlist') || l.includes('.m3u8'));
        if (hlsLink) {
            filmId = id;
            filmTitle = title;
            filmSlug = slug;
            filmCover = cover;
            showPlayer(hlsLink, id, slug, title, cover);
        } else {
            alert('Nessun link disponibile');
        }
    } catch (err) {
        console.error('Errore nel recupero dei link', err);
        alert('Errore nel recupero dei link');
    }
}

async function populateContinueWatching() {
    const section = document.getElementById('continue-watching');
    const container = document.getElementById('continue-cards');
    if (!section || !container) return;
    let items = [];
    const userId = localStorage.getItem('userId');
    if (userId) {
        try {
            items = await fetchUserProgress(userId);
        } catch (_) {
            items = [];
        }
    } else {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith('progress-')) {
                const id = key.replace('progress-', '');
                const prog = parseFloat(localStorage.getItem(key));
                if (prog > 0) {
                    const meta = JSON.parse(localStorage.getItem('progress-meta-' + id) || '{}');
                    items.push({ film_id: id, progress: prog, duration: meta.duration || 0, slug: meta.slug, title: meta.title, cover: meta.cover, updatedAt: meta.updatedAt });
                }
            }
        }
    }
    const deduped = new Map();
    items.forEach((item) => {
        const [baseId] = (item.film_id || '').split('-');
        const ts = Date.parse(item.updatedAt) || 0;
        const existing = deduped.get(baseId);
        if (!existing || ts > existing.ts) {
            deduped.set(baseId, { ...item, ts });
        }
    });
    const finalItems = Array.from(deduped.values()).sort((a, b) => b.ts - a.ts);

    container.innerHTML = '';
    if (!finalItems.length) {
        section.classList.add('hidden');
        return;
    }
    finalItems.forEach(item => {
        const percent = item.duration ? Math.min((item.progress / item.duration) * 100, 100) : 0;
        const card = document.createElement('div');
        card.className = 'w-48 flex-shrink-0 cursor-pointer';
        card.onclick = () => resumeFromProgress(item.film_id, item.slug, item.title, item.cover);
        console.log(item.film_id, item.slug, item.title, item.cover);
        card.innerHTML = `
            <div class="relative">
                <img src="${item.cover || ''}" class="w-48 h-32 object-cover rounded-lg"/>
                <div class="absolute bottom-0 left-0 h-1 bg-blue-500" style="width:${percent}%"></div>
            </div>
            <span class="block mt-2 text-sm line-clamp-2 text-pretty">${item.title || ''}</span>
        `;
        container.appendChild(card);
    });
    section.classList.remove('hidden');
}

async function populateDownloadSection(slug, title) {
    filmSlug = slug;
    let completeSlug = `${filmId}-${slug}`;
    let data = await fetchInfo(completeSlug);
    console.log('preview', data);

    const coverUrl = `https://cdn.${mainUrl}/images/${data.images[2].filename}`;
    filmCover = coverUrl;
    const uppercaseType = data.type.charAt(0).toUpperCase() + data.type.slice(1);
    const genresString = data.genres.map(g => g.name).join(", ");

    document.getElementById('download-title').innerHTML = 'Info su ' + title;
    document.getElementById('choose-cover').src = coverUrl;
    document.getElementById('choose-plot').innerHTML = data.plot;
    document.getElementById('choose-plot').title = data.plot;
    document.getElementById('choose-info').innerHTML = `${uppercaseType} - ${data.release_date.split("-")[0]} - ${data.runtime} min`;
    document.getElementById('choose-genres').innerHTML = `Genere: ${genresString}`;

    const downloadBtn = document.getElementById('download-btn');
    const watchBtn = document.getElementById('watch-btn');
    const isNormal = localStorage.getItem('role') !== 'admin';

    if (data.type == "tv") {
        const wrapper = document.getElementById('choose-episodes');
        const select = document.getElementById('season-select');
        const epContainer = document.getElementById('episodes-container');
        wrapper.classList.remove('hidden');
        downloadBtn.classList.add('hidden');
        watchBtn.classList.add('hidden');

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
                body.className = 'p-2 flex-1 flex flex-col gap-1';
                const titleEl = document.createElement('h4');
                titleEl.className = 'font-semibold text-sm';
                titleEl.textContent = `E${ep.episode} - ${ep.name}`;
                body.appendChild(titleEl);
                const desc = document.createElement('p');
                desc.className = 'text-xs line-clamp-3';
                desc.textContent = ep.description || '';
                body.appendChild(desc);
                const btnContainer = document.createElement('div');
                btnContainer.className = 'grid gap-2 mt-auto';
                const watchEpBtn = document.createElement('button');
                watchEpBtn.className = 'bg-gray-200 text-gray-800 rounded px-2 py-1 text-xs';
                watchEpBtn.textContent = 'Guarda';
                watchEpBtn.onclick = async () => {
                    try {
                        const links = await fetchStreamingLinks(filmId, ep.id);
                        const hlsLink = links.find(l => l.includes('playlist') || l.includes('.m3u8'));
                        if (hlsLink) {
                            const epCover = (ep.images && ep.images.length)
                                ? `https://cdn.${mainUrl}/images/${ep.images[0].filename}`
                                : filmCover;
                            const combinedId = `${filmId}-${ep.id}`;
                            const epTitle = `${filmTitle} - S${ep.season}E${ep.episode} - ${ep.name}`;
                            showPlayer(hlsLink, combinedId, filmSlug, epTitle, epCover);
                        } else {
                            alert('Nessun link disponibile');
                        }
                    } catch (err) {
                        console.error('Errore nel recupero dei link', err);
                        alert('Errore nel recupero dei link');
                    }
                };
                const downloadEpBtn = document.createElement('button');
                downloadEpBtn.className = 'bg-blue-500 text-white rounded px-2 py-1 text-xs';
                downloadEpBtn.textContent = 'Scarica';
                downloadEpBtn.onclick = () => {
                    if (!isServerReachable()) {
                        notifyServerUnreachable();
                        return;
                    }
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
                btnContainer.appendChild(watchEpBtn);
                if (!isNormal) {
                    btnContainer.appendChild(downloadEpBtn);
                }
                body.appendChild(btnContainer);

                card.appendChild(body);
                epContainer.appendChild(card);
            });
        }

        select.onchange = () => renderSeason(select.value);
        // render first season by default
        renderSeason(select.value || Object.keys(episodesBySeason)[0]);
    } else {
        document.getElementById('choose-episodes').classList.add('hidden');
        if (isNormal) {
            downloadBtn.classList.add('hidden');
        } else {
            downloadBtn.classList.remove('hidden');
        }
        watchBtn.classList.remove('hidden');
        updateWatchButtonLabel(filmId);
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
    titleSpan.className = 'font-semibold text-pretty line-clamp-1 max-w-[75%]';
    titleSpan.textContent = title;
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'bg-red-600 rounded-[0.5em] text-white px-4 py-2 font-medium';
    cancelBtn.textContent = 'Annulla';
    cancelBtn.onclick = () => {
        if (!isServerReachable()) {
            notifyServerUnreachable();
            return;
        }
        socket.emit('cancel_download', { id });
    };
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

    downloads[id] = { bar, percentSpan, etaSpan, dataSpan, speedSpan, cancelBtn, loading: true, active: true };
    updateNoDownloadsMessage();
}

async function logIn(event) {
    event.preventDefault();
    const usernameInput = document.querySelector('#login-modal input[type="text"]');
    const passwordInput = document.querySelector('#login-modal input[type="password"]');
    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const errorEl = document.getElementById('login-error-message');
    errorEl.textContent = '';
    errorEl.classList.remove('text-green-600');
    errorEl.classList.add('text-red-600');
    if (!username || !password) {
        errorEl.textContent = 'Username e password sono obbligatori';
        return;
    }
    try {
        const data = await fetchLogIn(username, password);
        localStorage.setItem('username', data.username);
        localStorage.setItem('userId', data.id);
        localStorage.setItem('first_name', data.first_name);
        localStorage.setItem('last_name', data.last_name);
        localStorage.setItem('email', data.email);
        localStorage.setItem('role', data.role);
        updateRoleUI(data.role);
        updateMainTitle(data.first_name);
        hideLoginModal();
        populateContinueWatching();
    } catch (err) {
        errorEl.textContent = err.message;
    }
}

async function confirmLogOut() {
    if (confirm('Sei sicuro di voler uscire?')) {
        await logOut();
    }
}

async function logOut() {
    try {
        await fetch('/api/logout', { method: 'POST' });
    } catch (_) {}
    localStorage.removeItem('username');
    localStorage.removeItem('userId');
    localStorage.removeItem('first_name');
    localStorage.removeItem('last_name');
    localStorage.removeItem('email');
    localStorage.removeItem('role');
    updateRoleUI();
    updateMainTitle();
    hideUserModal();
    populateContinueWatching();
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

function updateNoDownloadsMessage() {
    const msg = document.getElementById('no-download-msg');
    const indicator = document.getElementById('download-indicator');
    const hasActive = Object.values(downloads).some(d => d.active);
    if (hasActive) {
        msg.classList.add('hidden');
        if (indicator) {
            indicator.classList.remove('hidden');
        }
    } else {
        msg.classList.remove('hidden');
        if (indicator) {
            indicator.classList.add('hidden');
        }
    }
}

function homeToSearchResult(query = null, updateHistory = true) {
    slidingContainer.classList.remove('translate-y-0');
    slidingContainer.classList.add('-translate-y-1/3');
    slidingContainer.classList.remove('-translate-y-2/3');

    form.classList.add('opacity-0');
    searchResults.classList.remove('opacity-0');
    infoTab.classList.add('opacity-0');
    if (updateHistory) {
        const url = query ? `#search?q=${encodeURIComponent(query)}` : '#search';
        history.pushState({ page: 'search', query }, '', url);
    }
}

function searchResultToHome(updateHistory = true) {
    slidingContainer.classList.add('translate-y-0');
    slidingContainer.classList.remove('-translate-y-1/3');
    slidingContainer.classList.remove('-translate-y-2/3');

    form.classList.remove('opacity-0');
    searchResults.classList.add('opacity-0');
    infoTab.classList.add('opacity-0');
    if (updateHistory) {
        history.pushState({ page: 'home' }, '', '#home');
    }
}

function searchResultToDownload(id, slug, title, updateHistory = true) {
    filmId = id;
    filmTitle = title;
    filmSlug = slug;

    populateDownloadSection(slug, title)

    slidingContainer.classList.remove('translate-y-0');
    slidingContainer.classList.remove('-translate-y-1/3');
    slidingContainer.classList.add('-translate-y-2/3');

    form.classList.add('opacity-0');
    searchResults.classList.add('opacity-0');
    infoTab.classList.remove('opacity-0');
    if (updateHistory) {
        const url = `#download?id=${id}&slug=${encodeURIComponent(slug)}&title=${encodeURIComponent(title)}`;
        history.pushState({ page: 'download', filmId: id, slug: slug, title: title }, '', url);
    }
}

async function downloadToSearchResult(updateHistory = true) {
    if (!lastSearchQuery && filmTitle) {
        // No previous search results in this session. Use the film title
        // to fetch them so the list is populated when returning.
        await searchAndShowResults(filmTitle, updateHistory);
        return;
    }

    slidingContainer.classList.remove('translate-y-0');
    slidingContainer.classList.add('-translate-y-1/3');
    slidingContainer.classList.remove('-translate-y-2/3');

    form.classList.add('opacity-0');
    searchResults.classList.remove('opacity-0');
    infoTab.classList.add('opacity-0');
    if (updateHistory) {
        const url = lastSearchQuery ? `#search?q=${encodeURIComponent(lastSearchQuery)}` : '#search';
        history.pushState({ page: 'search', query: lastSearchQuery }, '', url);
    }
}