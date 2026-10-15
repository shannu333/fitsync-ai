"""
WeatherCache SQLAlchemy model.
Stores daily weather observations per (lat_rounded, lng_rounded, date)
to avoid excessive Open-Meteo API calls.
"""
from datetime import datetime, date as date_type
from sqlalchemy import Column, Integer, Float, Date, DateTime, String
from app.database import Base


class WeatherCache(Base):
    __tablename__ = "weather_cache"

    id = Column(Integer, primary_key=True, index=True)

    # Coordinates rounded to 2 decimal places to group nearby farms
    lat = Column(Float, nullable=False, index=True)
    lng = Column(Float, nullable=False, index=True)

    # The calendar date this record represents
    obs_date = Column(Date, nullable=False, index=True)

    # Observed weather variables (from Open-Meteo)
    temp_max = Column(Float, nullable=True)          # °C
    temp_min = Column(Float, nullable=True)          # °C
    precipitation = Column(Float, nullable=True)     # mm
    solar_radiation = Column(Float, nullable=True)   # MJ/m²
    humidity = Column(Float, nullable=True)          # %

    # Source tracking
    source = Column(String(50), default="open-meteo")

    # When this row was fetched from the upstream API
    fetched_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    def __repr__(self):
        return (
            f"<WeatherCache lat={self.lat} lng={self.lng} "
            f"date={self.obs_date} tmax={self.temp_max}°C rain={self.precipitation}mm>"
        )
