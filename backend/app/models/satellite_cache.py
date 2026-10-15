"""
SatelliteObservation SQLAlchemy model — Stage 4
Stores Sentinel-2 L2A satellite observations, spectral band reflectance values,
and derived indices (NDVI, NDMI, NDWI) with cloud masking flags.
"""
from datetime import datetime
from sqlalchemy import Column, Integer, Float, DateTime, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class SatelliteObservation(Base):
    __tablename__ = "satellite_observations"

    id = Column(Integer, primary_key=True, index=True)
    farm_id = Column(Integer, ForeignKey("farms.id", ondelete="CASCADE"), nullable=True, index=True)

    # Coordinates
    lat = Column(Float, nullable=False, index=True)
    lng = Column(Float, nullable=False, index=True)

    # Copernicus Sentinel-2 metadata
    granule_id = Column(String(120), nullable=False, index=True)
    tile_id = Column(String(20), nullable=True)  # e.g. 44QND
    platform = Column(String(20), default="SENTINEL-2")  # S2A, S2B, S2C
    observation_date = Column(DateTime, nullable=False, index=True)
    cloud_coverage_pct = Column(Float, nullable=False)
    is_cloud_masked = Column(Boolean, default=False, nullable=False)

    # Spectral band reflectance values (Sentinel-2 L2A surface reflectance)
    b03_green = Column(Float, nullable=True)  # 560 nm (Green)
    b04_red = Column(Float, nullable=True)    # 665 nm (Red)
    b08_nir = Column(Float, nullable=True)    # 842 nm (Near-Infrared)
    b11_swir = Column(Float, nullable=True)   # 1610 nm (Short-Wave Infrared)

    # Calculated Indices
    ndvi = Column(Float, nullable=True)  # (B08 - B04) / (B08 + B04)
    ndmi = Column(Float, nullable=True)  # (B08 - B11) / (B08 + B11)
    ndwi = Column(Float, nullable=True)  # (B03 - B08) / (B03 + B08)

    # Status interpretation
    health_status = Column(String(50), default="Healthy")  # Optimal, Moderate Stress, High Stress, Cloud Obscured
    data_source = Column(String(50), default="Copernicus CDSE")

    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationship
    farm = relationship("Farm", foreign_keys=[farm_id])

    def __repr__(self):
        return (
            f"<SatelliteObservation granule={self.granule_id} "
            f"date={self.observation_date} NDVI={self.ndvi} Cloud={self.cloud_coverage_pct}%>"
        )
