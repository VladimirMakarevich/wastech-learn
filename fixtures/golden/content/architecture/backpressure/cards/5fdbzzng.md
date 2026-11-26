---
id: 5fdbzzng
type: compare
status: active
bloom: analyze
grading: self
idea: channel-full-mode
tags: [backpressure, dotnet, channels]
origin: claude-code
created: 2026-11-25
---

# Channels: Wait vs DropOldest

## Question

[.NET Channels] `FullMode.Wait` vs `FullMode.DropOldest`: what does the writer experience?

## Answer

Wait: `WriteAsync` awaits free space. DropOldest: never waits; the oldest item is silently evicted.

## Sources

- [Summary: Worked example](../summary.md#worked-example)
