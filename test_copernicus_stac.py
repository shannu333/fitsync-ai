import httpx, json

# Search Copernicus Data Space Ecosystem STAC API for Sentinel-2 L2A data around AP coordinates
url = "https://catalogue.dataspace.copernicus.eu/stac/search"

# East Godavari coordinates: [81.78, 16.98, 81.79, 16.99]
payload = {
    "collections": ["SENTINEL-2"],
    "bbox": [81.70, 16.90, 81.85, 17.05],
    "datetime": "2026-08-01T00:00:00Z/2026-10-15T23:59:59Z",
    "limit": 10
}

try:
    print(f"Querying Copernicus STAC API: {url}...")
    with httpx.Client(timeout=20.0) as client:
        resp = client.post(url, json=payload)
        print("Status code:", resp.status_code)
        if resp.status_code == 200:
            data = resp.json()
            features = data.get("features", [])
            print(f"Found {len(features)} products:")
            for f in features[:3]:
                props = f.get("properties", {})
                print(f"ID: {f.get('id')}")
                print(f"  Datetime: {props.get('datetime')}")
                print(f"  Cloud Cover: {props.get('cloudCover') or props.get('eo:cloud_cover')}%")
                print(f"  Platform: {props.get('platform')}")
        else:
            print("Response:", resp.text[:300])
except Exception as e:
    print("Error querying CDSE STAC:", e)
