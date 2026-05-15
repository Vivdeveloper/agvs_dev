import frappe


def on_submit(doc, method=None):
    mi_name = doc.get("custom_machine_installation")
    if not mi_name:
        return

    try:
        mi_doc = frappe.get_doc("Machine Installation and Un-Installation", mi_name)
    except Exception:
        return

    if mi_doc.installation_type in ("Installation", "Demo Installation") and doc.purpose == "Issue":
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
