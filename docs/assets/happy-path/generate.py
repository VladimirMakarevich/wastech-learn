#!/usr/bin/env python3
"""Генератор схем happy path: весь путь темы, день 0 и сессия повторения.

Запуск из корня репозитория:

    python3 docs/assets/happy-path/generate.py

Пишет рядом с собой 01-overview.svg, 02-day0-capture.svg, 03-review-session.svg
и, если найден Chrome или Chromium, PNG-версии в масштабе 2x. Схемы рисуются
вручную (без Mermaid), чтобы управлять композицией; правьте тексты здесь,
а не в SVG.
"""
import math
import pathlib
import shutil
import subprocess

OUT = pathlib.Path(__file__).resolve().parent
FONT = "Inter, 'Segoe UI', Roboto, 'Noto Sans', 'Helvetica Neue', Arial, 'DejaVu Sans', sans-serif"
MONO = "'JetBrains Mono', 'Cascadia Code', Consolas, 'DejaVu Sans Mono', 'Liberation Mono', monospace"

INK, BODY, MUTED = "#0F172A", "#334155", "#64748B"
BG, WHITE, FLOW = "#F5F7FB", "#FFFFFF", "#94A3B8"
PAL = {
    "learn": dict(main="#4F46E5", light="#EEF2FF", mid="#C7D2FE", dark="#3730A3"),
    "review": dict(main="#059669", light="#ECFDF5", mid="#A7F3D0", dark="#047857"),
    "deepen": dict(main="#D97706", light="#FFFBEB", mid="#FDE68A", dark="#B45309"),
    "data": dict(main="#475569", light="#F1F5F9", mid="#CBD5E1", dark="#334155"),
    "ai": dict(main="#7C3AED", light="#F5F3FF", mid="#DDD6FE", dark="#6D28D9"),
    "me": dict(main="#2563EB", light="#EFF6FF", mid="#BFDBFE", dark="#1D4ED8"),
    "repo": dict(main="#0F766E", light="#F0FDFA", mid="#99F6E4", dark="#115E59"),
    "bad": dict(main="#DC2626", light="#FEF2F2", mid="#FECACA", dark="#B91C1C"),
}
ACTOR = {"Я": "me", "ИИ": "ai", "Система": "repo"}


def esc(s):
    return str(s).replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


class Svg:
    def __init__(self, w, h, title, desc):
        self.w, self.h, self.title, self.desc = w, h, title, desc
        self.parts, self.markers = [], {}

    def add(self, s):
        self.parts.append(s)

    def marker(self, color):
        mid = "m" + color.lstrip("#")
        self.markers[mid] = color
        return mid

    def render(self):
        defs = [
            '<filter id="sh" x="-5%" y="-10%" width="110%" height="140%">'
            '<feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#0F172A" flood-opacity="0.08"/></filter>',
            '<linearGradient id="rgrad" x1="0" y1="0" x2="0" y2="1">'
            '<stop offset="0" stop-color="#10B981" stop-opacity="0.28"/>'
            '<stop offset="1" stop-color="#10B981" stop-opacity="0.02"/></linearGradient>',
        ]
        for mid, color in sorted(self.markers.items()):
            defs.append(
                f'<marker id="{mid}" viewBox="0 0 10 10" refX="8.5" refY="5" markerUnits="userSpaceOnUse" '
                f'markerWidth="10" markerHeight="10" orient="auto-start-reverse">'
                f'<path d="M0,0 L10,5 L0,10 z" fill="{color}"/></marker>'
            )
        head = (
            f'<svg xmlns="http://www.w3.org/2000/svg" width="{self.w}" height="{self.h}" '
            f'viewBox="0 0 {self.w} {self.h}" role="img" aria-labelledby="title desc">\n'
            f'<title id="title">{esc(self.title)}</title>\n<desc id="desc">{esc(self.desc)}</desc>\n'
            f'<defs>{"".join(defs)}</defs>\n'
            f'<rect width="{self.w}" height="{self.h}" fill="{BG}"/>\n'
        )
        return head + "\n".join(self.parts) + "\n</svg>\n"


# ---------- примитивы ----------

def text(s, x, y, t, size=14, weight=400, fill=BODY, anchor="start", family=FONT, extra=""):
    s.add(
        f'<text x="{x:.1f}" y="{y:.1f}" font-family="{family}" font-size="{size}" font-weight="{weight}" '
        f'fill="{fill}" text-anchor="{anchor}" {extra}>{esc(t)}</text>'
    )


def lines(s, x, y, items, size=13, lh=17, **kw):
    for i, t in enumerate(items):
        text(s, x, y + i * lh, t, size=size, **kw)


