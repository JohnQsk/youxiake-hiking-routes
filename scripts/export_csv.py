"""Export one CSV row per route option, using only the Python standard library."""
import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data" / "routes.json"
OUTPUT = ROOT / "routes.csv"

FIELDS = [
    "id", "name", "departure_city", "days", "drive_min_minutes",
    "drive_max_minutes", "drive_text", "option_key", "option_label",
    "distance_km", "ascent_m", "option_note", "source_url", "checked_at",
]

with DATA.open(encoding="utf-8") as handle:
    dataset = json.load(handle)

with OUTPUT.open("w", encoding="utf-8-sig", newline="") as handle:
    writer = csv.DictWriter(handle, fieldnames=FIELDS)
    writer.writeheader()
    for route in dataset["routes"]:
        for option in route["hiking_options"]:
            writer.writerow({
                "id": route["id"],
                "name": route["name"],
                "departure_city": route["departure_city"],
                "days": route["days"],
                "drive_min_minutes": route["drive_time"]["min_minutes"],
                "drive_max_minutes": route["drive_time"]["max_minutes"],
                "drive_text": route["drive_time"]["text"],
                "option_key": option["key"],
                "option_label": option["label"],
                "distance_km": option["distance_km"],
                "ascent_m": option["ascent_m"],
                "option_note": option["note"],
                "source_url": route["source_url"],
                "checked_at": route["checked_at"],
            })

print(f"Exported {len(dataset['routes'])} routes to {OUTPUT.name}")
