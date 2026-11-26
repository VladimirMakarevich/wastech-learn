---
title: Async/await в .NET
domain: dotnet
lang: ru
status: active
familiarity: familiar
created: 2026-11-25
origin: claude-code
tags: [async, threading]
related: [architecture/backpressure]
---

# Async/await в .NET

## Key idea

`await` не блокирует поток: метод возвращается вызывающему, а продолжение запускается позже — в захваченном контексте синхронизации, если он есть.

## Pretest

Вопросы до объяснения. Ответы и уверенность (1–3) записываются при захвате.

1. В каком потоке выполняется код после `await`?
2. Почему `.Result` в классическом ASP.NET может повесить запрос?
3. Когда `ValueTask` лучше `Task`?

## Cards

- [Зачем ConfigureAwait(false) в библиотеке](cards/7388t2qp.md)
- [Дедлок в классическом ASP.NET](cards/73y2xbmz.md)
- [async void против async Task](cards/7ws01vt6.md)
- [ValueTask для синхронного пути](cards/8cjwncpr.md)
- [Контекст синхронизации в ASP.NET Core](cards/c0a0v9nh.md)
- [Почему .Result плох и в ASP.NET Core](cards/c4tgqvdp.md)
- [Синхронное начало async-метода](cards/capexe3a.md)
- [Sync-over-async](cards/dsz616wb.md)
