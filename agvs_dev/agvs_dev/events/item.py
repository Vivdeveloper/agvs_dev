import frappe

# DISABLED - Item name series
def item_name_series(doc, method=None):
    from frappe.model.naming import make_autoname
    import re
    
    def slug(s):
        return re.sub(r'[^A-Za-z0-9]', '', str(s)).upper()
    
    def before_insert(doc, method):
        product_code = slug(doc.custom_product_code)
        scent_family = slug(doc.custom_scent_family)
        strength_level = slug(doc.custom_strength_level)
    
        # Counter resets per scent family
        series = make_autoname(f"{scent_family}-.###")
    
        # Final item code: {custom_product_code}-{custom_scent_family}-{series:###}-{custom_strength_level}
        doc.item_code = f"{product_code}-{scent_family}-{series.split('-')[-1]}-{strength_level}"


