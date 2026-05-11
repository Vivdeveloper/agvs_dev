// === Auto-fetch items from Machine Installation ===
frappe.ui.form.on('Visit Log', {
    machine_installation(frm) {
        if (!frm.doc.machine_installation) return;
        fetch_items_from_mi(frm);
    }
});

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


// === Create Button for Demo Machine Uninstallation  ===
frappe.ui.form.on('Visit Log', {
    refresh: function(frm) {
        if (frm.is_new()) return;

        // ── Uninstallation: Draft → Asset Receipt + Material Receipt ──
        if (frm.doc.visit_type === "Demo Uninstallation" && frm.doc.docstatus === 0) {
            frm.clear_custom_buttons();

            frm.add_custom_button('Asset Receipt', function () {
                let mi_name = frm.doc.machine_installation;
                if (!mi_name) {
                    frappe.msgprint({ title: 'Error', indicator: 'red', message: 'Machine Installation is not linked.' });
                    return;
                }
                frappe.call({
                    method: "frappe.client.get",
                    args: { doctype: "Machine Installation and Un-Installation", name: mi_name },
                    callback(r) {
                        if (!r.message) return;
                        let mi = r.message;
                        frappe.new_doc('Asset Movement', {}, function(doc) {
                            doc.purpose = "Receipt";
                            doc.custom_visit_log = frm.doc.name;
                            doc.company = "AGVS ENTERPRISES PVT LTD";  // ── hardcoded
                            doc.custom_machine_installation = mi_name;
                            doc.assets = [];

                            (mi.machine_items || []).forEach(row => {
                                let child = frappe.model.add_child(doc, "assets");
                                child.asset = row.asset;
                                child.source_location = "Demo Location";  // ── auto from MI doc
                                child.target_location = "Office";              // ── hardcoded
                            });

                            frappe.set_route('Form', 'Asset Movement', doc.name);
                        });
                    }
                });
            }, 'Create');

            frm.add_custom_button('Material Receipt', function () {
                let mi_name = frm.doc.machine_installation;
                if (!mi_name) {
                    frappe.msgprint({ title: 'Error', indicator: 'red', message: 'Machine Installation is not linked.' });
                    return;
                }
                frappe.call({
                    method: "frappe.client.get",
                    args: { doctype: "Machine Installation and Un-Installation", name: mi_name },
                    callback(r) {
                        if (!r.message) return;
                        let mi = r.message;
                        const rows = (mi.table_uuer || []).filter(row => Number(row.issued_qty) > 0);

                        if (!rows.length) {
                            frappe.msgprint({ title: 'No Items', indicator: 'red', message: 'No items with Issued Qty > 0.' });
                            return;
                        }

                        frappe.new_doc('Stock Entry', {}, function(doc) {
                            doc.naming_series = "MAT-STE-.YYYY.-";
                            doc.stock_entry_type = "Material Receipt";
                            doc.purpose = "Material Receipt";
                            doc.custom_visit_log = frm.doc.name;
                            doc.company = "AGVS ENTERPRISES PVT LTD";  // ── hardcoded
                            doc.custom_machine_installation = mi_name;
                            doc.items = [];

                            let pending = rows.length;

                            rows.forEach(row => {
                                frappe.call({
                                    method: "frappe.client.get",
                                    args: { doctype: "Item", name: row.item_code || row.item },
                                    callback(item_res) {
                                        if (item_res.message) {
                                            let item_doc = item_res.message;
                                            let uom = item_doc.stock_uom;
                                            let conversion_factor = 1;

                                            if (item_doc.uoms && item_doc.uoms.length > 0) {
                                                uom = item_doc.uoms[0].uom;
                                                conversion_factor = item_doc.uoms[0].conversion_factor;
                                            }

                                            let qty = Number(row.issued_qty);
                                            let child = frappe.model.add_child(doc, "items");
                                            child.item_code = row.item_code || row.item;
                                            child.qty = qty;
                                            child.uom = uom;
                                            child.stock_uom = item_doc.stock_uom;
                                            child.conversion_factor = conversion_factor;
                                            child.transfer_qty = qty * conversion_factor;
                                            child.s_warehouse = mi.demo_location;      // ── auto from MI doc
                                            child.t_warehouse = mi.material_warehouse; // ── auto from MI doc
                                        }

                                        pending--;
                                        if (pending === 0) {
                                            frappe.set_route('Form', 'Stock Entry', doc.name);
                                        }
                                    }
                                });
                            });
                        });
                    }
                });
            }, 'Create');
        }
    }
});

