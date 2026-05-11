// === create maintenance visit  ===
frappe.ui.form.on('Maintenance Schedule', {
    refresh(frm) {

        // ⏳ Wait till ERP adds buttons
        setTimeout(() => {

            // 🔁 Override default button
            frm.page.remove_inner_button('Maintenance Visit', 'Create');

            frm.page.add_inner_button('Maintenance Visit', () => {
                create_maintenance_visit(frm);   // 👈 your function
            }, 'Create');

        }, 100);
    }
});


function create_maintenance_visit(frm) {

    frappe.new_doc('Maintenance Visit', {}, (doc) => {

        // 🔹 Parent field mapping
        doc.customer = frm.doc.customer;
        doc.maintenance_schedule = frm.doc.name;
        doc.maintenance_type = "Scheduled";

        // 🔹 CLEAR (safety)
        doc.purposes = [];

        // 🔹 Child table mapping
        if (frm.doc.items && frm.doc.items.length) {

            frm.doc.items.forEach(row => {

                let child = frappe.model.add_child(doc, 'Maintenance Visit Purpose', 'purposes');

                child.custom_asset = row.custom_asset;
                child.custom_asset_name = row.custom_asset_name;
                child.item_code = row.item_code;
                child.item_name = row.item_name;
                child.custom_capacity = row.custom_capacity_qty;

            });
        }

        // 🔄 Force refresh (important)
        frappe.model.set_value(doc.doctype, doc.name, "purposes", doc.purposes);
    });
}

