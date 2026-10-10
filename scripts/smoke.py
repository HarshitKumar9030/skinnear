"""HTTP integration checks against the local server; no credentials required."""
from __future__ import annotations
import argparse
import json
from urllib.error import HTTPError
from urllib.request import Request, urlopen

class SmokeChecks:
    def __init__(self, origin: str) -> None:
        self.origin = origin.rstrip("/")

    def post(self, path: str, payload: dict) -> tuple[int, dict]:
        request = Request(self.origin + path, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}, method="POST")
        try:
            with urlopen(request, timeout=35) as response:
                return response.status, json.load(response)
        except HTTPError as error:
            return error.code, json.load(error)

    def run(self) -> None:
        preferences = {"budget": 1500, "country": "GB", "currency": "INR", "city": "London", "pincode": "SW1A 1AA", "sensitive": False, "fragranceFree": True, "exclusions": [], "ownedCategories": []}
        payload = {"analysis": {"mode": "demo", "scores": [{"concern": "moisture", "score": 58}]}, "preferences": preferences, "excludedProductIds": []}
        status, routine = self.post("/api/routine", payload)
        assert status == 200 and routine["feasible"] and routine["total"] <= preferences["budget"], routine
        product_id = routine["items"][0]["product"]["id"]
        status, shopping = self.post("/api/shopping", {"productId": product_id, "city": "London", "country": "GB"})
        assert status == 200 and shopping["lookups"][0]["retailer"] == "google-shopping", shopping
        status, _ = self.post("/api/shopping", {"productId": product_id, "city": "London", "country": "GB", "retailer": "blinkit"})
        assert status == 400
        status, _ = self.post("/api/routine", {**payload, "preferences": {**preferences, "country": "XX"}})
        assert status == 400
        print("PASS: routine basket, international shopping, retailer scoping, country validation")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--origin", default="http://127.0.0.1:3000")
    SmokeChecks(parser.parse_args().origin).run()
