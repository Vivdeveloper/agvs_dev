import frappe

def fetch_existing_balance(doc, method=None):
    if not doc.get("custom_asset_requirement_item"):
        return


