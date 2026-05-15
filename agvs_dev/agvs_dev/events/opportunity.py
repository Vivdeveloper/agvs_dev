import frappe

# Lead to Opportunity
def lead_to_opportunity(doc, method=None):
    def copy_same_named_fields(doc, lead):
        """Copy all fields that have the same fieldname on both Lead and Opportunity (including custom fields)."""
        opp_fields = {f.fieldname for f in doc.meta.get("fields")}
        lead_fields = {f.fieldname for f in lead.meta.get("fields")}
        common = opp_fields.intersection(lead_fields)

        allowed_types = {
            "Data", "Select", "Link", "Small Text", "Text",
            "Int", "Float", "Currency", "Check", "Date", "Datetime"
        }

        # These fields should not be auto-copied from Lead
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
            "customer_name": lead.company_name or lead.organization_name,
            "contact_person": lead.first_name or lead.lead_name,
            "contact_email": lead.email_id or lead.email,
            "contact_mobile": lead.mobile_no,
            "phone": lead.phone,
            "website": lead.website,
            "industry": lead.industry,
            "territory": lead.territory,
            "no_of_employees": lead.no_of_employees,
            "annual_revenue": lead.annual_revenue,
            "source": lead.source,
            # Add more custom mappings if needed
        }
    
        for target_field, value in mapping.items():
            if value and not doc.get(target_field):
                doc.set(target_field, value)
    
    
    def before_insert(doc, method=None):
        """Run before Opportunity is inserted to copy Lead data."""
        if not doc.get("lead"):
            return
    
        lead = frappe.get_doc("Lead", doc.lead)
    
        if not doc.get("opportunity_from"):
            doc.opportunity_from = "Lead"
    
        # 1. Copy all matching fields
        copy_same_named_fields(doc, lead)
    
        # 2. Copy fields with different names
        copy_special_mappings(doc, lead)
    
        # 3. Copy ownership fields if applicable
        if hasattr(lead, "lead_owner") and not doc.get("opportunity_owner"):
            doc.opportunity_owner = lead.lead_owner


