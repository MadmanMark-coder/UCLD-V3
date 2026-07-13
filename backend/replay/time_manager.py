from datetime import datetime, timedelta, timezone


class TimeManager:
    def __init__(self, start_time: datetime | None = None, speed: int = 5):
        self._start_time = start_time or datetime.now(timezone.utc)
        self._real_start = datetime.now(timezone.utc)
        self._speed = max(1, min(speed, 30))
        self._virtual_time = self._start_time

    def tick(self) -> datetime:
        now = datetime.now(timezone.utc)
        elapsed = (now - self._real_start).total_seconds()
        self._virtual_time = self._start_time + timedelta(seconds=elapsed * self._speed)
        return self._virtual_time

    def get_current_time(self) -> datetime:
        return self._virtual_time

    def set_speed(self, multiplier: int):
        self.tick()
        self._start_time = self._virtual_time
        self._real_start = datetime.now(timezone.utc)
        self._speed = max(1, min(multiplier, 30))

    def reset(self, start_time: datetime | None = None):
        self._start_time = start_time or datetime.now(timezone.utc)
        self._real_start = datetime.now(timezone.utc)
        self._virtual_time = self._start_time
