import frappe
from erpnext.crm.doctype.opportunity.opportunity import Opportunity


def get_lead_name(doc):
	if doc.get("opportunity_from") == "Lead" and doc.get("party_name"):
		return doc.party_name
	if doc.get("custom_lead_link"):
		return doc.custom_lead_link
	return None


def link_lead_contacts_and_addresses_to_doc(lead_name, target_doctype, target_name):
	links = frappe.get_all(
		"Dynamic Link",
		filters={"link_doctype": "Lead", "link_name": lead_name},
		fields=["parent", "parenttype"],
	)

	for link in links:
		if link["parenttype"] not in ("Contact", "Address"):
			continue

		linked_doc = frappe.get_doc(link["parenttype"], link["parent"])
		if linked_doc.has_link(target_doctype, target_name):
			continue

		linked_doc.append(
			"links",
			{"link_doctype": target_doctype, "link_name": target_name},
		)
		linked_doc.save(ignore_permissions=True)


def copy_same_named_fields(doc, lead):
	"""Copy all fields that have the same fieldname on both Lead and Opportunity (including custom fields)."""
	opp_fields = {f.fieldname for f in doc.meta.get("fields")}
	lead_fields = {f.fieldname for f in lead.meta.get("fields")}
	common = opp_fields.intersection(lead_fields)

	allowed_types = {
		"Data", "Select", "Link", "Small Text", "Text",
		"Int", "Float", "Currency", "Check", "Date", "Datetime",
	}

	excluded_fields = {"opportunity_type"}
	lead_fieldtypes = {f.fieldname: f.fieldtype for f in lead.meta.get("fields")}

	for fieldname in common:
		if fieldname in excluded_fields:
			continue
		if lead_fieldtypes.get(fieldname) in allowed_types:
			val = lead.get(fieldname)
			if val is not None and val != "" and not doc.get(fieldname):
				doc.set(fieldname, val)


def copy_special_mappings(doc, lead):
	"""Map fields that have different names between Lead and Opportunity."""
	mapping = {
		"customer_name": lead.get("company_name") or lead.get("lead_name"),
		"contact_person": lead.get("first_name") or lead.get("lead_name"),
		"contact_email": lead.get("email_id"),
		"contact_mobile": lead.get("mobile_no"),
		"phone": lead.get("phone"),
		"website": lead.get("website"),
		"industry": lead.get("industry"),
		"territory": lead.get("territory"),
		"no_of_employees": lead.get("no_of_employees"),
		"annual_revenue": lead.get("annual_revenue"),
		"source": lead.get("source"),
	}

	for target_field, value in mapping.items():
		if value and not doc.get(target_field):
			doc.set(target_field, value)


def lead_to_opportunity(doc, method=None):
	"""Copy Lead field values when an Opportunity is created from a Lead."""
	lead_name = get_lead_name(doc)
	if not lead_name:
		return

	lead = frappe.get_doc("Lead", lead_name)

	if not doc.get("opportunity_from"):
		doc.opportunity_from = "Lead"

	copy_same_named_fields(doc, lead)
	copy_special_mappings(doc, lead)

	if hasattr(lead, "lead_owner") and not doc.get("opportunity_owner"):
		doc.opportunity_owner = lead.lead_owner


class CustomOpportunity(Opportunity):
	def set_opportunity_type(self):
		pass

	def after_insert(self):
		super().after_insert()
		self.copy_lead_address()

	def copy_lead_address(self):
		lead_name = get_lead_name(self)
		if not lead_name:
			return

		link_lead_contacts_and_addresses_to_doc(lead_name, self.doctype, self.name)
