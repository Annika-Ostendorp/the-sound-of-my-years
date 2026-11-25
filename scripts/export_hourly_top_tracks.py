#!/usr/bin/env python3
"""
Erzeugt src/lib/data/hourly_top_tracks.json aus der Spotify Extended Streaming History.

Aufruf:
  python3 scripts/export_hourly_top_tracks.py <ordner_mit_Streaming_History_Audio_*.json> [--year 2026] [--out ausgabe.json]

Standard: --year 2026 (passend zu rhythm_2026_preview.json). Mit --year all werden alle Jahre gezählt.

Pro Profil (ALL, MON..SUN) und Stunde 0-23 wird der Titel mit den meisten gehörten Minuten gewählt.
Zeitzone Europe/Berlin; ms_played wird wie im Rhythm-Export auf Stundengrenzen verteilt.
Partial plays zählen mit (wie im Rhythm-Datensatz); Podcasts/Hörbücher ohne Track-Namen werden übersprungen.
Zusätzlich "_day": { "ALL": {track, artist, uri, minutes, plays}, "MON": ... } = Top-Song des ganzen Tages je Profil.
NEU: pro Stunde zusätzlich "artists": die Top-3-Künstler (Minuten) mit ihrem meistgehörten Titel ("track", "uri").
Hörspiele & Co. ausschliessen (Spotify führt sie als normale Tracks, sie lassen sich nicht automatisch erkennen):
  --report            zeigt die 40 Künstler mit den meisten Minuten (danach entscheiden, was raus soll)
  --exclude "Die drei ???,TKKG"   schliesst Künstler/Alben aus, deren Name einen dieser Begriffe enthält (Gross/Klein egal)
KÜNSTLERBILDER ("image" bei jedem Künstler): die Bilder, die Spotify auf der Künstlerseite zeigt.
  Variante A (offiziell, empfohlen): Spotify-Developer-App anlegen (developer.spotify.com/dashboard), dann im Terminal
     export SPOTIFY_CLIENT_ID="..."   und   export SPOTIFY_CLIENT_SECRET="..."
  Variante B (ohne Zugang): läuft automatisch, wenn keine Schlüssel gesetzt sind (liest die öffentlichen Spotify-Seiten).
  --images off   schaltet die Bildsuche aus.  Ergebnisse werden in scripts/.artist_images_cache.json gemerkt.
Ausgabe: { "ALL": [ {hour, track, artist, uri, minutes, plays}, ... 24 Einträge ], "MON": [...], ... }
"""
import json, sys, glob, os, re, time, base64, ssl, urllib.request, urllib.parse, urllib.error
from collections import defaultdict
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

TZ = ZoneInfo("Europe/Berlin")
DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]

CERT_HELP = ("\nZertifikat-Problem (typisch für Python vom python.org-Installer auf dem Mac). Lösung, im Terminal:\n"
             "  /Applications/Python\\ 3.13/Install\\ Certificates.command\n"
             "danach den Befehl wiederholen. (Alternativ: pip3 install certifi)")

def ssl_context():
    """Mac-Python hat oft keine Zertifikate. certifi (falls vorhanden) behebt das, die Prüfung bleibt immer an."""
    try:
        import certifi
        return ssl.create_default_context(cafile=certifi.where())
    except ImportError:
        return ssl.create_default_context()

def http_get(url, headers=None, data=None):
    req = urllib.request.Request(url, headers=headers or {"User-Agent": "Mozilla/5.0"}, data=data)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=20, context=ssl_context()) as r:
                return r.read().decode("utf-8", "replace")
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(int(e.headers.get("Retry-After", "2")) + 1); continue
            raise
    raise RuntimeError("zu viele Anfragen")

def pick_image(images, want=320):
    imgs = [i for i in images or [] if i.get("url")]
    if not imgs: return None
    ok = [i for i in imgs if (i.get("width") or 0) >= want]
    return (min(ok, key=lambda i: i["width"]) if ok else max(imgs, key=lambda i: i.get("width") or 0))["url"]

