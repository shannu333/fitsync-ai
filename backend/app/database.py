from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

connect_args = {}
if settings.DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    # Import all models to ensure they are registered with Base.metadata before creating tables
    import app.models.user  # noqa: F401
    import app.models.farm  # noqa: F401
    import app.models.consent  # noqa: F401
    import app.models.weather_cache  # noqa: F401  ← Stage 3: weather cache table
    import app.models.satellite_cache  # noqa: F401  ← Stage 4: Sentinel-2 satellite table
    import app.models.sms_log  # noqa: F401  ← Stage 7: SMS logs table
    Base.metadata.create_all(bind=engine)
