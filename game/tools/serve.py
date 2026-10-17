#!/usr/bin/env python3
"""Статический сервер для проверки игры в песочнице на телефоне.

Запуск:  python3 tools/serve.py [порт]
Кэш выключен, как в WebView приложения: каждая загрузка свежая.
"""
import http.server
import os
import socket
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), fmt % args))


def lan_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("10.255.255.255", 1))
        return s.getsockname()[0]
    except OSError:
        return "127.0.0.1"
    finally:
        s.close()


if __name__ == "__main__":
    os.chdir(ROOT)
    ip = lan_ip()
    print("Игра: %s" % ROOT)
    print("Реальный Android по Wi-Fi:  http://%s:%d" % (ip, PORT))
    print("Эмулятор Android:           http://10.0.2.2:%d" % PORT)
    print("Android по USB:             adb reverse tcp:%d tcp:%d  ->  http://localhost:%d" % (PORT, PORT, PORT))
    print("Отладка событий на экране:  добавьте ?debug=1 к адресу")
    http.server.ThreadingHTTPServer(("0.0.0.0", PORT), NoCache).serve_forever()
