---
id: c4tgqvdp
type: why
status: active
bloom: understand
grading: self
idea: aspnetcore-context
tags: [async, aspnet-core]
origin: claude-code
created: 2026-11-25
---

# Почему .Result плох и в ASP.NET Core

## Question

[ASP.NET Core] Почему `.Result` здесь всё равно плохая идея?

## Answer

Блокирует поток пула; под нагрузкой это ведёт к голоданию пула потоков.

## Sources

- [Summary: Misconceptions](../summary.md#misconceptions)
