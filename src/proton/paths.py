r"""Where Proton keeps its files: the state dir, the skill catalog and the off flag.

State dir: PROTON_STATE_DIR, else %LOCALAPPDATA%\Proton\state, else ~/.proton/state.
"""
import os
from pathlib import Path


def state_dir(env=os.environ, home=None):
    if env.get("PROTON_STATE_DIR"):
        return Path(env["PROTON_STATE_DIR"])
    if env.get("LOCALAPPDATA"):
        return Path(env["LOCALAPPDATA"]) / "Proton" / "state"
    return (home or Path.home()) / ".proton" / "state"


def skill_catalog(env=os.environ, home=None):
    return Path(env.get("PROTON_SKILL_CATALOG") or state_dir(env, home) / "skill-catalog.json")


def off_flag(env=os.environ, home=None):
    """A file named off in the state dir: while it exists Proton stays off."""
    return state_dir(env, home) / "off"
