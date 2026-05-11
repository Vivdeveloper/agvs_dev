import frappe

# DISABLED - Asset Maintenance Log call from asset item
def asset_maintenance_log_call_from_asset_item(doc, method=None):
    # Step 1: Get Asset from Asset Maintenance
    asset_id = ""
    
    if doc.asset_maintenance:
        am_doc = frappe.get_doc("Asset Maintenance", doc.asset_maintenance)
        asset_id = am_doc.asset
    
    # Step 2: Load Asset
    if asset_id:
        asset_doc = frappe.get_doc("Asset", asset_id)
    
        # Step 3: Clear child table in Asset Maintenance Log
        doc.set("custom_asset_maintenance_item", [])
    
        # Step 4: Copy rows from Asset child table
        for row in asset_doc.custom_asset_requirement_item:
            doc.append("custom_asset_maintenance_item", {
                "item_code": row.item_code,
                "capacity_qty": row.capacity_qty
            })


# Autogenerate Asset movement from visit
def autogenerate_asset_movement_from_visit(doc, method=None):
    # Run only for Demo Installation / Demo Uninstallation
    if doc.custom_visit_type not in ["Demo Installation", "Demo Uninstallation"]:
        frappe.throw("Asset Movement is allowed only for Demo Installation or Demo Uninstallation")
    
    # Asset validation
    if not doc.custom_asset:
        frappe.throw("Asset is required to create Asset Movement")
    
    # Target Location validation
    if not doc.custom_target_location:
        frappe.throw("Target Location is required to create Asset Movement")
    
    # Prevent duplicate Asset Movement
    if doc.custom_asset_movement:
        frappe.throw("Asset Movement is already created for this Visit Log")
    
    # Fetch Asset
    asset = frappe.get_doc("Asset", doc.custom_asset)
    
    source_location = asset.location
    target_location = doc.custom_target_location
    
    if not source_location:
        frappe.throw("Source Location is not set in Asset")
    
    if source_location == target_location:
        frappe.throw("Source and Target Location cannot be the same")
    
    # Create Asset Movement
    asset_movement = frappe.new_doc("Asset Movement")
    asset_movement.company = asset.company
    asset_movement.purpose = "Transfer"
    asset_movement.transaction_date = frappe.utils.now_datetime()
    
    asset_movement.append("assets", {
        "asset": asset.name,
        "source_location": source_location,
        "target_location": target_location
    })
    
    asset_movement.insert(ignore_permissions=True)
    asset_movement.submit()
    
    # Store Asset Movement reference in Visit Log
    doc.db_set("custom_asset_movement", asset_movement.name)