def rect(s, x, y, w, h, r=12, fill=WHITE, stroke=None, sw=1.2, dash=None, shadow=False, opacity=None):
    a = f'x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{r}" fill="{fill}"'
    if opacity is not None:
        a += f' fill-opacity="{opacity}"'
    if stroke:
        a += f' stroke="{stroke}" stroke-width="{sw}"'
    if dash:
        a += f' stroke-dasharray="{dash}"'
    if shadow:
        a += ' filter="url(#sh)"'
    s.add(f"<rect {a}/>")


def arrow(s, d, color=FLOW, sw=2, dash=None, both=False):
    m = s.marker(color)
    a = (f'd="{d}" fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" '
         f'stroke-linejoin="round" marker-end="url(#{m})"')
    if both:
        a += f' marker-start="url(#{m})"'
    if dash:
        a += f' stroke-dasharray="{dash}"'
    s.add(f"<path {a}/>")


def text_w(t, size, bold=False):
    """Грубая оценка ширины строки для раскладки (Noto Sans / Inter)."""
    return len(t) * size * (0.58 if bold else 0.54)


def chip(s, x_right, y, label, h=20):
    c = PAL[ACTOR[label]]
    w = 16 + text_w(label, 11.5, True)
    rect(s, x_right - w, y, w, h, r=h / 2, fill=c["light"], stroke=c["mid"], sw=1)
    text(s, x_right - w / 2, y + 14, label, size=11.5, weight=700, fill=c["dark"], anchor="middle")


def pill(s, x, y, w, h, t, pal, dash=None, size=12.5, filled=False):
    c = PAL[pal]
    rect(s, x, y, w, h, r=h / 2, fill=c["main"] if filled else WHITE, stroke=c["mid"] if not filled else None,
         sw=1.3, dash=dash)
    text(s, x + w / 2, y + h / 2 + size * 0.36, t, size=size, weight=600,
         fill=WHITE if filled else c["dark"], anchor="middle")


def badge(s, cx, cy, n, pal, r=15, size=14):
    s.add(f'<circle cx="{cx:.1f}" cy="{cy:.1f}" r="{r}" fill="{PAL[pal]["main"]}"/>')
    text(s, cx, cy + size * 0.36, str(n), size=size, weight=700, fill=WHITE, anchor="middle")


def step_card(s, x, y, w, h, num, title, desc, pal, actor):
    c = PAL[pal]
    rect(s, x, y, w, h, r=12, fill=WHITE, stroke=c["mid"], sw=1.2, shadow=True)
    badge(s, x + 27, y + h / 2, num, pal)
    text(s, x + 54, y + 29, title, size=15.5, weight=700, fill=INK)
    lines(s, x + 54, y + 50, desc if isinstance(desc, list) else [desc], size=13, fill=BODY)
    chip(s, x + w - 12, y + 12, actor)


def panel(s, x, y, w, h, pal, label, title, time):
    c = PAL[pal]
    rect(s, x, y, w, h, r=18, fill=c["light"], stroke=c["mid"], sw=1.5)
    s.add(f'<path d="M{x},{y + 18} a18,18 0 0 1 18,-18 h{w - 36} a18,18 0 0 1 18,18 v52 h{-w} z" '
          f'fill="{c["main"]}"/>')
    text(s, x + 22, y + 27, label, size=12, weight=700, fill=WHITE, extra='letter-spacing="1.6" fill-opacity="0.85"')
    text(s, x + 22, y + 55, title, size=20, weight=700, fill=WHITE)
    pw = 28 + text_w(time, 13, True)
    rect(s, x + w - 20 - pw, y + 21, pw, 30, r=15, fill=WHITE, opacity=0.18)
    text(s, x + w - 20 - pw / 2, y + 41, time, size=13, weight=600, fill=WHITE, anchor="middle")


def header(s, title, subtitle):
    text(s, 40, 62, title, size=30, weight=800, fill=INK)
    text(s, 40, 94, subtitle, size=16, fill=MUTED)


def legend_actors(s, x_right, y):
    x = x_right
    for label in ["Система", "ИИ", "Я"]:
        chip(s, x, y, label)
        x -= 16 + text_w(label, 11.5, True) + 8
    text(s, x, y + 14, "Кто действует:", size=13, fill=MUTED, anchor="end")


# ---------- 1. Общий путь ----------

