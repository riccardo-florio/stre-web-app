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
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let hideControlsTimeout = null;
    let hlsInstance = null;
    let currentFilmId = null;
    let resumeTime = 0;

    function hideControls() {
        controls.classList.add('opacity-0', 'pointer-events-none');
        closeBtn.classList.add('opacity-0', 'pointer-events-none');
    }

    function showControls() {
        controls.classList.remove('opacity-0', 'pointer-events-none');
        closeBtn.classList.remove('opacity-0', 'pointer-events-none');
        if (!isTouch || video.paused) return;
        clearTimeout(hideControlsTimeout);
        hideControlsTimeout = setTimeout(hideControls, 3000);
    }

    function showLoading() {
        loading.classList.remove('hidden');
    }

    function hideLoading() {
        loading.classList.add('hidden');
    }

    function showPlayer(src, filmId) {
        modal.classList.remove('hidden');
        history.pushState({ ...(history.state || {}), player: true }, '', location.href);
        currentFilmId = filmId;
        resumeTime = parseFloat(localStorage.getItem('progress-' + filmId)) || 0;
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
        currentFilmId = null;
        resumeTime = 0;
        hideLoading();
        if (popState && history.state && history.state.player) {
            history.back();
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
            localStorage.setItem('progress-' + currentFilmId, video.currentTime);
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
            localStorage.removeItem('progress-' + currentFilmId);
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
})();