// === Create Button for Uninstallation  ===
frappe.ui.form.on('Visit Log', {
    refresh: function(frm) {
        if (frm.is_new()) return;

        // ── Uninstallation: Draft → Asset Receipt + Material Receipt ──
        if (frm.doc.visit_type === "Uninstallation" && frm.doc.docstatus === 0) {
            frm.clear_custom_buttons();

            frm.add_custom_button('Asset Receipt', function () {
                let mi_name = frm.doc.machine_installation;
                if (!mi_name) {
                    frappe.msgprint({ title: 'Error', indicator: 'red', message: 'Machine Installation is not linked.' });
                    return;
                }
                frappe.call({
                    method: "frappe.client.get",
                    args: { doctype: "Machine Installation and Un-Installation", name: mi_name },
                    callback(r) {
                        if (!r.message) return;
                        let mi = r.message;
                        frappe.new_doc('Asset Movement', {}, function(doc) {
                            doc.purpose = "Receipt";
                            doc.custom_visit_log = frm.doc.name;
                            doc.company = "AGVS ENTERPRISES PVT LTD";  // ── hardcoded
                            doc.custom_machine_installation = mi_name;
                            doc.assets = [];

                            (mi.machine_items || []).forEach(row => {
                                let child = frappe.model.add_child(doc, "assets");
                                child.asset = row.asset;
                                child.source_location = "Demo Location";  // ── auto from MI doc
                                child.target_location = "Office";              // ── hardcoded
                            });

                            frappe.set_route('Form', 'Asset Movement', doc.name);
                        });
                    }
                });
            }, 'Create');

            frm.add_custom_button('Material Receipt', function () {
                let mi_name = frm.doc.machine_installation;
                if (!mi_name) {
                    frappe.msgprint({ title: 'Error', indicator: 'red', message: 'Machine Installation is not linked.' });
                    return;
                }
                frappe.call({
                    method: "frappe.client.get",
                    args: { doctype: "Machine Installation and Un-Installation", name: mi_name },
                    callback(r) {
                        if (!r.message) return;
                        let mi = r.message;
                        const rows = (mi.table_uuer || []).filter(row => Number(row.issued_qty) > 0);

                        if (!rows.length) {
                            frappe.msgprint({ title: 'No Items', indicator: 'red', message: 'No items with Issued Qty > 0.' });
                            return;
                        }

                        frappe.new_doc('Stock Entry', {}, function(doc) {
                            doc.naming_series = "MAT-STE-.YYYY.-";
                            doc.stock_entry_type = "Material Receipt";
                            doc.purpose = "Material Receipt";
                            doc.custom_visit_log = frm.doc.name;
                            doc.company = "AGVS ENTERPRISES PVT LTD";  // ── hardcoded
                            doc.custom_machine_installation = mi_name;
                            doc.items = [];

                            let pending = rows.length;

                            rows.forEach(row => {
                                frappe.call({
                                    method: "frappe.client.get",
                                    args: { doctype: "Item", name: row.item_code || row.item },
                                    callback(item_res) {
                                        if (item_res.message) {
                                            let item_doc = item_res.message;
                                            let uom = item_doc.stock_uom;
                                            let conversion_factor = 1;

                                            if (item_doc.uoms && item_doc.uoms.length > 0) {
                                                uom = item_doc.uoms[0].uom;
                                                conversion_factor = item_doc.uoms[0].conversion_factor;
                                            }

                                            let qty = Number(row.issued_qty);
                                            let child = frappe.model.add_child(doc, "items");
                                            child.item_code = row.item_code || row.item;
                                            child.qty = qty;
                                            child.uom = uom;
                                            child.stock_uom = item_doc.stock_uom;
                                            child.conversion_factor = conversion_factor;
                                            child.transfer_qty = qty * conversion_factor;
                                            child.s_warehouse = mi.demo_location;      // ── auto from MI doc
                                            child.t_warehouse = mi.material_warehouse; // ── auto from MI doc
                                        }

                                        pending--;
                                        if (pending === 0) {
                                            frappe.set_route('Form', 'Stock Entry', doc.name);
                                        }
                                    }
                                });
                            });
                        });
                    }
                });
            }, 'Create');
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
frappe.ui.form.on('Visit Log', {
    refresh: function(frm) {
        if (frm.is_new()) return;

        if (["Installation", "Demo Installation"].includes(frm.doc.visit_type) && frm.doc.docstatus === 0) {
            frm.clear_custom_buttons();

            // ✅ Asset Transfer
            frm.add_custom_button('Asset Issue', function () {
                frappe.new_doc('Asset Movement', {}, function(doc) {
                    doc.purpose                     = "Issue";
                    doc.custom_visit_log            = frm.doc.name;
                    doc.company                     = frm.doc.company;
                    doc.custom_machine_installation = frm.doc.machine_installation;
                    doc.assets                      = [];

                    if (frm.doc.asset) {
                        let child   = frappe.model.add_child(doc, "assets");
                        child.asset = frm.doc.asset;
                    }

                    frappe.set_route('Form', 'Asset Movement', doc.name);
                });
            }, 'Create');

            // ✅ Material Transfer
            frm.add_custom_button('Material Issue', function () {
                const rows = (frm.doc.custom_asset_maintenance_item || []).filter(row => Number(row.refill_qty) > 0);

                if (!rows.length) {
                    frappe.msgprint({
                        title: __('No Items'),
                        indicator: 'red',
                        message: __('No items with Refill Qty > 0 found.')
                    });
                    return;
                }

                frappe.new_doc('Stock Entry', {}, function(doc) {
                    doc.naming_series               = "MAT-STE-.YYYY.-";
                    doc.stock_entry_type            = "Material Issue";
                    doc.purpose                     = "Material Issue";
                    doc.custom_visit_log                   = frm.doc.name;
                    doc.company                     = frm.doc.company;
                    doc.custom_machine_installation = frm.doc.machine_installation;
                    doc.items                       = [];

                    let pending = rows.length;

                    rows.forEach(function(row) {
                        frappe.call({
                            method: "frappe.client.get",
                            args: { doctype: "Item", name: row.item_code },
                            callback: function(item_res) {
                                if (item_res.message) {
                                    let item_doc          = item_res.message;
                                    let uom               = item_doc.stock_uom;
                                    let conversion_factor = 1;

                                    if (item_doc.uoms && item_doc.uoms.length > 0) {
                                        uom               = item_doc.uoms[0].uom;
                                        conversion_factor = item_doc.uoms[0].conversion_factor;
                                    }

                                    let qty   = Number(row.refill_qty);
                                    let child = frappe.model.add_child(doc, "items");

                                    child.item_code         = row.item_code;
                                    child.qty               = qty;
                                    child.uom               = uom;
                                    child.stock_uom         = item_doc.stock_uom;
                                    child.conversion_factor = conversion_factor;
                                    child.transfer_qty      = qty * conversion_factor;
                                    child.s_warehouse       = frm.doc.warehouse;
                                    child.t_warehouse       = "Demo Location";
                                }

                                pending--;
                                if (pending === 0) {
                                    frappe.set_route('Form', 'Stock Entry', doc.name);
                                }
                            }
                        });
                    });
                });
            }, 'Create');
        }
    }
});

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

