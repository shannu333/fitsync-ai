from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.farm import Farm
from app.models.consent import SMSConsent
from app.schemas.user import UserProfileUpdate, UserPasswordUpdate, UserResponse
from app.schemas.farm import FarmUpdate, FarmResponse
from app.schemas.consent import ConsentResponse
from app.utils.auth import get_current_user, verify_password, get_password_hash

router = APIRouter(prefix="/user", tags=["Farmer Profile & Farms"])

@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update farmer personal details, district, mandal, village, or preferred language."""
    if data.full_name is not None:
        current_user.full_name = data.full_name.strip()
    if data.district is not None:
        current_user.district = data.district.strip()
    if data.mandal is not None:
        current_user.mandal = data.mandal.strip()
    if data.village is not None:
        current_user.village = data.village.strip()
    if data.preferred_language is not None:
        current_user.preferred_language = data.preferred_language

    db.commit()
    db.refresh(current_user)
    return current_user

@router.put("/password")
def change_password(
    data: UserPasswordUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Change account password."""
    if not verify_password(data.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password does not match"
        )
    current_user.hashed_password = get_password_hash(data.new_password)
    db.commit()
    return {"message": "Password updated successfully"}

@router.put("/farm/{farm_id}", response_model=FarmResponse)
def update_farm(
    farm_id: int,
    data: FarmUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a specific farm's details (sowing date, area, coordinates, variety)."""
    farm = db.query(Farm).filter(Farm.id == farm_id, Farm.user_id == current_user.id).first()
    if not farm:
        raise HTTPException(status_code=404, detail="Farm not found or does not belong to you")

    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(farm, field, value)

    db.commit()
    db.refresh(farm)
    return farm

@router.post("/consent", response_model=ConsentResponse)
def update_sms_consent(
    consent_given: bool,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Toggle SMS advisory alerts consent."""
    consent = db.query(SMSConsent).filter(SMSConsent.user_id == current_user.id).first()
    if not consent:
        consent = SMSConsent(
            user_id=current_user.id,
            consent_given=consent_given,
            sms_language=current_user.preferred_language
        )
        db.add(consent)
    else:
        consent.consent_given = consent_given
        consent.sms_language = current_user.preferred_language

    db.commit()
    db.refresh(consent)
    return consent
