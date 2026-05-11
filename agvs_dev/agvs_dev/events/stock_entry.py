import frappe


def on_submit(doc, method=None):
    mi_name = doc.get("custom_machine_installation")
    if not mi_name:
        return

    try:
        mi_doc = frappe.get_doc("Machine Installation and Un-Installation", mi_name)
    except Exception:
        return

    if mi_doc.installation_type in ("Installation", "Demo Installation") and doc.stock_entry_type == "Material Transfer":
        frappe.db.set_value(
            "Machine Installation and Un-Installation",
            mi_name,
            "material_issue_done",
            1,
            update_modified=False
        )
    elif mi_doc.installation_type == "Uninstallation" and doc.stock_entry_type == "Material Receipt":
        frappe.db.set_value(
            "Machine Installation and Un-Installation",
            mi_name,
            "material_transfer_done",
            1,
            update_modified=False
        )
