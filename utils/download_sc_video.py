import yt_dlp


def download_sc_video(watch_url, output_path="downloads/%(title)s.%(ext)s", progress_callback=None):
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
    if progress_callback:
        ydl_opts['progress_hooks'] = [progress_callback]

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([watch_url])
