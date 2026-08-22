import frappe
from erpnext.crm.doctype.opportunity.opportunity import Opportunity

class CustomOpportunity(Opportunity):
	def set_opportunity_type(self):
		pass
