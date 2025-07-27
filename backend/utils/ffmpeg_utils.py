import subprocess
import platform


def is_ffmpeg_installed() -> bool:
    """Check if ffmpeg command is available."""
    try:
        subprocess.run([
            "ffmpeg",
            "-version",
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
        return True
    except (OSError, subprocess.CalledProcessError):
        return False


def install_ffmpeg() -> bool:
    """Attempt to install ffmpeg using the system package manager."""
    system = platform.system()
    try:
        if system == "Linux":
            subprocess.run(["apt-get", "update", "-y"], check=True)
            subprocess.run(["apt-get", "install", "-y", "ffmpeg"], check=True)
            return True
        if system == "Darwin":
            subprocess.run(["brew", "install", "ffmpeg"], check=True)
            return True
    except Exception as exc:
        print(f"[ERROR] Errore durante l'installazione di ffmpeg: {exc}")
        return False

    print(f"[WARN] Installazione automatica non supportata su {system}")
    return False


def ensure_ffmpeg() -> bool:
    """Ensure that ffmpeg is installed. Install it if missing."""
    if is_ffmpeg_installed():
        return True

    print("[INFO] ffmpeg non trovato. Provo a installarlo...")
    return install_ffmpeg()
