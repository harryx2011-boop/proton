r"""Default folders: the state dir, the skill catalog and the off flag. Run: .venv\Scripts\python.exe tests\test_paths.py"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "src"))
from proton import paths  # noqa: E402

home = Path("H")

# Windows: under LOCALAPPDATA; elsewhere: under the home folder
assert paths.state_dir({"LOCALAPPDATA": "L"}, home) == Path("L") / "Proton" / "state"
assert paths.state_dir({}, home) == home / ".proton" / "state"
# PROTON_STATE_DIR wins; an empty value counts as unset
assert paths.state_dir({"PROTON_STATE_DIR": "S", "LOCALAPPDATA": "L"}, home) == Path("S")
assert paths.state_dir({"PROTON_STATE_DIR": "", "LOCALAPPDATA": "L"}, home) == Path("L") / "Proton" / "state"
# the catalog lives in the state dir unless PROTON_SKILL_CATALOG says otherwise
assert paths.skill_catalog({"PROTON_STATE_DIR": "S"}, home) == Path("S") / "skill-catalog.json"
assert paths.skill_catalog({"PROTON_STATE_DIR": "S", "PROTON_SKILL_CATALOG": "C.json"}, home) == Path("C.json")
# the off flag is a file named "off" in the state dir
assert paths.off_flag({"PROTON_STATE_DIR": "S"}, home) == Path("S") / "off"
print("PASS")
