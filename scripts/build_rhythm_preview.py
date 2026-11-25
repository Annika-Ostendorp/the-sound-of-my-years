#!/usr/bin/env python3
"""Private local Spotify -> aggregate rhythm preview. No raw rows are written.

Usage:
 python scripts/build_rhythm_preview.py '/private/path/Spotify Extended Streaming History-2.zip' rhythm_2026_preview.json

This PREVIEW deliberately uses only the documented partial exclusion rules. Compare
against the user's complete prior cleaning script before publishing derived data.
"""
import json
import sys
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone, date
from pathlib import Path
from zoneinfo import ZoneInfo

BERLIN = ZoneInfo('Europe/Berlin')
# Confirmed exclusions from the design diary (not the complete historical ruleset).
# These are exact artist labels, NOT fuzzy track-title matches.
EXCLUDED_ARTISTS = {
    'Die drei !!!', 'Hanni und Nanni', 'Erin Hunter', 'Bibi und Tina',
    'Fünf Freunde', 'Was Ist Was', 'Pettersson und Findus', 'Ponyhof Mühlental',
    'Elena – Ein Leben für die Pferde', 'Elena - Ein Leben für die Pferde',
    'CAVALLUNA', 'Johannes Lehniger', 'Die Eiskönigin', 'Barbie',
}
EXCLUDED_CASEFOLD = {s.casefold() for s in EXCLUDED_ARTISTS}
BEGIN = datetime(2026, 1, 1, tzinfo=BERLIN).astimezone(timezone.utc)
DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN']


def count_weekdays(first, last):
    counts = Counter()
    day = first
    while day <= last:
        counts[day.weekday()] += 1
        day += timedelta(days=1)
    return counts


def allocate_event(end_utc, millis, bins):
    """Distribute observed duration across hour boundaries, including midnight/DST."""
    start = max(BEGIN, end_utc - timedelta(milliseconds=millis))
    end = end_utc
    if end <= start:
        return
    cursor = start
    while cursor < end:
        next_utc = cursor.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1)
        segment_end = min(end, next_utc)
        local = cursor.astimezone(BERLIN)
        bins[(local.weekday(), local.hour)] += (segment_end - cursor).total_seconds() / 60.0
        cursor = segment_end


def main(source_zip, output):
    bins = defaultdict(float)
    counts = Counter()
    latest = None
    oldest = None
    with zipfile.ZipFile(source_zip) as archive:
        files = sorted(n for n in archive.namelist() if '/Streaming_History_Audio_' in n
                       and n.endswith('.json') and not n.startswith('__MACOSX/'))
        if len(files) != 26:
            raise ValueError(f'Expected 26 audio JSON files; found {len(files)}')
        for name in files:
            entries = json.loads(archive.read(name))
            for row in entries:
                counts['all_audio'] += 1
                timestamp = row.get('ts')
                if not timestamp:
                    counts['invalid_timestamp'] += 1
                    continue
                end = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                oldest = end if oldest is None else min(oldest, end)
                latest = end if latest is None else max(latest, end)
                artist = row.get('master_metadata_album_artist_name')
                track = row.get('master_metadata_track_name')
                ms = row.get('ms_played')
                if not artist or not track or not isinstance(ms, (int, float)) or ms <= 0:
                    counts['not_valid_music_track'] += 1
                    continue
                if artist.strip().casefold() in EXCLUDED_CASEFOLD:
                    counts['excluded_confirmed_spoken_word'] += 1
                    continue
                counts['included_all_years_preview'] += 1
                if end >= BEGIN and end.astimezone(BERLIN).year == 2026:
                    allocate_event(end, ms, bins)
                    counts['included_2026_preview'] += 1
    if latest is None:
        raise ValueError('No timestamped events found')
    end_date = latest.astimezone(BERLIN).date()
    days_per_weekday = count_weekdays(date(2026, 1, 1), end_date)
    total_calendar_days = sum(days_per_weekday.values())

    def entry(key, weekday=None):
        denom = total_calendar_days if weekday is None else days_per_weekday[weekday]
        hr = [round((sum(bins[(d, h)] for d in range(7)) if weekday is None else bins[(weekday, h)]) / denom, 3)
              for h in range(24)]
        total = sum(hr)
        return {'id': key, 'calendarDays': denom, 'hours': hr,
                'meanDailyMinutes': round(total, 2)}

    out = {
        'schemaVersion': 1,
        'status': 'REVIEW_REQUIRED',
        'title': 'The Rhythm of My Day',
        'period': '2026-01-01 to ' + end_date.isoformat(),
        'timezone': 'Europe/Berlin',
        'metric': 'Average recorded music listening minutes per calendar day, by local clock hour',
        'method': 'Positive-duration track records; partial plays included; durations distributed across hourly boundaries. Known spoken-word artist labels excluded; full legacy filter reconciliation pending.',
        'sourceNotes': 'Spotify Extended Streaming History; end timestamp used to reconstruct listening interval; incomplete year.',
        'validation': {
            'rawAudioRecords': counts['all_audio'],
            'includedMusicRecordsPreviewAllYears': counts['included_all_years_preview'],
            'diaryPreviousMusicRecords': 258635,
            'differenceFromDiary': counts['included_all_years_preview'] - 258635,
            'included2026RecordsPreview': counts['included_2026_preview']
        },
        'profiles': [entry('ALL')] + [entry(name, idx) for idx, name in enumerate(DAYS)]
    }
    Path(output).parent.mkdir(parents=True, exist_ok=True)
    Path(output).write_text(json.dumps(out, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('Input audio rows:', counts['all_audio'])
    print('New aggregate status:', out['status'])
    print('Preview included all years:', counts['included_all_years_preview'])
    print('Diary benchmark:', 258635)
    print('Difference (must reconcile):', out['validation']['differenceFromDiary'])
    print('2026 preview records:', counts['included_2026_preview'])
    print('Period:', out['period'])
    print('Only 8 x 24 numeric aggregates saved. NO raw listening events, artist names, tracks, IPs or devices saved.')
    print('Wrote:', output)

if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('Usage: python build_rhythm_preview.py INPUT_SPOTIFY.zip OUTPUT.json')
    main(sys.argv[1], sys.argv[2])
