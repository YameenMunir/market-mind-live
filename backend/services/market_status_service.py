from __future__ import annotations

from datetime import datetime, time, timedelta
from zoneinfo import ZoneInfo

from data.provider import infer_asset_type
from models.schemas import AssetType, MarketSession, MarketStatus

ET = ZoneInfo("America/New_York")

REGULAR_OPEN = time(9, 30)
REGULAR_CLOSE = time(16, 0)
PRE_MARKET_OPEN = time(4, 0)
AFTER_HOURS_CLOSE = time(20, 0)


def _next_weekday_at(dt: datetime, weekday: int, at: time) -> datetime:
    days_ahead = (weekday - dt.weekday()) % 7
    candidate = dt.replace(hour=at.hour, minute=at.minute, second=0, microsecond=0) + timedelta(days=days_ahead)
    if candidate <= dt:
        candidate += timedelta(days=7)
    return candidate


def _equity_like_status(now_et: datetime) -> tuple[MarketSession, str, datetime]:
    weekday = now_et.weekday()  # Mon=0 .. Sun=6
    t = now_et.time()

    if weekday >= 5:
        next_change = _next_weekday_at(now_et, 0, PRE_MARKET_OPEN)
        return MarketSession.CLOSED, "Market is currently closed for the weekend.", next_change

    if t < PRE_MARKET_OPEN:
        next_change = now_et.replace(hour=PRE_MARKET_OPEN.hour, minute=PRE_MARKET_OPEN.minute, second=0, microsecond=0)
        return MarketSession.CLOSED, "Market is currently closed.", next_change

    if PRE_MARKET_OPEN <= t < REGULAR_OPEN:
        next_change = now_et.replace(hour=REGULAR_OPEN.hour, minute=REGULAR_OPEN.minute, second=0, microsecond=0)
        return MarketSession.PRE_MARKET, "Pre-market trading session.", next_change

    if REGULAR_OPEN <= t < REGULAR_CLOSE:
        next_change = now_et.replace(hour=REGULAR_CLOSE.hour, minute=REGULAR_CLOSE.minute, second=0, microsecond=0)
        return MarketSession.OPEN, "Market is open.", next_change

    if REGULAR_CLOSE <= t < AFTER_HOURS_CLOSE:
        next_change = now_et.replace(hour=AFTER_HOURS_CLOSE.hour, minute=AFTER_HOURS_CLOSE.minute, second=0, microsecond=0)
        return MarketSession.AFTER_HOURS, "After-hours trading session.", next_change

    next_change = _next_weekday_at(now_et, (weekday + 1) % 7 if weekday < 4 else 0, PRE_MARKET_OPEN)
    return MarketSession.CLOSED, "Market is currently closed.", next_change


def _forex_status(now_et: datetime) -> tuple[MarketSession, str, datetime]:
    weekday = now_et.weekday()
    t = now_et.time()

    is_friday_after_close = weekday == 4 and t >= time(17, 0)
    is_weekend = weekday == 5 or (weekday == 6 and t < time(17, 0))

    if is_friday_after_close or is_weekend:
        next_change = _next_weekday_at(now_et, 6, time(17, 0))
        return MarketSession.CLOSED, "Forex market is closed for the weekend.", next_change

    next_change = _next_weekday_at(now_et, 4, time(17, 0))
    return MarketSession.OPEN, "Forex market is open (24/5).", next_change


def _commodity_status(now_et: datetime) -> tuple[MarketSession, str, datetime]:
    weekday = now_et.weekday()
    t = now_et.time()

    is_friday_after_close = weekday == 4 and t >= time(17, 0)
    is_weekend = weekday == 5 or (weekday == 6 and t < time(18, 0))
    daily_maintenance_break = time(17, 0) <= t < time(18, 0) and weekday not in (4,)

    if is_friday_after_close or is_weekend:
        next_change = _next_weekday_at(now_et, 6, time(18, 0))
        return MarketSession.CLOSED, "Futures market is closed for the weekend.", next_change

    if daily_maintenance_break:
        next_change = now_et.replace(hour=18, minute=0, second=0, microsecond=0)
        return MarketSession.CLOSED, "Futures market is in its daily maintenance break.", next_change

    next_change = now_et.replace(hour=17, minute=0, second=0, microsecond=0)
    if next_change <= now_et:
        next_change += timedelta(days=1)
    return MarketSession.OPEN, "Futures market is open.", next_change


def get_market_status(symbol: str, asset_type: AssetType | None = None) -> MarketStatus:
    resolved_type = asset_type or infer_asset_type(symbol)
    now_et = datetime.now(ET)

    if resolved_type == AssetType.CRYPTO:
        session, message = MarketSession.OPEN, "Crypto markets trade 24/7."
        next_change = None
    elif resolved_type == AssetType.FOREX:
        session, message, next_change_dt = _forex_status(now_et)
        next_change = next_change_dt.astimezone(ZoneInfo("UTC")).isoformat()
    elif resolved_type == AssetType.COMMODITY:
        session, message, next_change_dt = _commodity_status(now_et)
        next_change = next_change_dt.astimezone(ZoneInfo("UTC")).isoformat()
    else:
        session, message, next_change_dt = _equity_like_status(now_et)
        next_change = next_change_dt.astimezone(ZoneInfo("UTC")).isoformat()

    return MarketStatus(
        symbol=symbol.upper(),
        asset_type=resolved_type,
        session=session,
        is_open=session != MarketSession.CLOSED,
        message=message,
        next_change_utc=next_change,
    )
