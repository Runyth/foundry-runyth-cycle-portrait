#!/usr/bin/env python3
"""Create deterministic install, source, and documentation ZIPs from this checkout."""
from __future__ import annotations

from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile, ZipInfo

ROOT = Path(__file__).resolve().parent.parent
OUTPUT = ROOT.parent.parent
VERSION = '0.1.2'
PREFIX = 'runyth-cycle-portrait'
INSTALL = ['module.json', 'LICENSE', 'LICENSE-NOTICE', 'README.md']
INSTALL_DIRS = ['scripts', 'styles', 'lang', 'assets']
DOCS = ['README.md', 'CHANGELOG.md', 'LICENSE', 'LICENSE-NOTICE']


def archive(kind: str, files: list[Path]) -> Path:
  target = OUTPUT / f'{PREFIX}-{VERSION}-{kind}.zip'
  with ZipFile(target, 'w', ZIP_DEFLATED, compresslevel=9) as handle:
    for item in files:
      relative = item.relative_to(ROOT).as_posix()
      info = ZipInfo(f'{PREFIX}/{relative}', date_time=(2026, 11, 1, 0, 0, 0))
      info.compress_type = ZIP_DEFLATED
      info.external_attr = 0o100644 << 16
      handle.writestr(info, item.read_bytes(), compress_type=ZIP_DEFLATED, compresslevel=9)
  return target


def paths(names: list[str]) -> list[Path]:
  output = []
  for name in names:
    item = ROOT / name
    output.extend(path for path in item.rglob('*') if path.is_file()) if item.is_dir() else output.append(item)
  return sorted(set(output))


def main() -> None:
  install = paths(INSTALL + INSTALL_DIRS)
  docs = paths(DOCS + ['docs'])
  source = sorted(path for path in ROOT.rglob('*') if path.is_file()
                  and not any(part in ('__pycache__', 'node_modules') for part in path.parts))
  for kind, files in [('module', install), ('source', source), ('documentation', docs)]:
    print(archive(kind, files))


if __name__ == '__main__':
  main()