def forgetting_chart(s, x, y, w, h):
    c = PAL["review"]
    rect(s, x, y, w, h, r=12, fill=WHITE, stroke=c["mid"], sw=1.2, shadow=True)
    text(s, x + 16, y + 26, "Память о карточке", size=14, weight=700, fill=INK)
    lx = x + w - 236
    s.add(f'<line x1="{lx}" y1="{y + 21}" x2="{lx + 22}" y2="{y + 21}" stroke="{c["main"]}" stroke-width="2.5"/>')
    text(s, lx + 28, y + 25, "с повторами", size=11.5, fill=BODY)
    lx2 = lx + 112
    s.add(f'<line x1="{lx2}" y1="{y + 21}" x2="{lx2 + 22}" y2="{y + 21}" stroke="{FLOW}" stroke-width="2" '
          f'stroke-dasharray="5 4"/>')
    text(s, lx2 + 28, y + 25, "без повторов", size=11.5, fill=BODY)

    px0, px1 = x + 52, x + w - 22
    pt, pb = y + 54, y + h - 32
    rmin = 0.4

    def X(t):
        return px0 + math.sqrt(t / 40) * (px1 - px0)

    def Y(r):
        return pt + (1 - r) / (1 - rmin) * (pb - pt)

    def R(t, s_):
        return (1 + 19 / 81 * t / s_) ** -0.5

    for r, lbl in [(1.0, "100%"), (0.9, "90%"), (rmin, "40%")]:
        dash = ' stroke-dasharray="4 4"' if r == 0.9 else ""
        col = c["mid"] if r == 0.9 else "#E2E8F0"
        s.add(f'<line x1="{px0}" y1="{Y(r):.1f}" x2="{px1}" y2="{Y(r):.1f}" stroke="{col}" stroke-width="1.2"{dash}/>')
        text(s, px0 - 8, Y(r) + 4, lbl, size=11, fill=MUTED, anchor="end")

    reviews = [0, 1, 4, 12, 33]
    segs = list(zip(reviews, reviews[1:] + [40]))
    stab = [1, 3, 8, 21, 55]
    pts = []
    for (a, b), st in zip(segs, stab):
        for i in range(31):
            t = a + (b - a) * i / 30
            pts.append((X(t), Y(R(t - a, st))))
        if b != 40:
            pts.append((X(b), Y(1.0)))
    d = "M" + " L".join(f"{px:.1f},{py:.1f}" for px, py in pts)
    s.add(f'<path d="{d} L{px1:.1f},{pb:.1f} L{px0:.1f},{pb:.1f} Z" fill="url(#rgrad)"/>')
    s.add(f'<path d="{d}" fill="none" stroke="{c["main"]}" stroke-width="2.5" stroke-linejoin="round"/>')

    no = []
    t = 0.0
    while R(t, 1) >= rmin:
        no.append((X(t), Y(R(t, 1))))
        t += 0.1
    s.add('<path d="M' + " L".join(f"{px:.1f},{py:.1f}" for px, py in no) +
          f'" fill="none" stroke="{FLOW}" stroke-width="2" stroke-dasharray="5 4"/>')
    text(s, no[-1][0] + 6, no[-1][1] - 4, "забыто", size=11, fill=MUTED)

    for (a, b), lbl in zip(segs[:4], ["1 дн", "3 дн", "8 дн", "21 дн"]):
        text(s, (X(a) + X(b)) / 2, pt - 8, lbl, size=11.5, weight=700, fill=c["dark"], anchor="middle")
    for t in reviews[1:]:
        s.add(f'<circle cx="{X(t):.1f}" cy="{Y(0.9):.1f}" r="4" fill="{c["main"]}" stroke="{WHITE}" stroke-width="1.5"/>')
    for t in reviews:
        text(s, X(t), pb + 16, str(t), size=11, fill=MUTED, anchor="middle")
    text(s, px1, pb + 16, "дни", size=11, fill=MUTED, anchor="end")


