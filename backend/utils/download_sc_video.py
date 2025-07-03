import yt_dlp

def download_hook(d):
    if d['status'] == 'downloading':
        total = d.get('total_bytes') or d.get('total_bytes_estimate')
        downloaded = d.get('downloaded_bytes', 0)

        if total:
            percent = downloaded / total * 100
            print(f"\r📥 Download: {percent:.2f}%", end="")

    elif d['status'] == 'finished':
        print('\n✅ Download completato.')

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
        'quiet': True,  # silenzia log di yt_dlp
        'noplaylist': True,
        'merge_output_format': 'mp4',
        'progress_hooks': [download_hook],
    }

    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([watch_url])
