import subprocess
import sys
from pathlib import Path


def run(cmd):
    """Run a command in the project root."""
    subprocess.check_call(cmd, cwd=ROOT)


ROOT = Path(__file__).resolve().parent


def main():
    # Check if repository is already up to date
    status = subprocess.run(
        ["git", "status", "-uno"], cwd=ROOT, capture_output=True, text=True
    )
    if "up to date" in status.stdout.lower():
        print("Repository already up to date")
        return

    # Pull latest changes
    run(["git", "pull", "origin", "main"])

    # Reinstall requirements
    run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])

    # Restart the application
    subprocess.run(["pkill", "-f", "backend/app.py"], cwd=ROOT)
    subprocess.Popen([sys.executable, "backend/app.py"], cwd=ROOT)


if __name__ == "__main__":
    main()
