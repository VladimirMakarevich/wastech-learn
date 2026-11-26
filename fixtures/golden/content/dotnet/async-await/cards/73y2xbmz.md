---
id: 73y2xbmz
type: scenario
status: active
bloom: analyze
grading: ai
idea: sync-over-async-deadlock
tags: [async, aspnet]
origin: claude-code
created: 2026-11-25
---

# Дедлок в классическом ASP.NET

## Question

[ASP.NET, .NET Framework] Действие контроллера вызывает `GetDataAsync().Result`, внутри — `await` без `ConfigureAwait(false)`. Запрос зависает навсегда. Почему?

## Answer

Продолжение ждёт захваченный контекст запроса, а его поток заблокирован `.Result` — взаимная блокировка.

## Rubric

- (!) Продолжение возвращается в захваченный SynchronizationContext
- (!) Поток этого контекста заблокирован `.Result`
- Исправление: async до самого верха или `ConfigureAwait(false)` в библиотеке

## Explanation

![Дедлок: продолжение ждёт контекст, занятый заблокированным потоком](../diagrams/deadlock.svg)

## Sources

- [Summary: Diagram](../summary.md#diagram)