def image_via_api(token, name, uri):
    tid = uri.split(":")[-1]
    h = {"Authorization": "Bearer " + token}
    tr = json.loads(http_get("https://api.spotify.com/v1/tracks/" + tid, h))
    arts = tr.get("artists") or []
    a = next((x for x in arts if x.get("name", "").lower() == name.lower()), arts[0] if arts else None)
    if not a: return None
    ar = json.loads(http_get("https://api.spotify.com/v1/artists/" + a["id"], h))
    return pick_image(ar.get("images"))

def image_via_public(name, uri):
    html = http_get("https://open.spotify.com/track/" + uri.split(":")[-1])
    m = re.search(r'music:musician"\s+content="https://open\.spotify\.com/artist/([A-Za-z0-9]+)"', html)
    if not m: return None
    o = json.loads(http_get("https://open.spotify.com/oembed?url=" + urllib.parse.quote("https://open.spotify.com/artist/" + m.group(1), safe="")))
    return o.get("thumbnail_url")

def add_images(result, mode):
    cache_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".artist_images_cache.json")
    cache = json.load(open(cache_path, encoding="utf-8")) if os.path.exists(cache_path) else {}
    cid, sec = os.environ.get("SPOTIFY_CLIENT_ID"), os.environ.get("SPOTIFY_CLIENT_SECRET")
    token = None
    if mode in ("auto", "api") and cid and sec:
        auth = base64.b64encode(f"{cid}:{sec}".encode()).decode()
        try:
            tok = http_get("https://accounts.spotify.com/api/token", {"Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded"}, b"grant_type=client_credentials")
        except urllib.error.HTTPError as e:
            sys.exit(f"Spotify hat die Schlüssel abgelehnt (HTTP {e.code}). Client ID/Secret prüfen.")
        except Exception as e:
            sys.exit(("Keine Verbindung zu Spotify: %s" % e) + (CERT_HELP if "CERTIFICATE_VERIFY_FAILED" in str(e) else ""))
        token = json.loads(tok)["access_token"]
    print("Künstlerbilder:", "offizielle API" if token else "öffentliche Seiten (Variante B)")
    reps = {}
    for prof in result:
        if prof.startswith("_"): continue
        for row in result[prof]:
            for a in row.get("artists", []): reps.setdefault(a["artist"], a["uri"])
    missing = 0
    for i, (name, uri) in enumerate(sorted(reps.items()), 1):
        if not cache.get(name):  # fehlgeschlagene Versuche werden beim nächsten Lauf wiederholt
            try: cache[name] = image_via_api(token, name, uri) if token else image_via_public(name, uri)
            except Exception as e:
                print("  kein Bild für", name, "-", e); cache[name] = None
                if "CERTIFICATE_VERIFY_FAILED" in str(e):
                    sys.exit(CERT_HELP)
            time.sleep(0.15)
            if i % 20 == 0: json.dump(cache, open(cache_path, "w", encoding="utf-8"), ensure_ascii=False)
        if not cache[name]: missing += 1
    json.dump(cache, open(cache_path, "w", encoding="utf-8"), ensure_ascii=False)
    for prof in result:
        if prof.startswith("_"): continue
        for row in result[prof]:
            for a in row.get("artists", []): a["image"] = cache.get(a["artist"])
    print(f"{len(reps) - missing} von {len(reps)} Künstlern mit Bild")

