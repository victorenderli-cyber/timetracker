import struct
import zlib
import os


def make_png(size):
    w = h = size
    # RGBA rows
    rows = []
    for y in range(h):
        row = bytearray([0])  # filter byte 0
        for x in range(w):
            # rounded square background (blue #2563eb)
            margin = int(w * 0.06)
            cx, cy = w / 2, h / 2
            r = w / 2 - margin
            if (x - cx) ** 2 + (y - cy) ** 2 <= r * r or (
                abs(x - cx) <= r and abs(y - cy) <= r * 0.9
            ):
                bg = (37, 99, 235, 255)
            else:
                bg = (0, 0, 0, 0)
            # draw a simple clock: white circle + hands
            dist = ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5
            inner_r = w * 0.26
            if abs(dist - inner_r) < w * 0.04:
                px = (255, 255, 255, 255)
            elif bg[3] == 0:
                px = bg
            else:
                # hands
                dx = x - cx
                dy = y - cy
                angle = abs(dx) / max(abs(dx) + abs(dy), 1)
                hand_len = (dx ** 2 + dy ** 2) ** 0.5
                if hand_len < w * 0.20 and (abs(dy) < w * 0.05 or abs(dx) < w * 0.05):
                    px = (255, 255, 255, 255)
                else:
                    px = bg
            row.extend(px)
        rows.append(bytes(row))

    raw = b"".join(rows)

    def chunk(ctype, data):
        c = struct.pack(">I", len(data)) + ctype + data
        c += struct.pack(">I", zlib.crc32(ctype + data) & 0xFFFFFFFF)
        return c

    sig = b"\x89PNG\r\n\x1a\n"
    ihdr = struct.pack(">IIBBBBB", w, h, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw, 9)
    png = sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")
    return png


outdir = os.path.join("public", "icons")
for s in (192, 512):
    path = os.path.join(outdir, f"icon-{s}.png")
    with open(path, "wb") as f:
        f.write(make_png(s))
    print(f"criado {path} ({os.path.getsize(path)} bytes)")
