from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User
from app.models.farm import Farm
from app.models.consent import SMSConsent
from app.schemas.user import UserRegisterRequest, UserLoginRequest, UserResponse
from app.schemas.auth import Token
from app.utils.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user
)

router = APIRouter(prefix="/auth", tags=["Farmer Authentication & Registration"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(request: UserRegisterRequest, req: Request, db: Session = Depends(get_db)):
    """
    Register a new Andhra Pradesh rice farmer with farm coordinates/area,
    sowing date, language preference, and SMS consent.
    """
    # 1. Check if user already exists with this mobile number
    existing_user = db.query(User).filter(User.mobile_number == request.mobile_number).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A farmer account with this mobile number already exists. Please login."
        )

    # 2. Hash password
    hashed_pwd = get_password_hash(request.password)

    # 3. Create User record
    new_user = User(
        full_name=request.full_name.strip(),
        mobile_number=request.mobile_number.strip(),
        hashed_password=hashed_pwd,
        district=request.district.strip(),
        mandal=request.mandal.strip(),
        village=request.village.strip(),
        preferred_language=request.preferred_language,
        is_active=True
    )
    db.add(new_user)
    db.flush()  # Populates new_user.id

    # 4. Create primary Farm record
    primary_farm = Farm(
        user_id=new_user.id,
        farm_name=request.farm_name or "వరి పొలం (Main Rice Plot)",
        crop_type="Rice (వరి)",
        variety=request.variety or "BPT 5204 (Samba Mahsuri)",
        area_acres=request.area_acres,
        area_cents=request.area_cents or 0.0,
        latitude=request.latitude,
        longitude=request.longitude,
        sowing_date=request.sowing_date,
        soil_type=request.soil_type,
        irrigation_source=request.irrigation_source
    )
    db.add(primary_farm)

    # 5. Create SMS Consent record
    client_ip = req.client.host if req.client else None
    consent = SMSConsent(
        user_id=new_user.id,
        consent_given=request.sms_consent,
        sms_language=request.preferred_language,
        ip_address=client_ip
    )
    db.add(consent)

    db.commit()
    db.refresh(new_user)

    # 6. Generate access token
    access_token = create_access_token(subject=str(new_user.id))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": new_user
    }

@router.post("/login", response_model=Token)
def login(request: UserLoginRequest, db: Session = Depends(get_db)):
    """
    Authenticate farmer with mobile number and password, returning JWT access token.
    """
    user = db.query(User).filter(User.mobile_number == request.mobile_number).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect mobile number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect mobile number or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Farmer account is inactive. Please contact support."
        )

    access_token = create_access_token(subject=str(user.id))
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }

@router.get("/me", response_model=UserResponse)
def get_current_farmer_profile(current_user: User = Depends(get_current_user)):
    """
    Get current logged-in farmer's full profile, registered farms, and SMS consent status.
    """
    return current_user