def overview():
    s = Svg(1600, 1130, "Happy path wastech-learn: весь путь темы",
            "Три фазы: разбор темы в чате (день 0), короткие сессии повторения (дни 1…N), "
            "углубление (неделя, месяц). Внизу — где живут данные.")
    header(s, "Happy path: как тема становится долговременным знанием",
           "Пример: «Backpressure» · домен architecture · язык en · Claude Code по подписке, без API-ключей")
    legend_actors(s, 1560, 46)

    # петля: открытые вопросы → новый разбор
    arrow(s, "M1330,160 V134 H290 V158", color=PAL["deepen"]["main"], sw=2.2, dash="7 5")
    pill(s, 590, 120, 440, 28, "↻ открытые вопросы и связанные темы → новый разбор", "deepen", size=12.5)

    py, ph = 160, 740
    panel(s, 40, py, 500, ph, "learn", "1 · ИЗУЧЕНИЕ", "Разбор темы в чате", "День 0 · 15–40 мин")
    panel(s, 570, py, 500, ph, "review", "2 · ПОВТОРЕНИЕ", "Короткие сессии", "Дни 1…N · 5–15 мин")
    panel(s, 1100, py, 460, ph, "deepen", "3 · УГЛУБЛЕНИЕ", "Связать и закрепить", "Неделя · месяц")

    learn = [
        ("Старт в Claude Code", "«Разберём backpressure, architecture, en»", "Я"),
        ("Pre-questions", "3–5 вопросов до объяснения + моя уверенность", "ИИ"),
        ("Сократический диалог", "Сначала моя попытка, подсказки H0 → H4", "ИИ"),
        ("Brain dump", "Суть своими словами, ИИ отмечает пробелы", "Я"),
        ("Отбор карточек", "ИИ предлагает 12 кандидатов → я оставляю 8", "Я"),
        ("Summary и визуал", "12 секций, схема Mermaid → SVG, материалы", "ИИ"),
        ("Мини-квиз", "3 новые карточки сразу — первое вспоминание", "Я"),
    ]
    for i, (t, d, a) in enumerate(learn):
        step_card(s, 60, 250 + i * 80, 460, 70, i + 1, t, d, "learn", a)
    pill(s, 60, 812, 460, 34, "✓ validate: mdlint + check → файлы темы в git", "data")
    pill(s, 60, 854, 460, 34, "Из ChatGPT: learning package → inbox/ → learn-import → шаг 5", "ai",
         dash="6 4", size=12)

    review = [
        ("Главная", "«Сегодня 23 карточки ≈ 6 мин» — без стриков", "Система"),
        ("Вопрос и попытка", "Вспоминаю сам и отмечаю уверенность 1–3", "Я"),
        ("Ответ и оценка", "Ответ + схема → Again · Hard · Good · Easy", "Я"),
        ("FSRS планирует", "Следующий показ — когда R упадёт до 90%", "Система"),
        ("Итоги сессии", "«Вспомнил 20 из 23», завтра ≈ 18 карточек", "Система"),
    ]
    for i, (t, d, a) in enumerate(review):
        step_card(s, 590, 250 + i * 80, 460, 70, i + 8, t, d, "review", a)
    forgetting_chart(s, 590, 652, 460, 190)
    pill(s, 590, 854, 460, 34, "Или квиз в Claude Code: ИИ проверяет по рубрике, я подтверждаю", "ai",
         dash="6 4", size=12)

    deepen = [
        ("Смешанная сессия", "Сценарии из разных доменов, раз в неделю", "Я"),
        ("Deep dive", "Раз в месяц: leech → переписать или разбить", "Я"),
        ("Рефлексия", "Что применил на работе, где ошибался уверенно", "Я"),
        ("Summary уплотняется", "Открытые вопросы становятся новыми темами", "ИИ"),
    ]
    for i, (t, d, a) in enumerate(deepen):
        step_card(s, 1120, 250 + i * 80, 420, 70, i + 13, t, d, "deepen", a)

    c = PAL["deepen"]
    rect(s, 1120, 580, 420, 262, r=14, fill=WHITE, stroke=c["mid"], sw=1.2, shadow=True)
    text(s, 1144, 616, "Что получается", size=17, weight=800, fill=INK)
    outcomes = [
        "≈90% карточек вспоминаю в момент повтора",
        "У каждой темы — схема, пример, trade-offs",
        "5–15 минут на сессию, пропуски не страшны",
        "Видно слабое: leech и уверенные ошибки",
    ]
    for i, t in enumerate(outcomes):
        cy = 656 + i * 42
        s.add(f'<circle cx="{1154}" cy="{cy - 5}" r="11" fill="{PAL["review"]["light"]}" '
              f'stroke="{PAL["review"]["mid"]}"/>')
        text(s, 1154, cy, "✓", size=13, weight=800, fill=PAL["review"]["dark"], anchor="middle")
        text(s, 1176, cy, t, size=14, fill=BODY)
    text(s, 1144, 822, "Критерий MVP: 4 недели, ≥5 тем, ≥300 повторений", size=12.5, fill=MUTED)
    pill(s, 1120, 854, 420, 34, "Перерыв? План возврата и режим «5 минут»", "deepen", dash="6 4", size=12.5)

    # данные
    d = PAL["data"]
    rect(s, 40, 930, 1520, 172, r=18, fill=WHITE, stroke=d["mid"], sw=1.5)
    text(s, 60, 958, "ДАННЫЕ · приватный git-репозиторий wastech-learn-content", size=12.5, weight=700,
         fill=d["dark"], extra='letter-spacing="1.2"')
    boxes = [
        ("learn", "content/architecture/backpressure/", ["index.md · summary.md · materials.md",
                                                         "diagrams/flow.mmd → flow.svg"]),
        ("learn", "cards/7k2m9xqd.md  × 8", ["1 карточка = 1 файл, стабильный id",
                                             "проверено mdlint + check"]),
        ("review", "reviews/desk1/web-2026-11.jsonl", ["append-only журнал оценок",
                                                       "состояние = replay через FSRS"]),
        ("data", "git push / pull", ["второй компьютер — без конфликтов",
                                     "позже телефон: Worker + D1"]),
    ]
    bw = (1480 - 3 * 16) / 4
    for i, (pal, head, ls) in enumerate(boxes):
        bx = 60 + i * (bw + 16)
        rect(s, bx, 974, bw, 110, r=12, fill=PAL[pal]["light"], stroke=PAL[pal]["mid"], sw=1)
        text(s, bx + 16, 1004, head, size=13, weight=700, fill=INK, family=MONO)
        lines(s, bx + 16, 1032, ls, size=13, lh=22, fill=BODY)
    for x, pal, lbl in [(222, "learn", "пишет тему и карточки"),
                        (990, "review", "дописывает события"),
                        (1330, "deepen", "правит summary и карточки")]:
        arrow(s, f"M{x},902 V928", color=PAL[pal]["main"], sw=2.2)
        text(s, x + 10, 920, lbl, size=12, weight=600, fill=PAL[pal]["dark"])
    return s


