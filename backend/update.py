import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent

def main():
    subprocess.run(["git", "pull"], cwd=ROOT_DIR, check=True)
    subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], cwd=ROOT_DIR, check=True)
    subprocess.run(["pkill", "-f", "app.py"], check=False)
    subprocess.Popen([sys.executable, "app.py"], cwd=ROOT_DIR / "backend")

if __name__ == "__main__":
    main()
