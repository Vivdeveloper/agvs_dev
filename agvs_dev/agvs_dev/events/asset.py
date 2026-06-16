import frappe
from frappe import _

def validate(doc, method=None):
	if doc.location:
		doc.custom_asset_status = "Free" if doc.location == "Office" else "Occupied"

def validate_mandatory_on_submit(doc, method=None):
	"""Machine Model and Type of Location are mandatory only at submit time, not on save."""
	missing = []
	# Type of Location is not required when the asset is at the Office
	if doc.location != "Office" and not doc.custom_type_of_location:
		missing.append(_("Type of Location"))
	if not doc.custom_machine_model:
		missing.append(_("Machine Model"))
	if missing:
		frappe.throw(
			_("Please set {0} before submitting.").format(", ".join(missing)),
			title=_("Missing Mandatory Fields"),
		)

def fetch_existing_balance(doc, method=None):
    if not doc.get("custom_asset_requirement_item"):
        return


