"""Lightweight load/stress tester for the API's most important endpoints - no new
dependency beyond `httpx` (already required by the app itself for the Gemini client).

Not a pytest test: it drives a *running* server over real HTTP/websocket-adjacent REST
calls to observe end-to-end behaviour (caching, rate limiting, DB contention) the way a
real client would, which a mocked-provider pytest suite deliberately doesn't exercise.

Usage (from backend/, with the app already running, e.g. `uvicorn main:app`):

    python scripts/load_test.py --scenario normal --duration 30 --concurrency 20
    python scripts/load_test.py --scenario spike --base-concurrency 5 --spike-concurrency 100
    python scripts/load_test.py --scenario sustained --duration 300 --concurrency 30

Scenarios:
  normal     Steady concurrency for `--duration` seconds - baseline latency/throughput.
  spike      Low concurrency, a short high-concurrency burst, then back to low - checks
             the app degrades gracefully (429s, not crashes/hangs) under a sudden spike
             and that latency recovers to baseline afterward.
  sustained  Moderate concurrency held for a longer duration - checks for latency drift
             or a rising error rate that would indicate a leak (connection pool
             exhaustion, unbounded cache growth, accumulating background tasks).

CPU/memory/DB-connection-count are NOT measured here (no extra process-inspection
dependency) - run alongside an OS-level monitor (Task Manager, `docker stats`, or the
process's own RSS via `/proc/<pid>/status` on Linux) for those, per the deployment
guidance in the optimization summary.
"""

from __future__ import annotations

import argparse
import asyncio
import random
import statistics
import time
from dataclasses import dataclass, field

import httpx

DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "TSLA", "BTC-USD"]


@dataclass
class Sample:
    endpoint: str
    status: int
    duration_ms: float
    error: str | None = None


@dataclass
class Results:
    samples: list[Sample] = field(default_factory=list)

    def add(self, sample: Sample) -> None:
        self.samples.append(sample)

    def summarize(self, label: str) -> None:
        if not self.samples:
            print(f"\n[{label}] no samples collected")
            return
        durations = sorted(s.duration_ms for s in self.samples)
        errors = [s for s in self.samples if s.error or s.status >= 500]
        rate_limited = [s for s in self.samples if s.status == 429]
        total = len(self.samples)

        def pct(p: float) -> float:
            idx = min(int(len(durations) * p), len(durations) - 1)
            return durations[idx]

        print(f"\n[{label}] requests={total} "
              f"errors={len(errors)} ({len(errors) / total * 100:.1f}%) "
              f"rate_limited={len(rate_limited)} ({len(rate_limited) / total * 100:.1f}%)")
        print(f"  latency ms: p50={pct(0.50):.1f} p90={pct(0.90):.1f} "
              f"p95={pct(0.95):.1f} p99={pct(0.99):.1f} max={durations[-1]:.1f} "
              f"mean={statistics.mean(durations):.1f}")
        by_endpoint: dict[str, list[float]] = {}
        for s in self.samples:
            by_endpoint.setdefault(s.endpoint, []).append(s.duration_ms)
        for endpoint, values in sorted(by_endpoint.items()):
            values.sort()
            print(f"    {endpoint:35s} n={len(values):5d} p50={values[len(values) // 2]:7.1f}ms "
                  f"max={values[-1]:7.1f}ms")


# Each entry: (weight, method, path_template). Weighted to roughly mirror
# frontend/src/hooks/useLiveSnapshot.ts's real poll mix (quote/status polled far more
# often than indicators/prediction/risk, which refresh on a much slower cadence).
_ENDPOINT_MIX = [
    (5, "GET", "/api/prices/{symbol}/quote"),
    (3, "GET", "/api/market/{symbol}/status"),
    (2, "GET", "/api/prices/{symbol}/candles?range=1d"),
    (1, "GET", "/api/indicators/{symbol}"),
    (1, "GET", "/api/predictions/{symbol}"),
    (1, "GET", "/api/risk/{symbol}"),
    (1, "GET", "/api/alerts"),
    (1, "GET", "/api/health"),
]


def _pick_request() -> tuple[str, str]:
    total = sum(w for w, _, _ in _ENDPOINT_MIX)
    r = random.uniform(0, total)
    upto = 0.0
    for weight, method, template in _ENDPOINT_MIX:
        upto += weight
        if r <= upto:
            symbol = random.choice(DEFAULT_SYMBOLS)
            return method, template.format(symbol=symbol)
    return "GET", "/api/health"


