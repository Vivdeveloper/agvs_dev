import frappe

DT = "Machine Installation and Un-Installation"


def overdue_installation_status_auto_update():
    """Mark Installation MIs as Overdue Installation if planned date passed and not yet Installed."""
    records = frappe.get_all(
        DT,
        filters={
            "installation_type": "Installation",
            "planned_installation_date": ["<", frappe.utils.today()],
            "status": "Open",
            "docstatus": 1
        },
        fields=["name"]
    )
    for r in records:
        frappe.db.set_value(DT, r.name, "status", "Overdue Installation", update_modified=False)
    if records:
        frappe.db.commit()


def overdue_uninstallation_status_auto_update():
    """Mark Uninstallation / Demo Installation MIs as Overdue Uninstallation if planned date passed."""
    # Uninstallation MI: still Open past planned_uninstallation_date
    uninstall_records = frappe.get_all(
        DT,
        filters={
            "installation_type": "Uninstallation",
            "planned_uninstallation_date": ["<", frappe.utils.today()],
            "status": "Open",
            "docstatus": 1
        },
        fields=["name"]
    )
    for r in uninstall_records:
        frappe.db.set_value(DT, r.name, "status", "Overdue Uninstallation", update_modified=False)

    # Demo Installation MI: Demo Installation done but Uninstallation overdue
    demo_records = frappe.get_all(
        DT,
        filters={
            "installation_type": "Demo Installation",
            "planned_uninstallation_date": ["<", frappe.utils.today()],
            "status": "Demo Installation Completed",
            "docstatus": 1
        },
        fields=["name"]
    )
    for r in demo_records:
        frappe.db.set_value(DT, r.name, "status", "Overdue Uninstallation", update_modified=False)

    if uninstall_records or demo_records:
        frappe.db.commit()
