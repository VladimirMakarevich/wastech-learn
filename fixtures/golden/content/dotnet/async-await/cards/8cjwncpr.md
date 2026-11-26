---
id: 8cjwncpr
type: basic
status: active
bloom: remember
grading: self
idea: valuetask
tags: [async, performance]
origin: claude-code
created: 2026-11-25
---

# ValueTask для синхронного пути

## Question

[.NET async] Какой тип вернуть из горячего метода, который обычно завершается синхронно?

## Answer

`ValueTask<T>`: нет аллокации Task на синхронном пути.

## Sources

- [Summary: Comparison](../summary.md#comparison)
