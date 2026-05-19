import frappe

def validate(doc, method=None):
	if doc.location:
		doc.custom_asset_status = "Free" if doc.location == "Office" else "Occupied"

def fetch_existing_balance(doc, method=None):
    if not doc.get("custom_asset_requirement_item"):
        return


