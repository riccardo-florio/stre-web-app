(function () {
    const modal = document.getElementById('player-modal');
    const video = document.getElementById('video-player');
    const playPauseBtn = document.getElementById('play-pause');
    const progressBar = document.getElementById('player-progress');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const closeBtn = document.getElementById('close-player');
    const controls = document.getElementById('player-controls');
    const timeDisplay = document.getElementById('time-display');
    const loading = document.getElementById('player-loading');
    const nextEpisodeBtn = document.getElementById('next-episode');
    const titleDisplay = document.getElementById('player-title');
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let hideControlsTimeout = null;
    let hlsInstance = null;
    let currentFilmId = null;
    let currentFilmSlug = null;
    let currentFilmTitle = null;
    let currentFilmCover = null;
    let currentSeriesTitle = null;
    let resumeTime = 0;
    let lastProgressSent = 0;
    let nextEpisodeInfo = null;

    function hideControls() {
        controls.classList.add('opacity-0', 'pointer-events-none');
        closeBtn.classList.add('opacity-0', 'pointer-events-none');
        titleDisplay.classList.add('opacity-0', 'pointer-events-none');
    }

    function showControls() {
        controls.classList.remove('opacity-0', 'pointer-events-none');
        closeBtn.classList.remove('opacity-0', 'pointer-events-none');
        titleDisplay.classList.remove('opacity-0', 'pointer-events-none');
        if (video.paused) return;
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(hideControls, 3000);
    }

    function showLoading() {
        loading.classList.remove('hidden');
    }

    function hideLoading() {
        loading.classList.add('hidden');
    }

    async function showPlayer(src, filmId, slug = null, title = null, cover = null) {
        modal.classList.remove('hidden');
        history.pushState({ ...(history.state || {}), player: true }, '', location.href);
        currentFilmId = filmId;
        currentFilmSlug = slug;
        currentFilmTitle = title;
        currentFilmCover = cover;
        currentSeriesTitle = title ? title.split(' - S')[0] : null;
        titleDisplay.textContent = title || '';
        if (String(filmId).includes('-')) {
            const [baseId, episodeId] = String(filmId).split('-');
            await prepareNextEpisode(baseId, episodeId, slug);
        } else {
            nextEpisodeInfo = null;
            nextEpisodeBtn.classList.add('hidden');
        }
        const userId = localStorage.getItem('userId');
        if (userId) {
            try {
                resumeTime = await fetchVideoProgress(userId, filmId);
            } catch (_) {
                resumeTime = 0;
            }
        } else {
            resumeTime = parseFloat(localStorage.getItem('progress-' + filmId)) || 0;
        }
        showLoading();

        if (Hls.isSupported()) {
            hlsInstance = new Hls();
            hlsInstance.loadSource(src);
            hlsInstance.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }

        video.addEventListener('loadedmetadata', function init() {
            if (resumeTime > 0 && resumeTime < video.duration) {
                video.currentTime = resumeTime;
            }
            updateProgress();
            video.removeEventListener('loadedmetadata', init);
        });

        video.play();
        if (modal.requestFullscreen) {
            modal.requestFullscreen();
        }
        showControls();
        updateWatchButtonLabel();
    }

    function hidePlayer(popState = false) {
        modal.classList.add('hidden');
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
        if (screen.orientation && screen.orientation.unlock) {
            try { screen.orientation.unlock(); } catch (_) { }
        }
        clearTimeout(hideControlsTimeout);
        showControls();
        if (hlsInstance) {
            hlsInstance.destroy();
            hlsInstance = null;
        }
        video.pause();
        video.removeAttribute('src');
        progressBar.value = 0;
        timeDisplay.textContent = '0:00/0:00';
        titleDisplay.textContent = '';
        updateWatchButtonLabel();
        currentFilmId = null;
        currentFilmSlug = null;
        currentFilmTitle = null;
        currentFilmCover = null;
        currentSeriesTitle = null;
        resumeTime = 0;
        nextEpisodeInfo = null;
        nextEpisodeBtn.classList.add('hidden');
        hideLoading();
        if (popState && history.state && history.state.player) {
            history.back();
        }
    }

    async function prepareNextEpisode(baseId, episodeId, slug) {
        try {
            const extended = await fetchExtendedInfo(`${baseId}-${slug}`);
            const episodes = (extended.episodeList || []).sort(
                (a, b) => a.season - b.season || a.episode - b.episode
            );
            const idx = episodes.findIndex(ep => ep.id == episodeId);
            const nextEp = idx >= 0 ? episodes[idx + 1] : null;
            if (nextEp) {
                nextEpisodeInfo = { baseId, slug, nextEp };
                nextEpisodeBtn.classList.remove('hidden');
            } else {
                nextEpisodeInfo = null;
                nextEpisodeBtn.classList.add('hidden');
            }
        } catch (_) {
            nextEpisodeInfo = null;
            nextEpisodeBtn.classList.add('hidden');
        }
    }

    function togglePlay() {
        if (video.paused) {
            video.play();
        } else {
            video.pause();
        }
    }

    function updatePlayButton() {
        playPauseBtn.textContent = video.paused ? 'play_arrow' : 'pause';
    }

    function updateFullscreenButton() {
        fullscreenBtn.textContent = document.fullscreenElement ? 'fullscreen_exit' : 'fullscreen';
    }

    function formatTime(sec) {
        if (!sec || isNaN(sec)) return '0:00';
        const m = Math.floor(sec / 60);
        const s = Math.floor(sec % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    }

    function updateProgress() {
        progressBar.max = video.duration || 0;
        progressBar.value = video.currentTime;
        timeDisplay.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
        if (currentFilmId) {
            const userId = localStorage.getItem('userId');
            const now = Date.now();
            if (userId) {
                if (now - lastProgressSent > 1000) {
                    lastProgressSent = now;
                    saveVideoProgress(userId, currentFilmId, video.currentTime, currentFilmSlug, currentFilmTitle, currentFilmCover, video.duration);
                    populateContinueWatching();
                }
            } else {
                localStorage.setItem('progress-' + currentFilmId, video.currentTime);
                localStorage.setItem('progress-meta-' + currentFilmId, JSON.stringify({ slug: currentFilmSlug, title: currentFilmTitle, cover: currentFilmCover, duration: video.duration, updatedAt: new Date().toISOString() }));
                if (now - lastProgressSent > 1000) {
                    lastProgressSent = now;
                    populateContinueWatching();
                }
            }
            updateWatchButtonLabel();
        }
    }

    function seekVideo() {
        video.currentTime = progressBar.value;
    }

    function toggleFullscreen() {
        if (document.fullscreenElement) {
            document.exitFullscreen();
        } else if (modal.requestFullscreen) {
            modal.requestFullscreen();
        }
    }

    playPauseBtn.addEventListener('click', () => {
        togglePlay();
        updatePlayButton();
    });

    fullscreenBtn.addEventListener('click', toggleFullscreen);
    nextEpisodeBtn.addEventListener('click', async () => {
        if (!nextEpisodeInfo) return;
        const { baseId, slug, nextEp } = nextEpisodeInfo;
        try {
            const hlsLink = await fetchStreamingLinksDirect(baseId, nextEp.id);
            if (!hlsLink) return;
            const epCover = (nextEp.images && nextEp.images.length)
                ? `https://cdn.${mainUrl}/images/${nextEp.images[0].filename}`
                : currentFilmCover;
            const combinedId = `${baseId}-${nextEp.id}`;
            const baseTitle = currentSeriesTitle || currentFilmTitle;
            const epTitle = `${baseTitle} - S${nextEp.season}E${nextEp.episode} - ${nextEp.name}`;
            showPlayer(hlsLink, combinedId, slug, epTitle, epCover);
        } catch (err) {
            console.error('Errore nel recupero dei link', err);
        }
    });
    closeBtn.addEventListener('click', () => hidePlayer(true));

    modal.addEventListener('click', (e) => {
        if (isTouch) return;
        if (e.target === modal || e.target === video) {
            togglePlay();
            updatePlayButton();
        }
    });

    video.addEventListener('play', () => {
        updatePlayButton();
        showControls();
    });
    video.addEventListener('pause', () => {
        updatePlayButton();
        showControls();
    });
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    video.addEventListener('loadeddata', hideLoading);
    video.addEventListener('waiting', showLoading);
    video.addEventListener('playing', hideLoading);
    video.addEventListener('ended', () => {
        if (currentFilmId) {
            const userId = localStorage.getItem('userId');
            if (userId) {
                saveVideoProgress(userId, currentFilmId, 0, currentFilmSlug, currentFilmTitle, currentFilmCover, video.duration);
            } else {
                localStorage.removeItem('progress-' + currentFilmId);
                localStorage.removeItem('progress-meta-' + currentFilmId);
            }
            updateWatchButtonLabel();
            populateContinueWatching();
        }
    });
    progressBar.addEventListener('input', seekVideo);

    document.addEventListener('fullscreenchange', () => {
        updateFullscreenButton();
        if (isTouch && screen.orientation && screen.orientation.lock) {
            if (document.fullscreenElement === modal) {
                screen.orientation.lock('landscape').catch(() => { });
            } else if (screen.orientation.unlock) {
                try { screen.orientation.unlock(); } catch (_) { }
            }
        }
    });

    // Enable double-tap seeking on touch devices only
    if (isTouch) {
        let lastTap = 0;
        video.addEventListener('touchend', (e) => {
            const currentTime = Date.now();
            if (currentTime - lastTap < 300) {
                const tapX = e.changedTouches[0].clientX;
                const half = window.innerWidth / 2;
                if (tapX < half) {
                    video.currentTime = Math.max(video.currentTime - 10, 0);
                } else {
                    video.currentTime = Math.min(video.currentTime + 10, video.duration);
                }
                updateProgress();
            }
            lastTap = currentTime;
        });
    }

    if (isTouch) {
        video.addEventListener('touchstart', showControls);
        controls.addEventListener('touchstart', showControls);
        modal.addEventListener('touchstart', showControls);
    }

    document.addEventListener('keydown', (e) => {
        if (modal.classList.contains('hidden')) return;
        switch (e.key) {
            case ' ':
            case 'k':
                e.preventDefault();
                togglePlay();
                updatePlayButton();
                break;
            case 'ArrowRight':
                video.currentTime = Math.min(video.currentTime + 5, video.duration);
                break;
            case 'ArrowLeft':
                video.currentTime = Math.max(video.currentTime - 5, 0);
                break;
            case 'f':
                toggleFullscreen();
                break;
            case 'Escape':
                hidePlayer(true);
                break;
        }
    });

    window.showPlayer = showPlayer;
    window.hidePlayer = hidePlayer;
    window.updateWatchButtonLabel = updateWatchButtonLabel;

    async function updateWatchButtonLabel(id = currentFilmId || window.filmId) {
        const watchBtn = document.getElementById('watch-btn');
        if (!watchBtn || !id) return;
        const userId = localStorage.getItem('userId');
        let progress = 0;
        if (userId) {
            try {
                progress = await fetchVideoProgress(userId, id);
            } catch (_) {
                progress = 0;
            }
        } else {
            progress = parseFloat(localStorage.getItem('progress-' + id) || '0');
        }
        watchBtn.textContent = progress > 0 ? 'Riprendi' : 'Guarda';
    }
})();
