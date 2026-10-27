#!/usr/bin/env python3
"""Install built static assets as a local Nezha v2 user-dist override."""
import argparse
import datetime
import json
import os
from pathlib import Path
import shutil

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--dashboard-dir', type=Path, required=True, help='Nezha working directory (contains app and data)')
parser.add_argument('--dist', type=Path, default=Path('dist'), help='Built theme directory')
args = parser.parse_args()
root, source = args.dashboard_dir.resolve(), args.dist.resolve()
if not (root / 'data').is_dir() or not (source / 'index.html').is_file() or not (source / 'assets').is_dir():
    parser.error('Expected a Nezha data directory and a built dist with index.html and assets/.')
# Do not copy personal configuration out of the build source.
if any(p.is_symlink() for p in source.rglob('*')):
    parser.error('The dist directory must not contain symbolic links.')
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
release = root / 'pixel-deck-releases' / stamp
shutil.copytree(source, release, ignore=shutil.ignore_patterns('*.local.*', '*.private.*', '*.db', '*.key', '*.pem'))
target = root / 'user-dist'
# Keep site customization when updating an existing installation.
local_config = target / 'config.local.json'
if local_config.is_file():
    shutil.copy2(local_config, release / 'config.local.json')
previous = None
if target.is_symlink():
    previous = os.readlink(target)
elif target.exists():
    backup = root / 'pixel-deck-backups' / stamp / 'user-dist'
    backup.parent.mkdir(parents=True, exist_ok=True)
    target.rename(backup)
    previous = str(backup)
link = root / ('.pixel-deck-next-' + stamp)
link.symlink_to(release.relative_to(root), target_is_directory=True)
try:
    os.replace(link, target)
except Exception:
    if previous and not target.exists() and not target.is_symlink():
        target.symlink_to(previous, target_is_directory=True)
    raise
manifest = {'installed_at': stamp, 'previous_target': previous, 'release': str(release), 'target': str(target)}
manifest_dir = root / 'pixel-deck-backups' / stamp
manifest_dir.mkdir(parents=True, mode=0o700, exist_ok=True)
manifest_dir.chmod(0o700)
manifest_file = manifest_dir / 'install-manifest.private.json'
manifest_file.write_text(json.dumps(manifest, indent=2) + '\n')
manifest_file.chmod(0o600)
print(json.dumps({'ok': True, 'release': str(release), 'previous_target': previous}))
