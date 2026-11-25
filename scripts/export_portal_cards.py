#!/usr/bin/env python3
"""
Erzeugt src/lib/data/portal_data.json (echte Daten fürs Portal) aus der Spotify Extended Streaming History.

Aufruf:
  python3 scripts/export_portal_cards.py '<ordner_mit_Streaming_History_Audio_*.json>' [--images auto|api|public|off]
         [--skip-artists "Die drei,TKKG"] [--out pfad.json]

Was berechnet wird (alles Europe/Berlin, nur Tracks mit Namen):
  first        erster Stream im Archiv
  song2022     meistgehörter Song eines Jahres (Minuten)
  raye         erster RAYE-Stream, Stunden pro Jahr, Top-5-Songs (je Album ein Cover) + Künstlerbild
  habit        2020: Stunden gesamt, lauteste Stunde, 24 Stundenwerte (für den Ring)
  comebacks    Songs, die >= 2,5 Jahre nicht liefen und ab 2024 wieder >= 5 Mal gehört wurden
  quotes.*     Daten für die vier Hypothesen-Karten im Portal

Bilder (Cover + Künstlerbild): wie in export_hourly_top_tracks.py (SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET gesetzt = API,
sonst öffentliche oEmbed-Seiten). Ergebnisse stehen in scripts/.portal_images_cache.json; fehlende Bilder werden beim
nächsten Lauf erneut versucht. Ohne Bild zeigt die Seite einen Farbverlauf mit Initialen.
"""
import json, sys, glob, os, re, base64, urllib.parse, importlib.util
from collections import defaultdict, Counter
from datetime import datetime
from zoneinfo import ZoneInfo

HERE = os.path.dirname(os.path.abspath(__file__))
TZ = ZoneInfo("Europe/Berlin")
sp = importlib.util.spec_from_file_location("hourly", os.path.join(HERE, "export_hourly_top_tracks.py"))
hourly = importlib.util.module_from_spec(sp); sp.loader.exec_module(hourly)   # nutzt http_get, pick_image, ssl_context

DEFAULT_SKIP = ["die drei", "hanni und nanni", "tkkg", "benjamin", "bibi", "was ist was", "julien bam", "pumuckl", "folge"]

def load(folder):
    rows = []
    for f in sorted(glob.glob(os.path.join(folder, "Streaming_History_Audio_*.json"))):
        for r in json.load(open(f, encoding="utf-8")):
            if not r.get("master_metadata_track_name") or not r.get("spotify_track_uri"): continue
            t = datetime.fromisoformat(r["ts"].replace("Z", "+00:00")).astimezone(TZ)
            rows.append(dict(t=t, track=r["master_metadata_track_name"], artist=r["master_metadata_album_artist_name"] or "",
                             album=r["master_metadata_album_album_name"] or "", uri=r["spotify_track_uri"], ms=r["ms_played"] or 0))
    rows.sort(key=lambda r: r["t"]); return rows

def song_ref(r): return {"track": r["track"], "artist": r["artist"], "album": r["album"], "uri": r["uri"], "cover": None}

def build(rows, skip):
    bad = lambda a: any(s in a.lower() for s in skip)
    music = [r for r in rows if not bad(r["artist"])]
    out = {}
    f = rows[0]
    out["first"] = {**song_ref(f), "date": f["t"].strftime("%Y-%m-%d")}

    def top_song(year):
        c = Counter()
        ref = {}
        for r in music:
            if r["t"].year == year:
                k = (r["track"], r["artist"]); c[k] += r["ms"] / 60000; ref.setdefault(k, r)
        k, m = c.most_common(1)[0]
        return {**song_ref(ref[k]), "minutes": round(m)}
    out["song2022"] = {**top_song(2022), "year": 2022}

    ra = [r for r in rows if r["artist"].lower() == "raye"]
    hrs = Counter()
    for r in ra: hrs[r["t"].year] += r["ms"] / 3600000
    byt = defaultdict(float); ref = {}
    for r in ra:
        k = (r["track"], r["album"]); byt[k] += r["ms"] / 60000; ref.setdefault(k, r)
    seen_alb, tops = set(), []
    for k, m in sorted(byt.items(), key=lambda kv: -kv[1]):
        if k[1] in seen_alb: continue
        seen_alb.add(k[1]); tops.append({**song_ref(ref[k]), "minutes": round(m)})
        if len(tops) == 5: break
    jan = [r for r in ra if r["t"].year == 2026 and r["t"].month == 1]
    out["raye"] = {"artist": "RAYE", "image": None, "uri": ra[0]["uri"],
                   "first": {**song_ref(ra[0]), "date": ra[0]["t"].strftime("%Y-%m-%d")},
                   "hours": {str(y): round(h) for y, h in sorted(hrs.items())}, "top": tops}

    h20 = [0.0] * 24; tot = 0
    for r in rows:
        if r["t"].year == 2020: h20[r["t"].hour] += r["ms"] / 3600000; tot += r["ms"] / 3600000
    mx = max(h20)
    out["habit"] = {"year": 2020, "hours": round(tot), "days": round(tot / 24), "peakHour": h20.index(mx),
                    "bars": [round(v / mx, 3) for v in h20]}

    by = defaultdict(list)
    for r in music:
        if r["ms"] > 30000: by[r["uri"]].append(r)
    cb = []
    for uri, l in by.items():
        for i in range(1, len(l)):
            gap = (l[i]["t"] - l[i - 1]["t"]).days
            if gap >= 900 and i >= 5 and len(l) - i >= 5 and l[i]["t"].year >= 2024:
                cb.append({**song_ref(l[0]), "gapDays": gap, "from": l[i - 1]["t"].strftime("%Y-%m-%d"),
                           "to": l[i]["t"].strftime("%Y-%m-%d"), "playsBefore": i, "playsAfter": len(l) - i})
    cb.sort(key=lambda c: -c["gapDays"])
    distinct, seen = [], set()
    for c in cb:
        if c["artist"] in seen: continue
        seen.add(c["artist"]); distinct.append(c)
    out["comebacks"] = distinct[:8]
    out["_loved_again"] = sorted(distinct[3:], key=lambda c: -c["playsAfter"])[:2]
    out["_hours_day"] = None
    return out

