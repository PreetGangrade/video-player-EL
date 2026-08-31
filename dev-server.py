#!/usr/bin/env python3
"""Static dev server for the prototype with caching disabled, so edits to
index.html / assets are always picked up on plain reload."""
import http.server
import os
import sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8899


# Media is cacheable, everything else is not. no-store on the 86MB feature.mp4
# made every <video> mount re-download it, which starved Chrome's per-origin
# connection pool and left ad.mp4 stalled (readyState 0) with no audio.
MEDIA = ('.mp4', '.png', '.jpg', '.woff2')


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        if self.path.split('?')[0].lower().endswith(MEDIA):
            self.send_header('Cache-Control', 'public, max-age=86400')
        else:
            self.send_header('Cache-Control', 'no-store, must-revalidate')
            self.send_header('Expires', '0')
        super().end_headers()


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('', PORT), NoCacheHandler).serve_forever()
