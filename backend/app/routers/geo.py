import json
import os
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, HTTPException, Query

router = APIRouter(prefix="/geo", tags=["Geographic & AP Agricultural Data"])

# Load AP Administrative data from JSON
DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "ap_admin_data.json")

def load_geo_data() -> Dict[str, Any]:
    try:
        with open(DATA_PATH, "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load AP geographic data: {str(e)}")

@router.get("/districts")
def get_districts():
    """Returns list of Andhra Pradesh districts with names in English and Telugu."""
    data = load_geo_data()
    districts = [
        {
            "code": d["code"],
            "name": d["name"],
            "name_te": d["name_te"],
            "headquarters": d.get("headquarters"),
            "agro_climatic_zone": d.get("agro_climatic_zone"),
            "mandal_count": len(d.get("mandals", []))
        }
        for d in data.get("districts", [])
    ]
    return districts

@router.get("/mandals")
def get_mandals(district: str = Query(..., description="Name or code of the AP District")):
    """Returns mandals for a specified Andhra Pradesh district."""
    data = load_geo_data()
    target = district.strip().lower()
    for d in data.get("districts", []):
        if d["name"].lower() == target or d["code"].lower() == target:
            return [
                {
                    "name": m["name"],
                    "name_te": m.get("name_te"),
                    "village_count": len(m.get("villages", []))
                }
                for m in d.get("mandals", [])
            ]
    raise HTTPException(status_code=404, detail=f"District '{district}' not found in Andhra Pradesh dataset")

@router.get("/villages")
def get_villages(
    district: str = Query(..., description="District name"),
    mandal: str = Query(..., description="Mandal name")
):
    """Returns villages for a specified district and mandal."""
    data = load_geo_data()
    dist_target = district.strip().lower()
    mandal_target = mandal.strip().lower()

    for d in data.get("districts", []):
        if d["name"].lower() == dist_target or d["code"].lower() == dist_target:
            for m in d.get("mandals", []):
                if m["name"].lower() == mandal_target:
                    return m.get("villages", [])
            raise HTTPException(status_code=404, detail=f"Mandal '{mandal}' not found in district '{district}'")
    raise HTTPException(status_code=404, detail=f"District '{district}' not found")

@router.get("/rice-varieties")
def get_rice_varieties():
    """Returns popular AP rice varieties and agronomic traits."""
    data = load_geo_data()
    return data.get("common_rice_varieties", [])

@router.get("/metadata")
def get_all_metadata():
    """Returns full metadata (districts, soil types, irrigation, rice varieties) for UI cache/offline support."""
    data = load_geo_data()
    return {
        "state": data.get("state", "Andhra Pradesh"),
        "districts": data.get("districts", []),
        "rice_varieties": data.get("common_rice_varieties", []),
        "soil_types": data.get("soil_types", []),
        "irrigation_sources": data.get("irrigation_sources", [])
    }
