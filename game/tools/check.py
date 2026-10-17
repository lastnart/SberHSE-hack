#!/usr/bin/env python3
"""Проверка игры перед сдачей: вес и запрещённые вещи из ТЗ.

Запуск:  python3 tools/check.py
Код возврата 1, если есть ошибки (ERR). Предупреждения (WARN) — на вашу совесть.
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKIP_DIRS = {"tools", ".git", "node_modules", "docs"}
SKIP_FILES = {"README.md", ".DS_Store"}
TEXT_EXT = {".html", ".css", ".js", ".json", ".svg"}
BUDGET = 5 * 1024 * 1024  # 5 МБ на всю игру

# (regex, сообщение, серьёзность)
RULES = [
    (r"https?://(?!www\.w3\.org/)", "внешний адрес: игра должна работать в полной изоляции", "ERR"),
    (r"(?<![\w.])//cdn|@import", "подключение внешнего ресурса", "ERR"),
    (r"<a\s", "ссылка <a>: ссылки наружу запрещены", "ERR"),
    (r"<iframe|window\.open|target=[\"']_blank", "iframe / новые окна запрещены", "ERR"),
    (r"localStorage|sessionStorage|document\.cookie|indexedDB", "хранилище страницы очищается между запусками", "WARN"),
    (r"navigator\.(vibrate|share|bluetooth|geolocation)", "эти API недоступны или запрещены в WebView: используйте канал сообщений", "ERR"),
    (r"XMLHttpRequest|WebSocket|sendBeacon|EventSource", "сетевые обращения: допустимы только ресурсы игры", "WARN"),
    (r"\beval\(|new Function\(", "eval / new Function", "ERR"),
    (r"(src|href)=[\"']/(?!/)", "путь от корня сайта: после выкладки сломается, нужны относительные пути", "ERR"),
    (r"(fetch|import)\(\s*[\"']/(?!/)", "путь от корня сайта в fetch/import", "ERR"),
    (r"\?\.[A-Za-z_\[(]|\?\?(?!=)", "?. или ??: на старом WebView Android 8 может не работать", "WARN"),
    (r"@font-face|fonts\.googleapis|fonts\.gstatic", "шрифты: допустимы только системные или свои из сборки", "WARN"),
    (r"\.(min\.js)", "min.js: похоже на чужую библиотеку", "WARN"),
]


def human(n):
    return "%.2f МБ" % (n / 1024 / 1024) if n >= 1024 * 1024 else "%.1f КБ" % (n / 1024)


def main():
    files = []
    for base, dirs, names in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for n in names:
            if n in SKIP_FILES:
                continue
            files.append(os.path.join(base, n))

    total = 0
    errors = warns = 0
    print("Файлы игры:")
    for p in sorted(files):
        size = os.path.getsize(p)
        total += size
        print("  %9s  %s" % (human(size), os.path.relpath(p, ROOT)))

    for p in sorted(files):
        if os.path.splitext(p)[1].lower() not in TEXT_EXT:
            continue
        rel = os.path.relpath(p, ROOT)
        with open(p, encoding="utf-8", errors="replace") as f:
            for i, line in enumerate(f, 1):
                for rx, msg, level in RULES:
                    if re.search(rx, line):
                        print("%s  %s:%d  %s\n        %s" % (level, rel, i, msg, line.strip()[:110]))
                        if level == "ERR":
                            errors += 1
                        else:
                            warns += 1

    pct = total * 100 // BUDGET
    print("\nВес: %s из бюджета %s (%d%%)" % (human(total), human(BUDGET), pct))
    if total > BUDGET:
        print("ERR  вес вне бюджета")
        errors += 1
    elif total > BUDGET * 0.8:
        print("WARN  вес больше 80%% бюджета")
        warns += 1

    print("Итог: ошибок %d, предупреждений %d" % (errors, warns))
    sys.exit(1 if errors else 0)


if __name__ == "__main__":
    main()
