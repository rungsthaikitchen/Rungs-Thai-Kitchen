"""Ephemeral Flask contract fixture; never connects to production or staging."""
import sys
from pathlib import Path
from types import SimpleNamespace
from flask import Flask
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))
from master_wok_routes import register_master_wok_routes

ORDER_ID = "00000000-0000-4000-8000-000000000001"
class Query:
    def __init__(self, rows):
        self.rows = rows
    def select(self, _): return self
    def eq(self, _, __): return self
    def limit(self, _): return self
    def execute(self): return SimpleNamespace(data=self.rows)
class Database:
    def table(self, name):
        if name == "orders":
            return Query([{"id": ORDER_ID, "total": "32.50", "status": "completed",
                           "paid": True, "capacity_scheduler": "LEGACY"}])
        if name == "order_payments": return Query([])
        raise AssertionError("Unexpected table")
class Gateway:
    def enabled(self): return False

app = Flask(__name__)
environ = {"LEGACY_PAYMENT_PREFLIGHT": "enabled",
           "MASTER_WOK_REVIEW_ADMIN_SECRET": "s" * 40,
           "RTK_PROXY_SECRET": "p" * 40}
register_master_wok_routes(app, environ, lambda response: response,
                           lambda *args, **kwargs: None,
                           gateway=Gateway(), legacy_database=Database())
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=18765, use_reloader=False)
