"""Local catalog maintenance. Validate first; seed MongoDB explicitly.

Usage: python scripts/catalog.py validate | seed
Dependencies for seed: pip install -r scripts/requirements.txt
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.parse import urlparse


class CatalogManager:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.path = root / "src" / "data" / "products.json"

    def validate(self) -> list[dict]:
        products = json.loads(self.path.read_text(encoding="utf-8"))
        ids: set[str] = set()
        categories: set[str] = set()
        for product in products:
            if product["id"] in ids:
                raise ValueError(f"Duplicate ID: {product['id']}")
            ids.add(product["id"])
            categories.add(product["category"])
            if product["referencePrice"] <= 0:
                raise ValueError("Planning prices must be positive")
            if product["priceKind"] != "planning estimate":
                raise ValueError("Bundled catalog must not imply live prices")
            if urlparse(product["sourceUrl"]).scheme != "https":
                raise ValueError("Every product needs an HTTPS source")
            if urlparse(product.get("imageUrl", "")).scheme != "https":
                raise ValueError("Every bundled product needs an HTTPS image")
            if not product.get("benefits"):
                raise ValueError("Every bundled product needs brand-described benefits")
            if product["ingredientsComplete"] and not product["ingredients"]:
                raise ValueError("Complete ingredient metadata needs a list")
        if not {"cleanser", "moisturizer", "sunscreen"}.issubset(categories):
            raise ValueError("Catalog must include all three essentials")
        if not categories.issubset({"cleanser", "moisturizer", "sunscreen", "serum", "retinoid"}):
            raise ValueError("Unknown product category")
        for product in products:
            if product["category"] in {"serum", "retinoid"} and not all(product.get(field) for field in ("treatmentGoal", "primaryActive", "usageNote")):
                raise ValueError("Optional treatments need a goal, primary active and usage note")
        print(f"Validated {len(products)} products across {len(categories)} categories.")
        return products

    def seed(self) -> None:
        from dotenv import load_dotenv
        from pymongo import MongoClient, UpdateOne

        load_dotenv(self.root / ".env.local")
        uri = os.environ.get("MONGODB_URI")
        if not uri:
            raise ValueError("Set MONGODB_URI in .env.local before seeding")
        products = self.validate()
        with MongoClient(uri, serverSelectionTimeoutMS=5000) as client:
            db = client[os.environ.get("MONGODB_DATABASE", "skinnear")]
            db.products.create_index("id", unique=True)
            result = db.products.bulk_write([
                UpdateOne({"id": product["id"]}, {"$set": product}, upsert=True)
                for product in products
            ])
            print(f"Seeded catalog: {result.upserted_count} inserted, {result.modified_count} updated.")


def main() -> None:
    parser = argparse.ArgumentParser(description="SkinNear local catalog manager")
    parser.add_argument("command", choices=["validate", "seed"])
    command = parser.parse_args().command
    manager = CatalogManager(Path(__file__).resolve().parents[1])
    try:
        getattr(manager, command)()
    except (ValueError, ImportError) as error:
        parser.exit(1, f"Catalog error: {error}\n")


if __name__ == "__main__":
    main()
