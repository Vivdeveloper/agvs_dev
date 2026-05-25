// === create maintenance visit  ===
frappe.ui.form.on('Maintenance Schedule', {
    refresh(frm) {
        setTimeout(() => {
            frm.page.remove_inner_button('Maintenance Visit', 'Create');
            frm.page.add_inner_button('Maintenance Visit', () => {
                create_maintenance_visit(frm);
            }, 'Create');
        }, 100);

        // Auto-fill sales_person for all existing rows
        (frm.doc.items || []).forEach(row => {
            if (!row.sales_person) {
                frappe.model.set_value(row.doctype, row.name, 'sales_person', frappe.session.user);
            }
        });
    }
});

// Auto-fill sales_person when a new row is added
frappe.ui.form.on('Maintenance Schedule Item', {
    items_add(frm, cdt, cdn) {
        frappe.model.set_value(cdt, cdn, 'sales_person', frappe.session.user);
    }
});


function create_maintenance_visit(frm) {
    // Build a map: item_code → earliest Pending schedule detail row (name + sales_person)
    const schedules = frm.doc.schedules || [];
    const today = frappe.datetime.get_today();

    // sort by scheduled_date ascending so we pick the earliest pending
    const pending = schedules
        .filter(s => s.completion_status !== "Completed")
        .sort((a, b) => new Date(a.scheduled_date) - new Date(b.scheduled_date));

    // first pending row per item_code
    const detailByItem = {};
    pending.forEach(s => {
        if (s.item_code && !detailByItem[s.item_code]) {
            detailByItem[s.item_code] = { name: s.name, sales_person: s.sales_person || "" };
        }
    });

    frappe.new_doc('Maintenance Visit', {}, (doc) => {
        doc.customer            = frm.doc.customer;
        doc.maintenance_schedule = frm.doc.name;
        doc.maintenance_type    = "Scheduled";
        doc.purposes            = [];

        (frm.doc.items || []).forEach(row => {
            let child = frappe.model.add_child(doc, 'Maintenance Visit Purpose', 'purposes');
            child.custom_asset              = row.custom_asset;
            child.custom_asset_name         = row.custom_asset_name;
            child.item_code                 = row.item_code;
            child.item_name                 = row.item_name;
            child.custom_capacity           = row.custom_capacity_qty;
            // Link to the schedule detail row so ERPNext can auto-update completion status
            const detail = detailByItem[row.item_code] || {};
            child.maintenance_schedule_detail = detail.name || "";
            if (detail.sales_person) child.service_person = detail.sales_person;
        });

        frappe.model.set_value(doc.doctype, doc.name, "purposes", doc.purposes);
    });
}
