#!/usr/bin/env python3
"""Validate released derived datasets; never needs Spotify raw streaming history.

Usage:
  python3 -m pip install jsonschema referencing
  python3 scripts/validate_public_data.py public/data
  python3 scripts/validate_public_data.py examples/data --draft

Public mode (default): rejects any JSON marked pending or any unapproved media.
"""
import argparse
import json
import sys
from pathlib import Path
from jsonschema import Draft202012Validator, FormatChecker
from referencing import Registry, Resource

SCHEMA_BASE = 'https://tsmy.local/schemas/'
SUPPORTED = {
 'manifest', 'capsule', 'rhythm', 'gravity', 'eras', 'returning',
 'raye', 'sessions', 'reveal', 'memories', 'media', 'timeline'
}

def build_registry(schema_root):
    registry = Registry()
    for schema_path in schema_root.glob('*.schema.json'):
        schema = json.loads(schema_path.read_text(encoding='utf-8'))
        registry = registry.with_resource(schema['$id'], Resource.from_contents(schema))
    return registry

def validate_directory(folder, schemas, draft=False):
    registry = build_registry(schemas)
    failures = 0
    checked = 0
    for file in sorted(folder.glob('*.json')):
        name = file.stem.split('.')[0]
        if name not in SUPPORTED:
            print(f'SKIP {file.name}: no matching TSMY schema')
            continue
        schema = json.loads((schemas / f'{name}.schema.json').read_text(encoding='utf-8'))
        data = json.loads(file.read_text(encoding='utf-8'))
        validator = Draft202012Validator(schema, registry=registry, format_checker=FormatChecker())
        issues = sorted(validator.iter_errors(data), key=lambda e: '/'.join(map(str, e.path)))
        if not draft and name != 'manifest':
            status = data.get('provenance', {}).get('privacyReview')
            if status != 'approved':
                issues.append(ValueError('privacyReview must be approved before copying to public/data'))
        for error in issues:
            path = '/'.join(str(x) for x in getattr(error, 'path', []))
            print(f'ERROR {file.name}:{path}: {error.message if hasattr(error, "message") else error}')
        if not issues:
            print(f'OK {file.name}')
        failures += len(issues)
        checked += 1
    if checked == 0:
        print('ERROR: no recognised JSON files found; nothing was validated')
        failures += 1
    print(f'Checked {checked} files, {failures} problem(s)')
    return 1 if failures else 0

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('data_dir', type=Path)
    parser.add_argument('--draft', action='store_true', help='Validate structure of private/draft files without publication approval')
    args = parser.parse_args()
    schemas = Path(__file__).resolve().parents[1] / 'schemas'
    sys.exit(validate_directory(args.data_dir, schemas, args.draft))
