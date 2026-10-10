"""Verify YouCam v2 authentication without uploading a photo or spending units."""
from __future__ import annotations

import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import HTTPRedirectHandler, Request, build_opener


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


class YouCamCheck:
    def __init__(self) -> None:
        config = {}
        env_file = Path(__file__).resolve().parents[1] / ".env.local"
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8-sig").splitlines():
                name, separator, value = line.partition("=")
                if separator and name.strip() in {"YOUCAM_API_KEY", "YOUCAM_API_BASE_URL"}:
                    config[name.strip()] = value.strip().strip("\"'")
        self.key = os.getenv("YOUCAM_API_KEY", config.get("YOUCAM_API_KEY", "")).strip()
        self.origin = os.getenv("YOUCAM_API_BASE_URL", config.get("YOUCAM_API_BASE_URL", "")) or "https://yce-api-01.makeupar.com"

    def run(self) -> None:
        if not self.key:
            raise SystemExit("Set YOUCAM_API_KEY in .env.local first.")
        origin = urlparse(self.origin)
        if origin.scheme != "https" or not origin.hostname or origin.username or origin.password or origin.path not in {"", "/"} or origin.query or origin.fragment:
            raise SystemExit("YOUCAM_API_BASE_URL must be an HTTPS origin without a path.")
        request = Request(self.origin.rstrip("/") + "/s2s/v2.0/credit/feature-cost", headers={"Authorization": "Bearer " + self.key})
        try:
            with build_opener(NoRedirects()).open(request, timeout=25) as response:
                payload = json.load(response)
            if payload.get("status", 200) != 200 or not isinstance(payload.get("result", {}).get("skus"), list):
                raise SystemExit("YouCam returned an unexpected response; check account configuration.")
        except HTTPError as error:
            raise SystemExit(f"YouCam authentication check failed (HTTP {error.code}). Check your API key and account access.") from None
        except (URLError, ValueError):
            raise SystemExit("YouCam could not be reached or returned an unreadable response.") from None
        print("PASS: YouCam v2 API key accepted. No photo uploaded and no analysis units spent.")


if __name__ == "__main__":
    YouCamCheck().run()
