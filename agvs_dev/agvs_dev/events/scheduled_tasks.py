import frappe

# Overdue Installation Status auto update
def overdue_installation_status_auto_update():
    records = frappe.get_all(
        "Machine Installation",
        filters={
            "planned_installation_date": ["<", frappe.utils.today()],
            "docstatus": 1
        },
        fields=["name"]
    )
    
    for r in records:
        doc = frappe.get_doc("Machine Installation", r.name)
    
        if (
            doc.planned_installation_date
            and not doc.actual_installation_date
        ):
            frappe.db.set_value("Machine Installation", r.name, "status", "Overdue Installation")
            frappe.db.commit()


# Overdue Uninstallation Status auto update
def overdue_uninstallation_status_auto_update():
    records = frappe.get_all(
        "Machine Installation",
        filters={
            "planned_uninstallation_date": ["<", frappe.utils.today()],
            "docstatus": 1
        },
        fields=["name"]
    )
    
    for r in records:
        doc = frappe.get_doc("Machine Installation", r.name)
    
        if (
            doc.planned_uninstallation_date 
            and not doc.actual_uninstallation_date
            and doc.continue_with_subscription == 0
        ):
            frappe.db.set_value("Machine Installation", r.name, "status", "Overdue Uninstallation")
            frappe.db.commit()


