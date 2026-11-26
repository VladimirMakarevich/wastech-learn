---
id: c0a0v9nh
type: cloze
status: active
bloom: remember
grading: self
idea: aspnetcore-context
tags: [async, aspnet-core]
origin: claude-code
created: 2026-11-25
---

# Контекст синхронизации в ASP.NET Core

## Question

[ASP.NET Core] Здесь нет {{c1::SynchronizationContext}}, поэтому `.Result` не даёт классический дедлок.

## Answer

Продолжения выполняются в пуле потоков.

## Sources

- [Summary: Misconceptions](../summary.md#misconceptions)
