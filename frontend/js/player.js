(function () {
    const modal = document.getElementById('player-modal');
    const video = document.getElementById('video-player');
    const playPauseBtn = document.getElementById('play-pause');
    const progressBar = document.getElementById('player-progress');
    const fullscreenBtn = document.getElementById('fullscreen-btn');
    const closeBtn = document.getElementById('close-player');
    let hlsInstance = null;

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
    }

    function hidePlayer() {
        modal.classList.add('hidden');
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
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
        playPauseBtn.textContent = video.paused ? 'Play' : 'Pause';
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

    video.addEventListener('play', updatePlayButton);
    video.addEventListener('pause', updatePlayButton);
    video.addEventListener('timeupdate', updateProgress);
    video.addEventListener('loadedmetadata', updateProgress);
    progressBar.addEventListener('input', seekVideo);

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