def cache_load(p):
    try: return json.load(open(p))
    except Exception: return {}

def resolve_images(data, mode):
    cache_path = os.path.join(HERE, ".portal_images_cache.json"); cache = cache_load(cache_path)
    cid, sec = os.environ.get("SPOTIFY_CLIENT_ID"), os.environ.get("SPOTIFY_CLIENT_SECRET")
    token = None
    if mode in ("auto", "api") and cid and sec:
        try:
            auth = base64.b64encode(f"{cid}:{sec}".encode()).decode()
            tk = json.loads(hourly.http_get("https://accounts.spotify.com/api/token",
                {"Authorization": "Basic " + auth, "Content-Type": "application/x-www-form-urlencoded"}, b"grant_type=client_credentials"))
            token = tk["access_token"]
        except Exception as e:
            print("Spotify-Token fehlgeschlagen:", e)
    def cover(uri):
        key = "cover:" + uri
        if cache.get(key): return cache[key]
        img = None
        try:
            if token:
                tr = json.loads(hourly.http_get("https://api.spotify.com/v1/tracks/" + uri.split(":")[-1], {"Authorization": "Bearer " + token}))
                img = hourly.pick_image(tr.get("album", {}).get("images"), 300)
            elif mode in ("auto", "public"):
                o = json.loads(hourly.http_get("https://open.spotify.com/oembed?url=" + urllib.parse.quote("https://open.spotify.com/track/" + uri.split(":")[-1], safe="")))
                img = o.get("thumbnail_url")
        except Exception as e:
            print("  kein Cover für", uri, "-", str(e)[:70])
        cache[key] = img; return img
    def artist(name, uri):
        key = "artist:" + name
        if cache.get(key): return cache[key]
        img = None
        try:
            img = hourly.image_via_api(token, name, uri) if token else (hourly.image_via_public(name, uri) if mode in ("auto", "public") else None)
        except Exception as e:
            print("  kein Künstlerbild für", name, "-", str(e)[:70])
        cache[key] = img; return img
    songs = [data["first"], data["song2022"], data["raye"]["first"], *data["raye"]["top"], *data["comebacks"], *data["_loved_again"]]
    for s in songs: s["cover"] = cover(s["uri"])
    data["raye"]["image"] = artist("RAYE", data["raye"]["uri"])
    json.dump(cache, open(cache_path, "w"), indent=1)

def main():
    args = sys.argv[1:]
    if not args or args[0].startswith("--"): print(__doc__); sys.exit(1)
    folder = args[0]
    def opt(n, d):
        return args[args.index(n) + 1] if n in args else d
    mode = opt("--images", "auto"); out = opt("--out", os.path.join(HERE, "..", "src", "lib", "data", "portal_data.json"))
    skip = [s.strip().lower() for s in opt("--skip-artists", ",".join(DEFAULT_SKIP)).split(",") if s.strip()]
    rows = load(folder); print(len(rows), "Streams geladen")
    d = build(rows, skip)
    if mode != "off": resolve_images(d, mode)
    # Lesbare Zusammenfassung
    print("Erster Stream:", d["first"]["track"], "-", d["first"]["artist"], d["first"]["date"])
    print("RAYE:", d["raye"]["hours"], "| Top:", [t["track"] for t in d["raye"]["top"]])
    print("Comebacks:", [(c["track"], c["artist"], c["gapDays"]) for c in d["comebacks"][:5]])
    print("Loved again:", [(c["track"], c["artist"], c["playsAfter"]) for c in d["_loved_again"]])
    json.dump(d, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("geschrieben:", os.path.abspath(out))

if __name__ == "__main__":
    main()
