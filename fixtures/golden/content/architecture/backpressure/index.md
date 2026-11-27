---
title: Backpressure
domain: architecture
lang: en
status: active
familiarity: new
created: 2026-11-25
origin: claude-code
tags: [streaming, reliability]
related: [dotnet/async-await]
---

# Backpressure

## Key idea

A slow consumer must be able to slow down a fast producer; otherwise a buffer between them grows until memory runs out.

## Pretest

Questions asked before the explanation. Answers and confidence (1-3) are filled in during capture.

1. What breaks first when a producer is faster than its consumer?
2. Is a bigger buffer a fix for a slow consumer?
3. How does TCP keep a fast sender from flooding a slow receiver?

## Cards

- [Why a consumer signals demand](cards/0d1gjcys.md)
- [Reactive Streams: requesting items](cards/10dkrwp7.md)
- [Buffering vs dropping](cards/1mpw75f3.md)
- [Kafka consumer lag and OOM](cards/1rd53181.md)
- [TCP flow control window](cards/2by9881r.md)
- [Unbounded queue](cards/41tzszha.md)
- [Rate limiting is not backpressure](cards/48431e5b.md)
- [Load shedding](cards/56z99ms4.md)
- [Channels: Wait vs DropOldest](cards/5fdbzzng.md)
- [Channels: TryWrite on a full channel](cards/647aga38.md)
