"""Who the server is: `--role <name>` on the command line and the pid in PROTON_STATE_DIR/pid.

Dev servers must set PROTON_STATE_DIR so they do not overwrite the live server's pid file.
"""
import atexit
import logging
import os

from . import paths

STATE_DIR = paths.state_dir()
log = logging.getLogger("proton")


def announce(role):
    """Log the identity and write the pid file; the file is removed when the process ends."""
    log.setLevel(logging.INFO)  # mcp installs the root handler on import; basicConfig would be a no-op
    if not logging.getLogger().handlers:
        logging.basicConfig(format="%(asctime)s %(name)s %(message)s")
    STATE_DIR.mkdir(parents=True, exist_ok=True)
    pid_file = STATE_DIR / "pid"
    pid_file.write_text(str(os.getpid()), encoding="utf-8")
    log.info("proton %s server pid %d", role, os.getpid())

    def clean():
        try:
            if pid_file.read_text(encoding="utf-8").strip() == str(os.getpid()):
                pid_file.unlink()
        except OSError:
            pass

    atexit.register(clean)
