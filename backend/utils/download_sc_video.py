from yt_dlp import YoutubeDL
from functools import partial
from queue import Queue

def download_hook(queue, d):
    queue.put(d)

def download_sc_video(url, queue, output_path = "downloads/%(title)s/%(title)s.%(ext)s"):
    hook = partial(download_hook, queue)

    ydl_opts = {
        'outtmpl': output_path,
        'format': 'best',
        'quiet': True,
        'noplaylist': True,
        'merge_output_format': 'mp4',
        'progress_hooks': [hook],
    }

    with YoutubeDL(ydl_opts) as ydl:
        ydl.download([url])
