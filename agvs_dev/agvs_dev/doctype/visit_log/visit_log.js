// === Auto-fetch items and address from Machine Installation ===
frappe.ui.form.on('Visit Log', {
    machine_installation(frm) {
        if (!frm.doc.machine_installation) return;
        fetch_items_from_mi(frm);
        fetch_address_from_mi(frm);
    }
});

function fetch_address_from_mi(frm) {
    frappe.db.get_value(
        'Machine Installation and Un-Installation',
        frm.doc.machine_installation,
        'address_display',
        function(r) {
            if (r && r.address_display) {
                frm.set_value('custom_address_display', r.address_display);
            }
        }
    );
}

function fetch_items_from_mi(frm) {
    frappe.db.get_doc('Machine Installation and Un-Installation', frm.doc.machine_installation)
        .then(mi => {
            const machine_items = (mi.machine_items || []).filter(r => r.asset);
            if (!machine_items.length) return;

            frm.clear_table('custom_asset_maintenance_item');

            let pending = machine_items.length;

            machine_items.forEach(machine => {
                frappe.db.get_doc('Asset', machine.asset).then(asset_doc => {
                    (asset_doc.custom_asset_requirement_item || []).forEach(item => {
                        let child          = frm.add_child('custom_asset_maintenance_item');
                        child.item_code    = item.item_code;
                        child.capacity_qty = item.capacity_qty || 0;
                        child.uom          = item.uom || '';
                    });
                    pending--;
                    if (pending === 0) frm.refresh_field('custom_asset_maintenance_item');
                });
            });
        });
}

// === Demo Installation: toggle grid columns ===
function toggle_demo_columns(frm) {
    const is_demo = frm.doc.visit_type === "Demo Installation";
    const grid = frm.fields_dict["custom_asset_maintenance_item"]
        && frm.fields_dict["custom_asset_maintenance_item"].grid;
    if (!grid) return;

    // Demo Installation: capacity_qty + demo_qty only
    // Other types:       capacity_qty + existing_qty + refill_qty + balance_qty
    grid.set_column_disp("capacity_qty", true);
    grid.set_column_disp("demo_qty",     is_demo);
    grid.set_column_disp("existing_qty", !is_demo);
    grid.set_column_disp("refill_qty",   !is_demo);
    grid.set_column_disp("balance_qty",  !is_demo);
}

frappe.ui.form.on('Visit Log', {
    refresh:    frm => toggle_demo_columns(frm),
    visit_type: frm => toggle_demo_columns(frm)
});

// === Completion Date and Time in Visit log  ===
frappe.ui.form.on('Visit Log', {
    validate: function(frm) {
        if (!frm.doc.completion_date_and_time) {
            frm.set_value('completion_date_and_time', frappe.datetime.now_datetime());
        }
    }
});




// === fetch raw material from Asset  ===
frappe.ui.form.on('Visit Log', {
    asset: function(frm) {
        frm.events.get_maintenance_items(frm);
    },

    custom_get_maintenance_item: function(frm) {
        frm.events.get_maintenance_items(frm);
    },

    get_maintenance_items: function(frm) {
        // Clear table
        frm.clear_table('custom_asset_maintenance_item');

        if (!frm.doc.asset) {
            frappe.msgprint("Please select Asset.");
            frm.refresh_field('custom_asset_maintenance_item');
            return;
        }

        // asset = Asset
        frappe.db.get_doc('Asset', frm.doc.asset)
            .then(asset_doc => {
                let previous_balance = 0;

                (asset_doc.custom_asset_requirement_item || []).forEach((row, idx) => {
                    let child = frm.add_child('custom_asset_maintenance_item');
                    child.item_code = row.item_code;
                    child.capacity_qty = row.capacity_qty;
                    child.uom = row.uom;

                    // take balance from first asset item row (or last, if you prefer)
                    if (idx === 0) {
                        previous_balance = row.balance_qty || 0;
                    }
                });

               

                frm.refresh_field('custom_asset_maintenance_item');
                
            });
    }
});


// === link to AM and MI  ===


// === Status Update (disabled) ===
frappe.ui.form.on('Visit Log', {
    after_save: function(frm) {

        if (frm.doc.maintenance_status === "Completed") {

            let status_value = "";

            if (frm.doc.visit_type === "Demo Installation") {
                status_value = "Demo Installation Completed";
            }

            if (frm.doc.visit_type === "Demo Uninstallation") {
                status_value = "Demo Uninstallation Completed";
            }

            if (status_value && frm.doc.reference_name) {

                frappe.db.set_value(
                    "Machine Installation and Uninstallation",
                    frm.doc.reference_name,
                    "status",
                    status_value
                );

            }
        }
    }
});

// === Visit Log  ===
frappe.listview_settings["Visit Log"] = {
	add_fields: ["maintenance_status"],
	has_indicator_for_draft: 1,
	get_indicator: function (doc) {
		if (doc.maintenance_status == "Planned") {
			return [__(doc.maintenance_status), "orange", "maintenance_status,=," + doc.maintenance_status];
		} else if (doc.maintenance_status == "Completed") {
			return [__(doc.maintenance_status), "green", "maintenance_status,=," + doc.maintenance_status];
		} else if (doc.maintenance_status == "Cancelled") {
			return [__(doc.maintenance_status), "red", "maintenance_status,=," + doc.maintenance_status];
		} else if (doc.maintenance_status == "Overdue") {
			return [__(doc.maintenance_status), "red", "maintenance_status,=," + doc.maintenance_status];
		}
	},
};

