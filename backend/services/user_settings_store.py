"""Database-backed, device-scoped dashboard preferences (Simple/Advanced mode today,
room for more per-device settings later without a schema rethink)."""

from __future__ import annotations

from sqlmodel import Session

from db.models import UserSettingsRecord
from db.session import engine
from models.schemas import UserSettings


class UserSettingsStore:
    def get(self, device_id: str) -> UserSettings:
        with Session(engine) as session:
            record = session.get(UserSettingsRecord, device_id)
        if record is None:
            return UserSettings()
        return UserSettings(experience_mode=record.experience_mode)

    def update(self, device_id: str, experience_mode: str) -> UserSettings:
        with Session(engine) as session:
            record = session.get(UserSettingsRecord, device_id)
            if record is None:
                record = UserSettingsRecord(device_id=device_id, experience_mode=experience_mode)
            else:
                record.experience_mode = experience_mode
            session.add(record)
            session.commit()
        return UserSettings(experience_mode=experience_mode)


user_settings_store = UserSettingsStore()
