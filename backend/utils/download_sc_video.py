from yt_dlp import YoutubeDL
from functools import partial
from queue import Queue
import threading

from utils.ffmpeg_utils import ensure_ffmpeg

def download_hook(queue, cancel_event, d):
    # Se l'annullamento è stato richiesto, interrompi con un'eccezione
    if cancel_event.is_set():
        raise Exception("Download annullato")

    queue.put(d)

def download_sc_video(url, queue, cancel_event: threading.Event, output_path="downloads/%(title)s/%(title)s.%(ext)s"):
    if not ensure_ffmpeg():
        queue.put({
            'status': 'error',
            'message': 'ffmpeg non disponibile'
        })
        return

    hook = partial(download_hook, queue, cancel_event)

    ydl_opts = {
        'outtmpl': output_path,
        # 'format': 'best',  # Puoi scommentare se vuoi forzare il formato migliore
        'quiet': True,
        'noplaylist': True,
        'merge_output_format': 'mp4',
        'progress_hooks': [hook],
        'nocheckcertificate': True,
    }

    with YoutubeDL(ydl_opts) as ydl:
        try:
            ydl.download([url])
        except Exception as e:
            print(f"[YT-DLP] Download interrotto: {e}")
            queue.put({'status': 'cancelled'})  # 👈 utile per inviare info al socket
