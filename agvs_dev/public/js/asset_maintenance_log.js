// === Add Asset button  ===
frappe.ui.form.on('Asset Maintenance Log', {
    refresh(frm) {
        // Always show the button after save/submit
        frm.page.add_inner_button("Go to Asset", () => {
            if (frm.doc.asset_maintenance) {
                frappe.set_route("Form", "Asset", frm.doc.asset_maintenance);
            } else {
                frappe.msgprint("No Asset selected.");
            }
        });
    }
});


// === Completion Date and Time  ===
// Client Script (Asset Maintenance Log)
frappe.ui.form.on('Asset Maintenance Log', {
    validate: function(frm) {
        if (!frm.doc.custom_completion_date_and_time) {
            // set DateTime on client side (visible immediately)
            frm.set_value('custom_completion_date_and_time', frappe.datetime.now_datetime());
        }
    }
});


// === Existing Balance Validation  ===
// Client Script: Doctype = "Asset Maintenance Log"

frappe.ui.form.on('Asset Maintenance Log', {
    validate: function(frm) {
        // Previous balance on parent
        var prev = parseFloat(frm.doc.custom_previous_balance) || 0;

        // First visit (no previous balance) -> no restriction
        if (!prev) {
            return;
        }

        // IMPORTANT: this must match the child table fieldname
        var rows = frm.doc.custom_asset_maintenance_item || [];

        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var existing = parseFloat(row.existing_qty) || 0;

            if (existing > prev) {
                frappe.validated = false;   // stop Save/Submit
                frappe.msgprint(
                    __('Row {0}: Existing Qty ({1}) cannot be greater than Previous Balance ({2})', 
                      [row.idx, existing, prev])
                );
                break; // no need to check further rows
            }
        }
    }
});


// === Fetch completion date from completion datetime  ===
frappe.ui.form.on("Asset Maintenance Log", {
    // when user sets status to Completed, auto-fill today's date
    maintenance_status(frm) {
        if (frm.doc.maintenance_status === "Completed" && !frm.doc.completion_date) {
            frm.set_value("completion_date", frappe.datetime.get_today());
        }
    },

    // safety net: if somehow still empty during validate, set it again
    validate(frm) {
        if (frm.doc.maintenance_status === "Completed" && !frm.doc.completion_date) {
            frm.set_value("completion_date", frappe.datetime.get_today());
        }
    }
});


// === Hide Warehouse and item table  ===
// // Client Script (Asset Maintenance Log)
// // Hide child table and warehouse when custom_regular_visit is checked

// frappe.ui.form.on('Asset Maintenance Log', {
//     refresh: function(frm) {
//         toggle_fields(frm);
//     },
//     custom_regular_visit: function(frm) {
//         toggle_fields(frm);
//     }
// });

// function toggle_fields(frm) {
//     // if checkbox is checked => hide those fields
//     const hide = !!frm.doc.custom_regular_visit;

//     // show: second argument is boolean (true = show, false = hide)
//     frm.toggle_display('custom_asset_maintenance_item', !hide);
//     frm.toggle_display('custom_warehouse', !hide);

//     // optional: when hiding, clear values so they don't remain accidentally
//     if (hide) {
//         // clear warehouse link
//         if (frm.doc.custom_warehouse) {
//             frm.set_value('custom_warehouse', null);
//         }

//         // clear child table rows (only if you really want to remove them)
//         if ((frm.doc.custom_asset_maintenance_item || []).length) {
//             frm.clear_table('custom_asset_maintenance_item');
//             frm.refresh_field('custom_asset_maintenance_item');
//         }
//     }
// }




// Client Script (Asset Maintenance Log)
// Hide child table, warehouse and button when custom_regular_visit is checked

frappe.ui.form.on('Asset Maintenance Log', {
    refresh: function(frm) {
        toggle_fields(frm);
    },
    custom_regular_visit: function(frm) {
        toggle_fields(frm);
    }
});

function toggle_fields(frm) {
    // if checkbox is checked => hide those fields
    const hide = !!frm.doc.custom_regular_visit;

    // Hide/Show fields
    frm.toggle_display('custom_asset_maintenance_item', !hide);
    frm.toggle_display('custom_warehouse', !hide);

    // 🔥 Hide/Show "custom_get_maintenance_item" button
    frm.toggle_display('custom_get_maintenance_item', !hide);

    // When hiding, clear values
    if (hide) {
        // clear warehouse link
        if (frm.doc.custom_warehouse) {
            frm.set_value('custom_warehouse', null);
        }

        // clear child table rows
        if ((frm.doc.custom_asset_maintenance_item || []).length) {
            frm.clear_table('custom_asset_maintenance_item');
            frm.refresh_field('custom_asset_maintenance_item');
        }
    }
}



