// Where Proton keeps its files; the same rules as src/proton/paths.py.
import { homedir } from 'node:os';
import { join } from 'node:path';

type Env = Record<string, string | undefined>;

/** PROTON_STATE_DIR, else %LOCALAPPDATA%\Proton\state, else ~/.proton/state. */
export const stateDir = (env: Env = process.env, home = homedir()) =>
  env.PROTON_STATE_DIR || (env.LOCALAPPDATA ? join(env.LOCALAPPDATA, 'Proton', 'state') : join(home, '.proton', 'state'));

export const skillCatalog = (env: Env = process.env, home = homedir()) =>
  env.PROTON_SKILL_CATALOG || join(stateDir(env, home), 'skill-catalog.json');

/** A file named off in the state dir: while it exists Proton stays off. */
export const offFlag = (env: Env = process.env, home = homedir()) => join(stateDir(env, home), 'off');