async def _one_request(client: httpx.AsyncClient, results: Results) -> None:
    method, path = _pick_request()
    start = time.perf_counter()
    try:
        response = await client.request(method, path)
        duration_ms = (time.perf_counter() - start) * 1000
        results.add(Sample(endpoint=path.split("?")[0], status=response.status_code, duration_ms=duration_ms))
    except Exception as exc:  # network error, timeout, connection refused, ...
        duration_ms = (time.perf_counter() - start) * 1000
        results.add(Sample(endpoint=path.split("?")[0], status=0, duration_ms=duration_ms, error=str(exc)))


async def _run_concurrency_for(
    client: httpx.AsyncClient, results: Results, concurrency: int, duration_seconds: float
) -> None:
    deadline = time.monotonic() + duration_seconds

    async def worker() -> None:
        while time.monotonic() < deadline:
            await _one_request(client, results)

    await asyncio.gather(*(worker() for _ in range(concurrency)))


async def run_normal(base_url: str, concurrency: int, duration: float) -> None:
    results = Results()
    async with httpx.AsyncClient(base_url=base_url, timeout=10.0) as client:
        await _run_concurrency_for(client, results, concurrency, duration)
    results.summarize(f"normal: concurrency={concurrency} duration={duration}s")


async def run_sustained(base_url: str, concurrency: int, duration: float) -> None:
    results = Results()
    async with httpx.AsyncClient(base_url=base_url, timeout=10.0) as client:
        await _run_concurrency_for(client, results, concurrency, duration)

    # Split into first/last third to make latency drift over the run visible.
    n = len(results.samples)
    if n >= 6:
        first_third = Results(results.samples[: n // 3])
        last_third = Results(results.samples[-(n // 3):])
        first_third.summarize("sustained: first third (baseline)")
        last_third.summarize("sustained: last third (drift check)")
    results.summarize(f"sustained: concurrency={concurrency} duration={duration}s (overall)")


async def run_spike(base_url: str, base_concurrency: int, spike_concurrency: int, spike_duration: float) -> None:
    baseline_before = Results()
    spike = Results()
    baseline_after = Results()
    async with httpx.AsyncClient(base_url=base_url, timeout=10.0) as client:
        print(f"Warming up at baseline concurrency={base_concurrency} for 10s...")
        await _run_concurrency_for(client, baseline_before, base_concurrency, 10)

        print(f"Spiking to concurrency={spike_concurrency} for {spike_duration}s...")
        await _run_concurrency_for(client, spike, spike_concurrency, spike_duration)

        print(f"Recovery check at baseline concurrency={base_concurrency} for 10s...")
        await _run_concurrency_for(client, baseline_after, base_concurrency, 10)

    baseline_before.summarize("spike: before (baseline)")
    spike.summarize(f"spike: during (concurrency={spike_concurrency})")
    baseline_after.summarize("spike: after (recovery check - should look like 'before')")

    if baseline_before.samples and baseline_after.samples:
        before_p50 = statistics.median(s.duration_ms for s in baseline_before.samples)
        after_p50 = statistics.median(s.duration_ms for s in baseline_after.samples)
        ratio = after_p50 / before_p50 if before_p50 else float("inf")
        verdict = "RECOVERED" if ratio < 1.5 else "DEGRADED - latency did not return to baseline"
        print(f"\nRecovery verdict: before p50={before_p50:.1f}ms after p50={after_p50:.1f}ms "
              f"ratio={ratio:.2f}x -> {verdict}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--base-url", default="http://127.0.0.1:8000")
    parser.add_argument("--scenario", choices=["normal", "spike", "sustained"], default="normal")
    parser.add_argument("--concurrency", type=int, default=20, help="normal/sustained: concurrent workers")
    parser.add_argument("--duration", type=float, default=30.0, help="normal/sustained: seconds to run")
    parser.add_argument("--base-concurrency", type=int, default=5, help="spike: baseline concurrency")
    parser.add_argument("--spike-concurrency", type=int, default=100, help="spike: burst concurrency")
    parser.add_argument("--spike-duration", type=float, default=10.0, help="spike: burst duration in seconds")
    args = parser.parse_args()

    if args.scenario == "normal":
        asyncio.run(run_normal(args.base_url, args.concurrency, args.duration))
    elif args.scenario == "sustained":
        asyncio.run(run_sustained(args.base_url, args.concurrency, args.duration))
    else:
        asyncio.run(run_spike(args.base_url, args.base_concurrency, args.spike_concurrency, args.spike_duration))


if __name__ == "__main__":
    main()
