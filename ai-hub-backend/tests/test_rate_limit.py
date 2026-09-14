"""The in-process limiter counts hits per key inside a sliding window."""

from app.services.rate_limit import SlidingWindowLimiter


class _Clock:
    def __init__(self):
        self.now = 1000.0

    def __call__(self):
        return self.now


def test_limiter_blocks_after_the_limit_within_the_window():
    limiter = SlidingWindowLimiter(limit=2, window_seconds=60, clock=_Clock())
    assert limiter.allow("ip")
    assert limiter.allow("ip")
    assert not limiter.allow("ip")
    assert limiter.allow("other-ip")


def test_limiter_allows_again_after_the_window_passes():
    clock = _Clock()
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60, clock=clock)
    assert limiter.allow("ip")
    clock.now += 61
    assert limiter.allow("ip")


def test_limiter_bounds_memory_by_clearing_when_full():
    limiter = SlidingWindowLimiter(limit=1, window_seconds=60, clock=_Clock(), max_keys=2)
    assert limiter.allow("a")
    assert limiter.allow("b")
    assert limiter.allow("c")  # table was full: cleared, then "c" recorded
    assert limiter.allow("a")  # "a" was forgotten by the clear
