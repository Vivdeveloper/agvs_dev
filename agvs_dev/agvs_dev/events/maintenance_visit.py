import frappe
from frappe.utils import getdate, nowdate


def before_submit(doc, method=None):
    if doc.completion_status and not doc.get("custom_verified_by_customer"):
        frappe.throw(
            "Please capture the <b>Verified by Customer</b> signature before submitting."
        )


def on_submit(doc, method=None):
    _update_maintenance_schedule(doc)
    _create_consumed_items_stock_entry(doc)
    _auto_create_delivery_note(doc)


def _update_maintenance_schedule(doc):
    """Update Maintenance Schedule detail rows to Completed on submit."""
    if not doc.maintenance_schedule:
        return

    maint_date = getdate(doc.mntc_date)

    for d in doc.get("purposes") or []:
        if not d.maintenance_schedule_detail:
            continue
        try:
            update_vals = {
                "completion_status": "Completed",
                "actual_date": maint_date
            }
            if d.get("service_person"):
                update_vals["sales_person"] = d.service_person
            frappe.db.set_value(
                "Maintenance Schedule Detail",
                d.maintenance_schedule_detail,
                update_vals
            )
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Maintenance Schedule Detail update failed")

    # Mark whole schedule Completed if all rows done
    try:
        ms = frappe.get_doc("Maintenance Schedule", doc.maintenance_schedule)
        if all(row.completion_status == "Completed" for row in (ms.schedules or [])):
            frappe.db.set_value("Maintenance Schedule", doc.maintenance_schedule, "status", "Completed")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Maintenance Schedule status update failed")


def _create_consumed_items_stock_entry(doc):
    """Create a Material Issue Stock Entry for additional consumed items on submit."""
    consumed_rows = doc.get("custom_additional_consumed_items") or []
    if not consumed_rows:
        return

    warehouse = doc.get("custom_warehouse")
    if not warehouse:
        frappe.throw(
            "Please set <b>Warehouse</b> in the Additional Consumed Items section "
            "before submitting, as there are items to issue."
        )

    # Skip if already created for this visit
    if frappe.db.exists("Stock Entry", {
        "custom_maintenance_visit": doc.name,
        "stock_entry_type": "Material Issue",
        "docstatus": 1
    }):
        return

    items = []
    for row in consumed_rows:
        if not row.item_code or not (row.consumed_qty or 0) > 0:
            continue
        items.append({
            "item_code": row.item_code,
            "qty": row.consumed_qty,
            "uom": row.uom or "Nos",
            "s_warehouse": warehouse,
            "custom_maintenance_visit": doc.name
        })

    if not items:
        return

    se = frappe.get_doc({
        "doctype": "Stock Entry",
        "stock_entry_type": "Material Issue",
        "company": doc.company,
        "from_warehouse": warehouse,
        "custom_maintenance_visit": doc.name,
        "items": items
    })
    se.insert(ignore_permissions=True)
    se.submit()


def _auto_create_delivery_note(doc):
    """
    Auto-create a Delivery Note (draft) from employee warehouse → client
    if a Material Transfer SE (stores → employee) was created for this MV.
    """
    if not doc.customer:
        return

    # Find the submitted Material Transfer SE linked to this visit
    se_name = frappe.db.get_value(
        "Stock Entry",
        {
            "custom_maintenance_visit": doc.name,
            "stock_entry_type": "Material Transfer",
            "docstatus": 1
        },
        "name"
    )
    if not se_name:
        return

    # Skip if DN already created for this visit
    if frappe.db.exists("Delivery Note", {
        "custom_maintenance_visit": doc.name,
        "docstatus": ["!=", 2]
    }):
        return

    se_doc = frappe.get_doc("Stock Entry", se_name)
    employee_wh = se_doc.to_warehouse  # employee warehouse (target of the MT)

    dn_items = []
    for item in se_doc.items:
        if not item.item_code or not (item.qty or 0) > 0:
            continue
        # Try to get selling rate; fall back to 0
        rate = frappe.db.get_value(
            "Item Price",
            {"item_code": item.item_code, "selling": 1, "currency": frappe.defaults.get_global_default("currency")},
            "price_list_rate"
        ) or 0

        dn_items.append({
            "item_code":   item.item_code,
            "item_name":   item.item_name,
            "qty":         item.qty,
            "uom":         item.uom or "Nos",
            "rate":        rate,
            "warehouse":   employee_wh,
            "description": item.item_name or item.item_code
        })

    if not dn_items:
        return

    try:
        dn = frappe.get_doc({
            "doctype":                 "Delivery Note",
            "customer":                doc.customer,
            "company":                 doc.company,
            "posting_date":            nowdate(),
            "set_warehouse":           employee_wh,
            "custom_maintenance_visit": doc.name,
            "items":                   dn_items
        })
        dn.insert(ignore_permissions=True)
        # Save as draft — user reviews and submits manually
        frappe.msgprint(
            f"Delivery Note <b>{dn.name}</b> created as draft. "
            "Please review and submit it.",
            alert=True
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Auto Delivery Note creation failed")
