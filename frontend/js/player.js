(function () {
    const modal = document.getElementById('player-modal');
    const video = document.getElementById('video-player');
    const playPauseBtn = document.getElementById('play-pause');
    const progressBar = document.getElementById('player-progress');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const closeBtn = document.getElementById('close-player');
    const controls = document.getElementById('player-controls');
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let hideControlsTimeout = null;
    let hlsInstance = null;

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

    function showPlayer(src) {
        modal.classList.remove('hidden');

        if (Hls.isSupported()) {
            hlsInstance = new Hls();
            hlsInstance.loadSource(src);
            hlsInstance.attachMedia(video);
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
        }

        video.play();
        if (modal.requestFullscreen) {
            modal.requestFullscreen();
        }
        showControls();
    }

    function hidePlayer() {
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

    function updateProgress() {
        progressBar.max = video.duration || 0;
        progressBar.value = video.currentTime;
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
    closeBtn.addEventListener('click', hidePlayer);

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
                hidePlayer();
                break;
        }
    });

    window.showPlayer = showPlayer;
    window.hidePlayer = hidePlayer;
})();