# ---------- 2. День 0: разбор темы ----------

def day0():
    s = Svg(1800, 860, "День 0: разбор темы в Claude Code",
            "Swimlane: я, Claude Code со skill learn-capture, MCP-сервер с mdlint и контент-репозиторий; "
            "девять шагов от старта до мини-квиза.")
    header(s, "День 0 · разбор темы в Claude Code",
           "Кто что делает на каждом шаге: я, ИИ-тьютор, MCP-сервер и репозиторий — всё по подписке, без API-ключей")
    lanes = [
        ("me", "Я", "думаю, отвечаю, выбираю"),
        ("ai", "Claude Code", "skill learn-capture"),
        ("data", "wastech-learn-mcp", "+ wastech-mdlint"),
        ("repo", "Контент-репозиторий", "wastech-learn-content (git)"),
    ]
    ly = [128 + i * 162 for i in range(4)]
    for (pal, t, sub), y in zip(lanes, ly):
        c = PAL[pal]
        rect(s, 40, y, 1720, 150, r=16, fill=c["light"], stroke=c["mid"], sw=1.2)
        s.add(f'<path d="M40,{y + 16} a16,16 0 0 1 16,-16 h4 v150 h-4 a16,16 0 0 1 -16,-16 z" fill="{c["main"]}"/>')
        text(s, 70, y + 68, t, size=17, weight=800, fill=c["dark"])
        text(s, 70, y + 92, sub, size=12.5, fill=MUTED)

    BW, BH, X0, DX = 140, 96, 262, 166

    def box(col, lane):
        return X0 + col * DX, ly[lane] + 27

    events = [
        (0, 0, "Старт", ["«Разберём", "backpressure»"], 1, False),
        (1, 1, "Поиск темы", ["есть ли уже", "такая тема?"], 2, False),
        (1, 2, "search", ["похожих тем", "нет"], None, True),
        (2, 1, "Pre-questions", ["3–5 вопросов", "до объяснения"], 3, False),
        (2, 0, "Отвечаю", ["как могу +", "уверенность 1–3"], None, False),
        (3, 1, "Диалог", ["сократический,", "подсказки H0→H4"], 4, False),
        (3, 0, "Пробую сам", ["предсказываю,", "объясняю"], None, False),
        (4, 0, "Brain dump", ["суть своими", "словами"], 5, False),
        (4, 1, "Разбор", ["отмечает", "пробелы"], None, False),
        (5, 1, "Кандидаты", ["12 карточек", "разных типов"], 6, False),
        (5, 2, "add_cards", ["dryRun:", "mdlint + check"], None, True),
        (6, 0, "Отбор", ["оставляю 8,", "3 переписываю"], 7, False),
        (7, 1, "Запись", ["тема, summary,", "карточки, схема"], 8, False),
        (7, 2, "validate ✓", ["render SVG,", "идемпотентно"], None, True),
        (7, 3, "Файлы темы", ["index, summary,", "materials,", "8 карточек, SVG"], None, False),
        (8, 1, "Мини-квиз", ["3 новые", "карточки"], 9, False),
        (8, 0, "Вспоминаю", ["и ставлю", "оценку"], None, False),
        (8, 2, "record_review", ["событие,", "grader: self"], None, True),
        (8, 3, "Журнал", ["reviews/desk1/", "mcp-2026-11.jsonl"], None, False),
    ]

    # стрелки (под карточками)
    def right_mid(c, l):
        x, y = box(c, l)
        return x + BW, y + BH / 2

    def left_mid(c, l):
        x, y = box(c, l)
        return x, y + BH / 2

    def elbow(a, b):
        (x1, y1), (x2, y2) = right_mid(*a), left_mid(*b)
        xm = (x1 + x2) / 2
        arrow(s, f"M{x1 + 2},{y1} H{xm} V{y2} H{x2 - 3}", sw=1.8)

    def straight(a, b):
        (x1, y1), (x2, y2) = right_mid(*a), left_mid(*b)
        arrow(s, f"M{x1 + 2},{y1} H{x2 - 3}", sw=1.8)

    def vertical(a, b, both=False):
        xa, ya = box(*a)
        xb, yb = box(*b)
        cx = xa + BW / 2
        if yb > ya:
            arrow(s, f"M{cx},{ya + BH + 3} V{yb - 3}", sw=1.8, both=both)
        else:
            arrow(s, f"M{cx},{ya - 3} V{yb + BH + 3}", sw=1.8, both=both)

    elbow((0, 0), (1, 1))
    vertical((1, 1), (1, 2), both=True)
    straight((1, 1), (2, 1))
    vertical((2, 1), (2, 0), both=True)
    straight((2, 1), (3, 1))
    vertical((3, 1), (3, 0), both=True)
    straight((3, 0), (4, 0))
    vertical((4, 0), (4, 1))
    straight((4, 1), (5, 1))
    vertical((5, 1), (5, 2), both=True)
    elbow((5, 1), (6, 0))
    elbow((6, 0), (7, 1))
    vertical((7, 1), (7, 2))
    vertical((7, 2), (7, 3))
    straight((7, 1), (8, 1))
    vertical((8, 1), (8, 0), both=True)
    vertical((8, 1), (8, 2))
    vertical((8, 2), (8, 3))

    lane_pal = ["me", "ai", "data", "repo"]
    for col, lane, title, ls, num, mono in events:
        x, y = box(col, lane)
        c = PAL[lane_pal[lane]]
        rect(s, x, y, BW, BH, r=10, fill=WHITE, stroke=c["mid"], sw=1.2, shadow=True)
        text(s, x + 12, y + 26, title, size=13.5, weight=700, fill=INK, family=MONO if mono else FONT)
        lines(s, x + 12, y + 47, ls, size=12, lh=16, fill=BODY)
        if num:
            badge(s, x + 2, y + 2, num, lane_pal[lane], r=12, size=12)

    text(s, 700, ly[3] + 70, "До шага 8 в репозиторий ничего не пишется:", size=14, weight=600,
         fill=PAL["repo"]["dark"])
    text(s, 700, ly[3] + 92, "сначала мой отбор карточек, потом validate (mdlint + check)", size=13.5,
         fill=MUTED)
    text(s, 600, ly[2] + 82, "Тонкий слой над ядром: core · srs · content-fs", size=13.5, fill=MUTED)
    pill(s, 40, 790, 860, 38, "≈ 20–40 минут разговора · захват после диалога ≤ 15 минут · всё по подписке",
         "learn", size=13.5)
    pill(s, 920, 790, 840, 38, "Ошибка validate → ИИ правит текст до записи: в git попадает только проверенное",
         "data", size=13.5)
    return s


