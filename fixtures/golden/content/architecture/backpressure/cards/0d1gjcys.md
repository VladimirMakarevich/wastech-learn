---
id: 0d1gjcys
type: why
status: active
bloom: understand
grading: self
idea: demand-signal
tags: [backpressure, reactive-streams]
origin: claude-code
created: 2026-11-25
---

# Why a consumer signals demand

## Question

[Streaming] Why does a consumer signal demand to the producer?

## Answer

So the producer never sends more than the consumer can buffer and process.

## Explanation

![Demand flow: the consumer requests n items, the producer sends at most n](../diagrams/demand-flow.svg)

## Sources

- [Summary: Diagram](../summary.md#diagram)