def main(folder, out, year, exclude=(), report=False, images="auto"):
    files = sorted(glob.glob(os.path.join(folder, "*Streaming_History_Audio*.json")))
    # key: (profil, stunde) -> {(track, artist): [minuten, plays]}
    agg = defaultdict(lambda: defaultdict(lambda: [0.0, 0]))
    day_total = defaultdict(lambda: defaultdict(lambda: [0.0, 0]))  # Profil -> Track -> [Minuten, Plays] über alle Stunden
    art_agg = defaultdict(lambda: defaultdict(lambda: [0.0, defaultdict(float)]))  # (prof,h) -> artist -> [min, {(track,uri): min}]
    art_total = defaultdict(float)
    ex = [e.strip().lower() for e in exclude if e.strip()]
    for f in files:
        for r in json.load(open(f, encoding="utf-8")):
            track, artist = r.get("master_metadata_track_name"), r.get("master_metadata_album_artist_name")
            uri = r.get("spotify_track_uri")  # z. B. "spotify:track:4uLU6hMCjMI75M1A2tKUQC"
            ms = r.get("ms_played") or 0
            if not track or ms <= 0: continue
            album = r.get("master_metadata_album_album_name") or ""
            if ex and any(e in (artist or "").lower() or e in album.lower() or e in track.lower() for e in ex): continue
            end = datetime.fromisoformat(r["ts"].replace("Z", "+00:00")).astimezone(TZ)
            if year and end.year != year: continue
            start, first = end - timedelta(milliseconds=ms), True
            cur = start
            while cur < end:
                nxt = min(end, cur.replace(minute=0, second=0, microsecond=0) + timedelta(hours=1))
                minutes = (nxt - cur).total_seconds() / 60
                for prof in ("ALL", DAYS[cur.weekday()]):
                    cell = agg[(prof, cur.hour)][(track, artist, uri)]
                    cell[0] += minutes
                    ac = art_agg[(prof, cur.hour)][artist]
                    ac[0] += minutes; ac[1][(track, uri)] += minutes
                    dcell = day_total[prof][(track, artist, uri)]
                    dcell[0] += minutes
                    if first: cell[1] += 1; dcell[1] += 1
                art_total[artist] += minutes if first else 0
                first = False
                cur = nxt
    result = {}
    for prof in ["ALL"] + DAYS:
        rows = []
        for h in range(24):
            cell = agg.get((prof, h))
            if not cell:
                rows.append({"hour": h, "track": None, "artist": None, "uri": None, "minutes": 0, "plays": 0}); continue
            (track, artist, uri), (minutes, plays) = max(cell.items(), key=lambda kv: kv[1][0])
            arts = []
            for a, (am, tr) in sorted(art_agg[(prof, h)].items(), key=lambda kv: -kv[1][0])[:3]:
                (tt, tu), _ = max(tr.items(), key=lambda kv: kv[1])
                arts.append({"artist": a, "minutes": round(am, 1), "track": tt, "uri": tu})
            rows.append({"hour": h, "track": track, "artist": artist, "uri": uri, "minutes": round(minutes, 1), "plays": plays, "artists": arts})
        result[prof] = rows
    # Gesamt-Top-Song je Profil (für den Button "Play my top song"): meistgehörter Titel über den ganzen Tag
    result["_day"] = {}
    for prof in ["ALL"] + DAYS:
        cells = day_total.get(prof)
        if not cells:
            result["_day"][prof] = None; continue
        (track, artist, uri), (minutes, plays) = max(cells.items(), key=lambda kv: kv[1][0])
        result["_day"][prof] = {"track": track, "artist": artist, "uri": uri, "minutes": round(minutes, 1), "plays": plays}
    if images != "off": add_images(result, images)
    if report:
        tot = defaultdict(float)
        for (prof, h), d in art_agg.items():
            if prof == "ALL":
                for a, (am, _) in d.items(): tot[a] += am
        print("Top-Künstler 2026 nach Minuten (bitte Hörspiele etc. für --exclude notieren):")
        for a, m in sorted(tot.items(), key=lambda kv: -kv[1])[:40]: print(f"{m:9.0f} min  {a}")
    json.dump(result, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(files)} Dateien -> {out}")

if __name__ == "__main__":
    args = sys.argv[1:]
    if not args: sys.exit(__doc__)
    def opt(name, default):
        if name in args:
            i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
        return default
    report = "--report" in args
    if report: args.remove("--report")
    exclude = opt("--exclude", "").split(",")
    images = opt("--images", "auto")
    year_arg = opt("--year", "2026")
    out = opt("--out", "src/lib/data/hourly_top_tracks.json")
    main(args[0], out, None if year_arg == "all" else int(year_arg), exclude, report, images)
