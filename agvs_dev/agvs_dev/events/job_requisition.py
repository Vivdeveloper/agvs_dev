import frappe

# DISABLED - job Requistion
def job_requistion(doc, method=None):
    existing = frappe.get_all(
        "Job Requisition",
        filters={
            "designation": doc.designation,
            "requested_by": doc.requested_by,
            "custom_locations": doc.custom_locations,
            "status": ["in", ["Open", "Open & Approved"]]
        },
        limit=1
    )
    
    if existing:
        frappe.throw(
            _("A Job Requisition already exists for this Role, Location, and Requester.")
        )


