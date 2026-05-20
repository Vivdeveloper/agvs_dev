// === Maintenance Visit — Material Transfer button ===

frappe.ui.form.on('Maintenance Visit', {
    refresh(frm) {
        if (frm.is_new()) return;

        // Show "Material Transfer" button only if one hasn't been created yet
        frappe.db.get_list("Stock Entry", {
            filters: {
                custom_maintenance_visit: frm.doc.name,
                stock_entry_type: "Material Transfer",
                docstatus: ["!=", 2]
            },
            fields: ["name"],
            limit: 1
        }).then(res => {
            if (!res || !res.length) {
                frm.add_custom_button(__("Material Transfer"), () => {
                    create_material_transfer(frm);
                }, __("Create"));
            }
        });
    }
});

function create_material_transfer(frm) {
    if (!frm.doc.custom_from_warehouse) {
        frappe.msgprint({
            title: __("Missing Warehouse"),
            indicator: "red",
            message: __("Please set <b>From Warehouse (Stores)</b> before creating Material Transfer.")
        });
        return;
    }

    const purposes = frm.doc.purposes || [];
    const technician_user = purposes.length ? purposes[0].custom_maintenance_user : null;

    if (!technician_user) {
        frappe.msgprint({
            title: __("Missing Technician"),
            indicator: "red",
            message: __("Please set <b>Maintenance User</b> in the Purposes table before creating Material Transfer.")
        });
        return;
    }

    // Look up employee warehouse by user
    frappe.db.get_list("Warehouse", {
        filters: { custom_user: technician_user },
        fields: ["name"],
        limit: 1
    }).then(wh_res => {
        const employee_wh = wh_res && wh_res[0] ? wh_res[0].name : "";

        if (!employee_wh) {
            frappe.msgprint({
                title: __("Warehouse Not Found"),
                indicator: "red",
                message: __(`No warehouse found for user <b>${technician_user}</b>. Please set a warehouse linked to this user.`)
            });
            return;
        }

        // Build items from Purposes (item_code + refill_qty)
        const items = [];
        purposes.forEach(row => {
            if (row.item_code && (row.custom_refill_qty || 0) > 0) {
                items.push({
                    item_code:   row.item_code,
                    qty:         row.custom_refill_qty,
                    s_warehouse: frm.doc.custom_from_warehouse,
                    t_warehouse: employee_wh
                });
            }
        });

        if (!items.length) {
            frappe.msgprint({
                title: __("No Items"),
                indicator: "orange",
                message: __("No items with <b>Refill Qty > 0</b> found in Purposes. Please fill Refill Qty first.")
            });
            return;
        }

        // Derive company from the from_warehouse (may differ from MV company)
        frappe.db.get_value("Warehouse", frm.doc.custom_from_warehouse, "company").then(r => {
            const se_company = (r && r.message && r.message.company) || frm.doc.company;

            frappe.new_doc("Stock Entry", {}, doc => {
                doc.stock_entry_type         = "Material Transfer";
                doc.company                  = se_company;
                doc.from_warehouse           = frm.doc.custom_from_warehouse;
                doc.to_warehouse             = employee_wh;
                doc.custom_maintenance_visit = frm.doc.name;

                doc.items = [];
                items.forEach(item => {
                    let row               = frappe.model.add_child(doc, "Stock Entry Detail", "items");
                    row.item_code         = item.item_code;
                    row.qty               = item.qty;
                    row.s_warehouse       = item.s_warehouse;
                    row.t_warehouse       = item.t_warehouse;
                    row.conversion_factor = 1;
                    row.transfer_qty      = item.qty;
                });

                frappe.set_route("Form", "Stock Entry", doc.name);
            });
        });
    });
}
