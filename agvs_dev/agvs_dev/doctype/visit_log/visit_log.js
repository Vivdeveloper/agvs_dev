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

// === Toggle grid columns and labels based on visit_type ===
function toggle_maintenance_columns(frm) {
    const grid = frm.fields_dict["custom_asset_maintenance_item"]
        && frm.fields_dict["custom_asset_maintenance_item"].grid;
    if (!grid) return;

    const vt = frm.doc.visit_type;

    function set_col_label(fieldname, label) {
        const df = (grid.docfields || []).find(f => f.fieldname === fieldname);
        if (df) df.label = label;
    }

    // Reset all labels to default first
    set_col_label("existing_qty", "Existing Qty");
    set_col_label("refill_qty",   "Refill Qty");

    if (vt === "Installation") {
        // Item Code, UOM, Capacity Qty, Installed Qty
        grid.set_column_disp("capacity_qty",  true);
        grid.set_column_disp("demo_qty",      false);
        grid.set_column_disp("existing_qty",  false);
        grid.set_column_disp("refill_qty",    true);
        grid.set_column_disp("balance_qty",   false);
        set_col_label("refill_qty", "Installed Qty");

    } else if (vt === "Demo Installation") {
        // Item Code, UOM, Demo Qty
        grid.set_column_disp("capacity_qty",  false);
        grid.set_column_disp("demo_qty",      true);
        grid.set_column_disp("existing_qty",  false);
        grid.set_column_disp("refill_qty",    false);
        grid.set_column_disp("balance_qty",   false);

    } else if (vt === "Demo Uninstallation") {
        // Item Code, UOM, Return Qty
        grid.set_column_disp("capacity_qty",  false);
        grid.set_column_disp("demo_qty",      false);
        grid.set_column_disp("existing_qty",  true);
        grid.set_column_disp("refill_qty",    false);
        grid.set_column_disp("balance_qty",   false);
        set_col_label("existing_qty", "Return Qty");

    } else if (vt === "Uninstallation") {
        // Item Code, UOM, Existing Qty, Balance Qty
        grid.set_column_disp("capacity_qty",  false);
        grid.set_column_disp("demo_qty",      false);
        grid.set_column_disp("existing_qty",  true);
        grid.set_column_disp("refill_qty",    false);
        grid.set_column_disp("balance_qty",   true);

    } else if (vt === "Regular Visit") {
        // Item Code, UOM, Existing Qty, Refill Qty, Balance Qty
        grid.set_column_disp("capacity_qty",  false);
        grid.set_column_disp("demo_qty",      false);
        grid.set_column_disp("existing_qty",  true);
        grid.set_column_disp("refill_qty",    true);
        grid.set_column_disp("balance_qty",   true);

    } else {
        // No visit type selected — show all with original labels
        grid.set_column_disp("capacity_qty",  true);
        grid.set_column_disp("demo_qty",      true);
        grid.set_column_disp("existing_qty",  true);
        grid.set_column_disp("refill_qty",    true);
        grid.set_column_disp("balance_qty",   true);
    }

    grid.refresh();
}

frappe.ui.form.on('Visit Log', {
    refresh:    frm => toggle_maintenance_columns(frm),
    visit_type: frm => toggle_maintenance_columns(frm)
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
    refresh: function(frm) {
        if (frm.doc.docstatus === 1) {
            frm.set_df_property('custom_get_maintenance_item', 'hidden', 1);
        }
    },

    asset: function(frm) {
        frm.events.get_maintenance_items(frm);
    },

    custom_get_maintenance_item: function(frm) {
        frm.events.get_maintenance_items(frm);
    },

    get_maintenance_items: function(frm) {
        if (frm._fetching_maintenance_items) return;
        frm._fetching_maintenance_items = true;

        frm.clear_table('custom_asset_maintenance_item');

        if (!frm.doc.asset) {
            frappe.msgprint("Please select Asset.");
            frm.refresh_field('custom_asset_maintenance_item');
            frm._fetching_maintenance_items = false;
            return;
        }

        frappe.db.get_doc('Asset', frm.doc.asset)
            .then(asset_doc => {
                (asset_doc.custom_asset_requirement_item || []).forEach(row => {
                    let child = frm.add_child('custom_asset_maintenance_item');
                    child.item_code = row.item_code;
                    child.capacity_qty = row.capacity_qty;
                    child.uom = row.uom;
                });
                frm.refresh_field('custom_asset_maintenance_item');
            })
            .finally(() => {
                frm._fetching_maintenance_items = false;
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


// === Asset Maintenance Items — prevent duplicate Item Code ===
frappe.ui.form.on("Asset Maintenance Item", {
	item_code(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.item_code) return;

		const duplicate = (frm.doc.custom_asset_maintenance_item || []).some(
			d => d.name !== cdn && d.item_code === row.item_code
		);

		if (duplicate) {
			frappe.model.set_value(cdt, cdn, "item_code", "");
			frappe.msgprint({
				title: __("Duplicate Item"),
				indicator: "red",
				message: __("Item {0} is already added in another row.", [row.item_code])
			});
		}
	}
});

// === Visit Log Additional Consumed Items — prevent duplicate Item Code ===
frappe.ui.form.on("Visit Log Additional Consumed Item", {
	item_code(frm, cdt, cdn) {
		const row = locals[cdt][cdn];
		if (!row.item_code) return;

		const duplicate = (frm.doc.visit_log_additional_consumed_items || []).some(
			d => d.name !== cdn && d.item_code === row.item_code
		);

		if (duplicate) {
			frappe.model.set_value(cdt, cdn, "item_code", "");
			frappe.msgprint({
				title: __("Duplicate Item"),
				indicator: "red",
				message: __("Item {0} is already added in another row.", [row.item_code])
			});
		}
	}
});

