---
id: capexe3a
type: basic
status: active
bloom: understand
grading: self
idea: sync-start
tags: [async]
origin: claude-code
created: 2026-11-25
---

# Синхронное начало async-метода

## Question

[C#] Что выведет этот код?

```csharp
async Task F()
{
    Console.Write("A");
    await Task.Delay(100);
    Console.Write("B");
}

var t = F();
Console.Write("C");
await t;
```

## Answer

`ACB`: до первого незавершённого `await` метод выполняется синхронно.

## Sources

- [Summary: Mental model](../summary.md#mental-model)
