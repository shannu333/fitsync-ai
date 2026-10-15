import httpx

url = "https://catalogue.dataspace.copernicus.eu/stac/collections"
try:
    with httpx.Client(timeout=15.0) as client:
        resp = client.get(url)
        print("Status:", resp.status_code)
        if resp.status_code == 200:
            cols = resp.json().get("collections", [])
            print(f"Collections count: {len(cols)}")
            for c in cols:
                print("ID:", c.get("id"), "| Title:", c.get("title"))
except Exception as e:
    print("Error:", e)
