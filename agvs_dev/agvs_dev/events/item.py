# import frappe

# DISABLED - Item name series
# def item_name_series(doc, method=None):
#     from frappe.model.naming import make_autoname
#     import re
    
#     def slug(s):
#         return re.sub(r'[^A-Za-z0-9]', '', str(s)).upper()
    
#     def before_insert(doc, method):
#         product_code = slug(doc.custom_product_code) #not found
#         scent_family = slug(doc.custom_scent_family)
#         strength_level = slug(doc.custom_strength_level)
    
#         # Counter resets per scent family
#         series = make_autoname(f"{scent_family}-.###")
    
#         # Final item code: {custom_product_code}-{custom_scent_family}-{series:###}-{custom_strength_level}
#         doc.item_code = f"{product_code}-{scent_family}-{series.split('-')[-1]}-{strength_level}"


def set_item_naming_series(doc, method=None):
    naming_series = doc.item_group

    if doc.item_group == "SO" and doc.custom_scent_family:
        naming_series += f"-{doc.custom_scent_family}"

    elif doc.item_group in ["SL", "FX", "SF"] and doc.custom_scent_group:
        naming_series += f"-{doc.custom_scent_group}"

    elif (
        doc.item_group == "BT"
        and doc.custom_container_material
        and doc.custom_container_size
    ):
        naming_series += (
            f"-{doc.custom_container_material}"
            f"-{doc.custom_container_size}"
        )

    elif (
        doc.item_group == "ST"
        and doc.custom_general_stickering_application
        and doc.custom_sticker_material
    ):
        naming_series += (
            f"-{doc.custom_general_stickering_application}"
            f"-{doc.custom_sticker_material}"
        )

    elif (
        doc.item_group == "INC"
        and doc.custom_stick_size
        and doc.custom_scent_family
    ):
        naming_series += (
            f"-{doc.custom_stick_size}"
            f"-{doc.custom_scent_family}"
        )

    elif (
        doc.item_group == "HP"
        and doc.custom_hp_sub_category
        and doc.custom_scent_family
        and doc.custom_dilution_category
    ):
        doc.naming_series = (
            f"{doc.item_group}.-."
            f"{doc.custom_hp_sub_category}.-."
            f"{doc.custom_scent_family}.-."
            f"####.-."
            f"{doc.custom_dilution_category}."
        )
        return

    doc.naming_series = f"{naming_series}-.####"