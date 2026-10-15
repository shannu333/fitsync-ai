import httpx, json

# Query Copernicus Data Space Ecosystem OData API
# Endpoint: https://catalogue.dataspace.copernicus.eu/odata/v1/Products
# Filter for Sentinel-2 L2A in Andhra Pradesh coordinates

lat = 16.9890
lng = 81.7840

# OData geo.intersects or bbox filter
# For point: OData supports OData filter with Attributes or footprint geometry
# e.g.: Collection/Name eq 'SENTINEL-2' and contains(Name, 'MSIL2A') and OData.CSC.Intersects(area=geography'SRID=4326;POINT(81.784 16.989)')
odata_url = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"
filter_query = f"Collection/Name eq 'SENTINEL-2' and contains(Name,'MSIL2A') and OData.CSC.Intersects(area=geography'SRID=4326;POINT({lng} {lat})')"

params = {
    "$filter": filter_query,
    "$orderby": "ContentDate/Start desc",
    "$top": 5,
    "$expand": "Attributes"
}

try:
    print(f"Querying CDSE OData API: {odata_url}...")
    with httpx.Client(timeout=25.0) as client:
        resp = client.get(odata_url, params=params)
        print("Status code:", resp.status_code)
        if resp.status_code == 200:
            data = resp.json()
            products = data.get("value", [])
            print(f"Successfully retrieved {len(products)} Sentinel-2 L2A products from Copernicus API:")
            for p in products:
                name = p.get("Name")
                date = p.get("ContentDate", {}).get("Start")
                attrs = {a.get("Name"): a.get("Value") for a in p.get("Attributes", [])}
                cloud_pct = attrs.get("cloudCover")
                orbit = attrs.get("orbitNumber")
                tile = attrs.get("tileId") or name.split("_")[5] if len(name.split("_")) > 5 else "N/A"
                print(f" - Product: {name}")
                print(f"   Date: {date} | Cloud: {cloud_pct}% | Tile: {tile}")
        else:
            print("Response:", resp.text[:400])
except Exception as e:
    print("Error:", e)
