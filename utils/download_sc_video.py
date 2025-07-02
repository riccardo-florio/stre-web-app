import yt_dlp
import threading
import queue


def download_sc_video(watch_url, output_path="downloads/%(title)s.%(ext)s"):
    """
    Scarica un video da StreamingCommunity usando yt-dlp con il plugin installato.
    
    Args:
        watch_url (str): L'URL del tipo https://.../it/watch/<id>?e=<episode_id>
        output_path (str): Percorso output. Può usare i template yt-dlp.
    """
    ydl_opts = {
        'outtmpl': output_path,
        'format': 'best',
        'quiet': False,
        'noplaylist': True,
        'merge_output_format': 'mp4',
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([watch_url])


def download_sc_video_progress(watch_url, output_path="downloads/%(title)s.%(ext)s"):
    """Generator that yields download progress percentages."""
    q = queue.Queue()

    def hook(d):
        if d.get('status') == 'downloading':
            q.put(d.get('_percent_str', '0%'))
        elif d.get('status') == 'finished':
            q.put('done')

    ydl_opts = {
        'outtmpl': output_path,
        'format': 'best',
        'quiet': True,
        'noplaylist': True,
        'merge_output_format': 'mp4',
        'progress_hooks': [hook],
    }

    def run():
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([watch_url])

    threading.Thread(target=run, daemon=True).start()

    while True:
        progress = q.get()
        yield progress
        if progress == 'done':
            break
