"""Download the recorded instruments and foley the invitation's soundtrack uses, as 48 kHz FLAC.

    python fetch_samples.py        -> audio/samples/<instrument>/<note>.flac, audio/samples/foley/*.flac

Sources and licences (see README):
  piano         Salamander Grand Piano, Alexander Holm, CC-BY 3.0 (via tonejs.github.io/audio/salamander)
  guitar-nylon, flute, harp, bass-electric
                nbrosowsky/tonejs-instruments, CC-BY 3.0
  foley         Kenney "Casino Audio", "RPG Audio" and "Impact Sounds", CC0
Needs ffmpeg on PATH.
"""
import io
import os
import subprocess
import urllib.request
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'samples')
SALAMANDER = 'https://tonejs.github.io/audio/salamander/{}.mp3'
TONEJS_INST = 'https://nbrosowsky.github.io/tonejs-instruments/samples/{}/{}.mp3'
PIANO = [f'{n}{o}' for o in range(1, 8) for n in ('A', 'C', 'Ds', 'Fs')] + ['C8']
INSTRUMENTS = {
    'guitar-nylon': ['B1', 'D2', 'E2', 'A2', 'B2', 'D3', 'E3', 'G3', 'A3', 'B3', 'E4', 'A4', 'B4', 'D5', 'E5', 'G5', 'A5'],
    'flute': ['C4', 'E4', 'A4', 'C5', 'E5', 'A5', 'C6', 'E6', 'A6', 'C7'],
    'harp': ['D2', 'F2', 'A2', 'C3', 'E3', 'G3', 'B3', 'D4', 'F4', 'A4', 'C5', 'E5', 'G5', 'B5', 'D6', 'F6', 'A6', 'B6', 'D7', 'F7'],
    'bass-electric': ['E1', 'G1', 'E2', 'G2', 'E3', 'G3'],
}
KENNEY = {
    'https://kenney.nl/media/pages/assets/casino-audio/2472606a04-1721639069/kenney_casino-audio.zip':
        ('card-slide', 'card-place', 'card-shove', 'card-fan', 'cards-pack-open', 'cards-pack-take-out'),
    'https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip':
        ('bookFlip', 'bookPlace', 'bookOpen', 'cloth'),
    'https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip':
        ('impactSoft_heavy', 'impactSoft_medium', 'impactWood_light'),
}


def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def to_flac(data, dest, fmt='mp3'):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-f', fmt, '-i', 'pipe:0', '-ac', '1', '-ar', '48000', dest], input=data, check=True)


def main():
    for note in PIANO:
        dest = os.path.join(OUT, 'piano', note + '.flac')
        if not os.path.exists(dest):
            to_flac(get(SALAMANDER.format(note)), dest)
    for inst, notes in INSTRUMENTS.items():
        for note in notes:
            dest = os.path.join(OUT, inst, note + '.flac')
            if not os.path.exists(dest):
                to_flac(get(TONEJS_INST.format(inst, note)), dest)
    for url, keep in KENNEY.items():
        z = zipfile.ZipFile(io.BytesIO(get(url)))
        for member in z.namelist():
            base = os.path.basename(member)
            if member.lower().endswith('.ogg') and base.startswith(keep):
                to_flac(z.read(member), os.path.join(OUT, 'foley', base[:-4] + '.flac'), 'ogg')
    print('samples in', OUT)


if __name__ == '__main__':
    main()
