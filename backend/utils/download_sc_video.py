import yt_dlp


def download_sc_video(watch_url, socketio=None, output_path="downloads/%(title)s.%(ext)s"):
    def download_hook(d):
        if d['status'] == 'downloading':
            total = d.get('total_bytes') or d.get('total_bytes_estimate')
            downloaded = d.get('downloaded_bytes', 0)
            if total:
                percent = downloaded / total * 100
                print(f"\r📥 Download: {percent:.2f}%", end="")
                if socketio:
                    socketio.emit('download_progress', {
                        'percent': round(percent, 2)
                    }, broadcast=True)

        elif d['status'] == 'finished':
            print('\n✅ Download completato.')
            if socketio:
                socketio.emit('download_finished', {'status': 'done'}, broadcast=True)

    ydl_opts = {
        'outtmpl': output_path,
        'format': 'best',
        'quiet': True,
        'noplaylist': True,
        'merge_output_format': 'mp4',
        'progress_hooks': [download_hook],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([watch_url])
