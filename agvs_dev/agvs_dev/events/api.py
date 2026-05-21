import frappe
from frappe import _




# create_strength_item
@frappe.whitelist()
def create_strength_item(**kwargs):
    # Read inputs
    item_name = frappe.form_dict.item_name
    strength = frappe.form_dict.strength
    
    # Fetch original item
    original = frappe.get_doc("Item", item_name)
    
    # Build new item code
    base = original.item_code
    parts = base.split("-")
    
    # remove last alphabet suffix (A/B/C etc)
    if parts[-1].isalpha():
        parts = parts[:-1]
    
    new_code = "-".join(parts) + "-" + strength
    
    # ---------------------------------------
    # 1️⃣ Check for duplicate Item Code
    # ---------------------------------------
    if frappe.db.exists("Item", new_code):
        frappe.response["message"] = {
            "exists": True,
            "name": new_code,
            "reason": "Duplicate Item Code"
        }
    else:
        # ---------------------------------------
        # 2️⃣ Check for duplicate Item Name
        # ---------------------------------------
        if frappe.db.exists("Item", {"item_name": new_code}):
            frappe.response["message"] = {
                "exists": True,
                "name": new_code,
                "reason": "Duplicate Item Name"
            }
        else:
            # ---------------------------------------
            # 3️⃣ Create New Item
            # ---------------------------------------
            doc = frappe.new_doc("Item")
            doc.name = new_code
            doc.item_code = new_code
            doc.item_name = new_code
            doc.description = new_code
            doc.item_group = original.item_group
            doc.gst_hsn_code = original.gst_hsn_code
            doc.custom_scent_family = original.custom_scent_family
            doc.custom_strength_level = strength
            doc.set_name = new_code  # force custom name
            
            doc.db_insert()
            doc.save()
    
            # commit required because ORM not used
            frappe.db.commit()
    
            frappe.response["message"] = {
                "exists": False,
                "name": new_code,
                "reason": "Created Successfully"
            }


# data in maintenance schedule
@frappe.whitelist()
def data_in_maintenance_schedule(**kwargs):
    mi_name = frappe.form_dict.get("machine_installation")
    
    result = []
    
    if mi_name:
        mi = frappe.get_doc("Machine Installation and Un-Installation", mi_name)
    
        for row in mi.machine_items:
    
            if not row.asset:
                continue
    
            asset = frappe.get_doc("Asset", row.asset)
    
            if not asset.custom_asset_requirement_item:
                continue
    
            for req in asset.custom_asset_requirement_item:
    
                if not req.item_code or not req.required_qty:
                    continue
    
                result.append({
                    "asset": row.asset,
                    "asset_name": asset.asset_name,
                    "item_code": req.item_code,
                    "qty": req.required_qty
                })
    
    # ✅ THIS is how you send data back
    frappe.response["message"] = result


# DISABLED - get_asset_requirement_items_in_maintenance_schedule
@frappe.whitelist()
def get_asset_requirement_items_in_maintenance_schedule(**kwargs):
    mi_name = (
        frappe.local.form_dict.get("machine_installation")
        or frappe.request.args.get("machine_installation")
    )
    
    result = []
    
    if mi_name:
        mi = frappe.get_doc("Machine Installation and Un-Installation", mi_name)
    
        machine_items     = mi.get("machine_items") or []
        requirement_items = mi.get("table_uuer")    or []
    
        max_len = max(len(machine_items), len(requirement_items))
    
        for i in range(max_len):
            row = {}
    
            if i < len(machine_items):
                row["asset"]      = machine_items[i].asset      or ""
                row["asset_name"] = machine_items[i].asset_name or ""
            else:
                row["asset"]      = ""
                row["asset_name"] = ""
    
            if i < len(requirement_items):
                row["item_code"] = requirement_items[i].item_code   or ""
                row["qty"]       = requirement_items[i].required_qty or 0
            else:
                row["item_code"] = ""
                row["qty"]       = 0
    
            result.append(row)
    
    frappe.response["message"] = result