# ---------- 3. Сессия повторения ----------

def screen_frame(s, x, y, w, h, counter):
    rect(s, x, y, w, h, r=18, fill=WHITE, stroke="#E2E8F0", sw=1.2, shadow=True)
    text(s, x + 20, y + 30, "architecture / backpressure", size=12, fill=MUTED)
    text(s, x + w - 20, y + 30, counter, size=12, weight=700, fill=MUTED, anchor="end")
    rect(s, x + 20, y + 42, w - 40, 4, r=2, fill="#E2E8F0")
    rect(s, x + 20, y + 42, (w - 40) * 7 / 23, 4, r=2, fill=PAL["review"]["main"])


def review_session():
    s = Svg(1600, 870, "Сессия повторения: что происходит с одной карточкой",
            "Экран вопроса и экран ответа с четырьмя оценками; что делает FSRS после оценки; очередь дня; "
            "ветки «был перерыв» и «квиз в чате».")
    header(s, "Сессия повторения: путь одной карточки",
           "Дни 1…N · в браузере (позже — в телефоне) или квизом в Claude Code · 5–15 минут")

    text(s, 40, 128, "КАРТОЧКА НА ЭКРАНЕ", size=12.5, weight=700, fill=MUTED, extra='letter-spacing="1.4"')
    # экран A: вопрос
    ax, ay, w, h = 40, 146, 350, 380
    screen_frame(s, ax, ay, w, h, "7 / 23")
    pill(s, ax + 20, ay + 60, 134, 24, "why · understand", "learn", size=11.5)
    lines(s, ax + 20, ay + 120, ["[Streaming] Why does a", "consumer signal demand", "to the producer?"],
          size=19, lh=27, weight=700, fill=INK)
    text(s, ax + 20, ay + 226, "Уверенность до ответа", size=12, fill=MUTED)
    cx = ax + 20
    for lbl, cw, sel in [("1 не уверен", 104, False), ("2 скорее да", 104, True), ("3 точно", 80, False)]:
        c = PAL["me"]
        rect(s, cx, ay + 236, cw, 30, r=15, fill=c["light"] if sel else WHITE,
             stroke=c["main"] if sel else "#CBD5E1", sw=1.4 if sel else 1)
        text(s, cx + cw / 2, ay + 256, lbl, size=12, weight=700 if sel else 500,
             fill=c["dark"] if sel else BODY, anchor="middle")
        cx += cw + 8
    rect(s, ax + 20, ay + 296, w - 40, 48, r=12, fill=PAL["learn"]["main"])
    text(s, ax + w / 2, ay + 326, "Показать ответ · Space", size=15, weight=700, fill=WHITE, anchor="middle")
    text(s, ax + w / 2, ay + 366, "сначала вспоминаю сам — потом смотрю", size=12, fill=MUTED, anchor="middle")

    arrow(s, f"M{ax + w + 6},{ay + 320} H{ax + w + 34}", color=PAL["learn"]["main"], sw=2.2)
    text(s, ax + w + 20, ay + 308, "Space", size=11, weight=700, fill=PAL["learn"]["dark"], anchor="middle")

    # экран B: ответ и оценка
    bx, by = 430, 146
    screen_frame(s, bx, by, w, h, "7 / 23")
    text(s, bx + 20, by + 72, "Why does a consumer signal demand…", size=12.5, fill=MUTED)
    text(s, bx + 20, by + 100, "ОТВЕТ", size=11.5, weight=700, fill=PAL["review"]["dark"], extra='letter-spacing="1.2"')
    lines(s, bx + 20, by + 126, ["Keeps the producer from", "overflowing the consumer."], size=16, lh=22,
          weight=700, fill=INK)
    # мини-схема
    for i, lbl in enumerate(["Producer", "Consumer"]):
        px = bx + 20 + i * 200
        rect(s, px, by + 178, 110, 40, r=8, fill=PAL["data"]["light"], stroke=PAL["data"]["mid"], sw=1)
        text(s, px + 55, by + 203, lbl, size=12.5, weight=700, fill=INK, anchor="middle")
    arrow(s, f"M{bx + 132},{by + 190} H{bx + 218}", color=PAL["data"]["main"], sw=1.6)
    arrow(s, f"M{bx + 218},{by + 207} H{bx + 132}", color=PAL["review"]["main"], sw=1.6)
    text(s, bx + 175, by + 172, "данные", size=11, fill=MUTED, anchor="middle")
    text(s, bx + 175, by + 234, "request(n)", size=11, weight=700, fill=PAL["review"]["dark"], anchor="middle",
         family=MONO)
    # оценки
    rates = [("1 · Again", "<10 мин", "не вспомнил", "bad"), ("2 · Hard", "2 дн", "с трудом", "deepen"),
             ("3 · Good", "4 дн", "вспомнил", "review"), ("4 · Easy", "9 дн", "легко", "me")]
    rw = (w - 40 - 3 * 8) / 4
    for i, (k, iv, cap, pal) in enumerate(rates):
        rx = bx + 20 + i * (rw + 8)
        c = PAL[pal]
        rect(s, rx, by + 256, rw, 50, r=10, fill=c["light"], stroke=c["main"] if pal == "review" else c["mid"],
             sw=2 if pal == "review" else 1.2)
        text(s, rx + rw / 2, by + 276, k, size=12, weight=800, fill=c["dark"], anchor="middle")
        text(s, rx + rw / 2, by + 295, iv, size=11.5, fill=BODY, anchor="middle")
        text(s, rx + rw / 2, by + 324, cap, size=11, fill=MUTED, anchor="middle")
    text(s, bx + w / 2, by + 362, "o тема · e VS Code · u отменить · ! отложить", size=11.5, fill=MUTED,
         anchor="middle")

    # FSRS после оценки
    text(s, 820, 128, "ЧТО ДЕЛАЕТ FSRS ПОСЛЕ ОЦЕНКИ", size=12.5, weight=700, fill=MUTED, extra='letter-spacing="1.4"')
    fsrs = [("Оценка", ["Good, ответ", "занял 8 с"]),
            ("Память", ["stability 1.8 → 4 дн", "difficulty 5.1"]),
            ("Интервал", ["когда R упадёт", "до 90% → 4 дн"]),
            ("Очередь", ["карточка вернётся", "29 ноября"])]
    fw = (740 - 3 * 26) / 4
    for i, (t, ls) in enumerate(fsrs):
        fx = 820 + i * (fw + 26)
        rect(s, fx, 146, fw, 104, r=12, fill=WHITE, stroke=PAL["review"]["mid"], sw=1.2, shadow=True)
        badge(s, fx + 22, 172, i + 1, "review", r=12, size=12)
        text(s, fx + 42, 177, t, size=15, weight=700, fill=INK)
        lines(s, fx + 16, 208, ls, size=12.5, lh=18, fill=BODY)
        if i < 3:
            arrow(s, f"M{fx + fw + 3},198 H{fx + fw + 23}", color=PAL["review"]["main"], sw=2)

    # очередь дня
    text(s, 820, 290, "ОЧЕРЕДЬ НА СЕГОДНЯ", size=12.5, weight=700, fill=MUTED, extra='letter-spacing="1.4"')
    queue = [("ai", "Learning-шаги", "вчерашние новые: шаги 1 мин → 10 мин", "2"),
             ("review", "Due из всех доменов вперемешку", "architecture · dotnet · angular · lang-pl чередуются",
              "18"),
             ("learn", "Новые", "не больше 10 в день; при бэклоге — пауза", "3")]
    for i, (pal, t, sub, n) in enumerate(queue):
        qy = 304 + i * 68
        c = PAL[pal]
        rect(s, 820, qy, 740, 58, r=12, fill=c["light"], stroke=c["mid"], sw=1.2)
        badge(s, 846, qy + 29, i + 1, pal, r=13, size=12.5)
        text(s, 872, qy + 25, t, size=15, weight=700, fill=INK)
        text(s, 872, qy + 45, sub, size=12.5, fill=BODY)
        text(s, 1540, qy + 37, n, size=22, weight=800, fill=c["dark"], anchor="end")
    text(s, 820, 524, "Варианты одной карточки и карточки одной idea — в разные дни (bury siblings)", size=12.5,
         fill=MUTED)

    # ветки
    text(s, 40, 582, "ДВЕ ЧАСТЫЕ СИТУАЦИИ", size=12.5, weight=700, fill=MUTED, extra='letter-spacing="1.4"')
    rows = [
        ("deepen", "Был перерыв", "без чувства вины", [
            ("14 дней без сессий", "расписание не сдвигается"),
            ("«Накопилось 180 ≈ 45 мин»", "план: 3 дня по 15 минут"),
            ("Режим «5 минут»", "сначала самое забываемое"),
            ("Новые на паузе", "пока бэклог > 2× нормы"),
            ("Бэклог разобран", "новые возвращаются плавно")]),
        ("ai", "Квиз в чате", "Claude Code, по подписке", [
            ("«Погоняй меня 10 минут»", "статус: due 18 ≈ 5 мин"),
            ("ИИ задаёт вопрос", "ответ скрыт до попытки"),
            ("Я отвечаю", "и ставлю уверенность"),
            ("ИИ сверяет с рубрикой", "и предлагает оценку"),
            ("Я подтверждаю оценку", "→ событие в журнал")]),
    ]
    for r_i, (pal, t, sub, steps) in enumerate(rows):
        ry, rh = 598 + r_i * 104, 80
        c = PAL[pal]
        rect(s, 40, ry, 200, rh, r=12, fill=c["light"], stroke=c["mid"], sw=1.2)
        text(s, 58, ry + 35, t, size=16, weight=800, fill=c["dark"])
        text(s, 58, ry + 57, sub, size=12, fill=MUTED)
        cw = (1308 - 4 * 6) / 5
        for i, (l1, l2) in enumerate(steps):
            x = 252 + i * (cw + 6)
            tip, notch = 18, (18 if i else 0)
            pts = [(x, ry), (x + cw - tip, ry), (x + cw, ry + rh / 2), (x + cw - tip, ry + rh),
                   (x, ry + rh), (x + notch, ry + rh / 2)]
            shade = c["main"] if i == 4 else WHITE
            s.add('<polygon points="' + " ".join(f"{px:.1f},{py:.1f}" for px, py in pts) +
                  f'" fill="{shade}" stroke="{c["mid"]}" stroke-width="1.3" stroke-linejoin="round" '
                  f'filter="url(#sh)"/>')
            tx = x + cw / 2 + (4 if i else -4)
            fg1 = WHITE if i == 4 else INK
            fg2 = WHITE if i == 4 else BODY
            text(s, tx, ry + 35, l1, size=13.5, weight=700, fill=fg1, anchor="middle")
            text(s, tx, ry + 56, l2, size=12.5, fill=fg2, anchor="middle")
    text(s, 40, 840, "Все оценки пишутся в reviews/<device>/<writer>-YYYY-MM.jsonl — расписание всегда можно "
                     "пересчитать (replay), а смена модели FSRS не теряет историю.", size=12.5, fill=MUTED)
    return s


def render_png(svg_path, w, h):
    chrome = next((c for c in ["google-chrome", "chromium", "chromium-browser"] if shutil.which(c)), None)
    if not chrome:
        print("Chrome/Chromium не найден: PNG пропущен")
        return
    png = svg_path.with_suffix(".png")
    subprocess.run([chrome, "--headless=new", "--no-sandbox", "--disable-gpu", "--hide-scrollbars",
                    "--force-device-scale-factor=2", f"--window-size={w},{h}", f"--screenshot={png}",
                    svg_path.as_uri()], check=True, capture_output=True)
    print("PNG:", png.name)


def main():
    for name, build in [("01-overview", overview), ("02-day0-capture", day0), ("03-review-session", review_session)]:
        s = build()
        p = OUT / f"{name}.svg"
        p.write_text(s.render(), encoding="utf-8")
        print("SVG:", p.name)
        render_png(p, s.w, s.h)


if __name__ == "__main__":
    main()
