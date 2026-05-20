import frappe


def on_submit(doc, method=None):
    _update_asset_status_from_movement(doc)

    mi_name = doc.get("custom_machine_installation")
    if not mi_name:
        return

    try:
        mi_doc = frappe.get_doc("Machine Installation and Un-Installation", mi_name)
    except Exception:
        return

    if (mi_doc.installation_type == "Installation" and doc.purpose == "Issue") or \
       (mi_doc.installation_type == "Demo Installation" and doc.purpose == "Transfer"):
        frappe.db.set_value(
            "Machine Installation and Un-Installation",
            mi_name,
            "asset_issue_done",
            1,
            update_modified=False
        )
    elif mi_doc.installation_type == "Uninstallation" and doc.purpose == "Receipt":
        frappe.db.set_value(
            "Machine Installation and Un-Installation",
            mi_name,
            "asset_transfer_done",
            1,
            update_modified=False
        )


def _update_asset_status_from_movement(doc):
    for row in (doc.assets or []):
        if not row.asset or not row.target_location:
            continue
        new_status = "Free" if row.target_location == "Office" else "Occupied"
        frappe.db.set_value(
            "Asset",
            row.asset,
            "custom_asset_status",
            new_status,
            update_modified=False
        )
