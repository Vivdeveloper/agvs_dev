// === Create button for uninstallation through visit log (disabled) ===
// // ============================================================
// // Machine Installation and Un-Installation — Client Script
// // ============================================================

// frappe.ui.form.on('Machine Installation and Un-Installation', {

//     // ──────────────────────────────────────────────────────────
//     // REFRESH — rebuild custom buttons every time form reloads
//     // ──────────────────────────────────────────────────────────
//     refresh: function (frm) {
//         frm.clear_custom_buttons();

//         // Only show Create buttons on saved (non-new) docs
//         if (frm.is_new()) return;

//         // ── CREATE → Asset Receipt (Asset Movement) ──────────
//         frm.add_custom_button('Asset Receipt', function () {
//             create_asset_receipt(frm);
//         }, 'Create');

//         // ── CREATE → Material Receipt (Stock Entry) ───────────
//         frm.add_custom_button('Material Receipt', function () {
//             create_material_receipt(frm);
//         }, 'Create');

//         // Style the Create button to look like the reference image
//         frm.page.btn_secondary
//             .find('.dropdown-toggle')
//             .addClass('btn-default');
//     },

//     // ──────────────────────────────────────────────────────────
//     // BEFORE SUBMIT — validate both receipts are submitted
//     // ──────────────────────────────────────────────────────────
//     before_submit: function (frm) {
//         // Only enforce validation when linked to a Visit Log
//         // with visit_type == "Uninstallation"
//         if (!frm.doc.visit_log) return;

//         let errors = [];

//         if (!frm.doc.asset_issue_done) {
//             errors.push('• <b>Asset Receipt (Asset Movement)</b> has not been submitted yet.');
//         }
//         if (!frm.doc.material_issue_done) {
//             errors.push('• <b>Material Receipt (Stock Entry)</b> has not been submitted yet.');
//         }

//         if (errors.length) {
//             frappe.validated = false;
//             frappe.msgprint({
//                 title: __('Cannot Submit'),
//                 indicator: 'red',
//                 message: __(
//                     'Please submit both receipts before submitting this record:<br><br>' +
//                     errors.join('<br>')
//                 )
//             });
//         }
//     }
// });


// // ============================================================
// // HELPER — Create Asset Receipt (Asset Movement)
// // ============================================================
// function create_asset_receipt(frm) {
//     const doc = frm.doc;

//     // Validate child table has rows
//     if (!doc.machine_items || doc.machine_items.length === 0) {
//         frappe.msgprint({
//             title: __('No Assets'),
//             indicator: 'red',
//             message: __('No rows found in Machine Items table.')
//         });
//         return;
//     }

//     frappe.new_doc('Asset Movement', {}, function (new_doc) {
//         new_doc.purpose                      = "Receipt";
//         new_doc.company                      = doc.company || "AGVS ENTERPRISES PVT LTD";
//         new_doc.visit_log                    = doc.visit_log;
//         new_doc.custom_machine_installation  = doc.name;
//         new_doc.assets                       = [];

//         // Map each row from machine_items → Asset Movement assets child table
//         (doc.machine_items || []).forEach(function (row) {
//             if (!row.asset) return;

//             let child              = frappe.model.add_child(new_doc, "assets");
//             child.asset            = row.asset;
//             child.source_location  = "Demo Location" || "";  // from MI doc
//             child.target_location  = "Office";                 // hardcoded as per existing logic
//         });

//         frappe.set_route('Form', 'Asset Movement', new_doc.name);
//     });
// }


// // ============================================================
// // HELPER — Create Material Receipt (Stock Entry)
// // ============================================================
// function create_material_receipt(frm) {
//     const doc = frm.doc;

//     // Filter rows with issued_qty > 0
//     const rows = (doc.table_uuer || []).filter(row => Number(row.issued_qty) > 0);

//     if (!rows.length) {
//         frappe.msgprint({
//             title: __('No Items'),
//             indicator: 'red',
//             message: __('No items with <b>Quantity to Issue > 0</b> found in the Requirement Items table.')
//         });
//         return;
//     }

//     frappe.new_doc('Stock Entry', {}, function (new_doc) {
//         new_doc.naming_series             = "MAT-STE-.YYYY.-";
//         new_doc.stock_entry_type          = "Material Receipt";
//         new_doc.purpose                   = "Material Receipt";
//         new_doc.company                   = doc.company || "AGVS ENTERPRISES PVT LTD";
//         new_doc.visit_log                 = doc.visit_log;
//         new_doc.custom_machine_installation = doc.name;
//         new_doc.items                     = [];

//         let pending = rows.length;

//         rows.forEach(function (row) {
//             const item_name = row.item_code || row.item;

//             frappe.call({
//                 method: "frappe.client.get",
//                 args: { doctype: "Item", name: item_name },
//                 callback: function (item_res) {
//                     if (item_res.message) {
//                         const item_doc = item_res.message;

//                         let uom                = item_doc.stock_uom;
//                         let conversion_factor  = 1;

//                         if (item_doc.uoms && item_doc.uoms.length > 0) {
//                             uom               = item_doc.uoms[0].uom;
//                             conversion_factor = item_doc.uoms[0].conversion_factor;
//                         }

//                         const qty  = Number(row.issued_qty);
//                         let child  = frappe.model.add_child(new_doc, "items");

//                         child.item_code          = item_name;
//                         child.qty                = qty;
//                         child.uom                = uom;
//                         child.stock_uom          = item_doc.stock_uom;
//                         child.conversion_factor  = conversion_factor;
//                         child.transfer_qty       = qty * conversion_factor;
//                         child.s_warehouse        = doc.demo_location;       // source — from MI doc
//                         child.t_warehouse        = doc.material_warehouse;  // target — from MI doc
//                     }

//                     pending--;
//                     if (pending === 0) {
//                         frappe.set_route('Form', 'Stock Entry', new_doc.name);
//                     }
//                 }
//             });
//         });
//     });
// }




frappe.ui.form.on('Machine Installation and Un-Installation', {

    refresh: function (frm) {
        frm.clear_custom_buttons();

        if (frm.is_new()) return;

        if (frm.doc.installation_type !== "Uninstallation") return;

        // ── Show buttons only if Visit Log is submitted (docstatus = 1) ──
        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Visit Log",
                filters: {
                    machine_installation: frm.doc.name,
                    visit_type: "Uninstallation",
                    docstatus: 1
                },
                fields: ["name"],
                limit_page_length: 1
            },
            callback: function (res) {
                if (res.message && res.message.length > 0) {

                    frm.add_custom_button('Asset Receipt', function () {
                        create_asset_receipt(frm);
                    }, 'Create');

                    frm.add_custom_button('Material Receipt', function () {
                        create_material_receipt(frm);
                    }, 'Create');

                    frm.add_custom_button(__("Submit to Company"), () => {
                        create_return_to_company(frm);
                    });

                    frm.page.btn_secondary
                        .find('.dropdown-toggle')
                        .addClass('btn-default');
                }
            }
        });
    }
});

// ============================================================
// HELPER — Create Asset Receipt (Asset Movement)
// ============================================================
function create_asset_receipt(frm) {
    const doc = frm.doc;

    if (!doc.machine_items || doc.machine_items.length === 0) {
        frappe.msgprint({
            title: __('No Assets'),
            indicator: 'red',
            message: __('No rows found in Machine Items table.')
        });
        return;
    }

    frappe.new_doc('Asset Movement', {}, function (new_doc) {
        new_doc.purpose                     = "Receipt";
        new_doc.company                     = doc.company;
        new_doc.custom_machine_installation = doc.name;
        new_doc.assets                      = [];

        (doc.machine_items || []).forEach(function (row) {
            if (!row.asset) return;
            let child             = frappe.model.add_child(new_doc, "assets");
            child.asset           = row.asset;
            child.source_location = "Demo Location";
            child.to_location     = "Office";
        });

        frappe.set_route('Form', 'Asset Movement', new_doc.name);
    });
}

// ============================================================
// HELPER — Create Material Receipt (Stock Entry)
// ============================================================
function create_material_receipt(frm) {
    const doc = frm.doc;

    const rows = (doc.table_uuer || []).filter(row => Number(row.issued_qty) > 0);

    if (!rows.length) {
        frappe.msgprint({
            title: __('No Items'),
            indicator: 'red',
            message: __('No items with Quantity to Issue > 0 found.')
        });
        return;
    }

    frappe.new_doc('Stock Entry', {}, function (new_doc) {
        new_doc.naming_series               = "MAT-STE-.YYYY.-";
        new_doc.stock_entry_type            = "Material Receipt";
        new_doc.purpose                     = "Material Receipt";
        new_doc.company                     = doc.company;
        new_doc.custom_machine_installation = doc.name;
        new_doc.items                       = [];

        let pending = rows.length;

        rows.forEach(function (row) {
            const item_name = row.item_code || row.item;

            frappe.call({
                method: "frappe.client.get",
                args: { doctype: "Item", name: item_name },
                callback: function (item_res) {
                    if (item_res.message) {
                        const item_doc = item_res.message;

                        let uom               = item_doc.stock_uom;
                        let conversion_factor = 1;

                        if (item_doc.uoms && item_doc.uoms.length > 0) {
                            uom               = item_doc.uoms[0].uom;
                            conversion_factor = item_doc.uoms[0].conversion_factor;
                        }

                        const qty = Number(row.issued_qty);
                        let child = frappe.model.add_child(new_doc, "items");

                        child.item_code         = item_name;
                        child.qty               = qty;
                        child.uom               = uom;
                        child.stock_uom         = item_doc.stock_uom;
                        child.conversion_factor = conversion_factor;
                        child.transfer_qty      = qty * conversion_factor;
                        child.s_warehouse       = doc.demo_location;
                        child.t_warehouse       = doc.material_warehouse;
                    }

                    pending--;
                    if (pending === 0) {
                        frappe.set_route('Form', 'Stock Entry', new_doc.name);
                    }
                }
            });
        });
    });
}

// === Create in Demo  ===

//=========
// OLD CODE
//=========
frappe.ui.form.on("Machine Installation and Un-Installation", {
    refresh(frm) {
        
        frm.page.clear_custom_buttons?.();

        if (!frm.doc.__islocal) {

            // frm.add_custom_button(__("Material Request"), () => {
            //     checkAndCreateMaterialRequest(frm);
            // }, __("Create"));
            if (frm.doc.installation_type === "Installation") {

                frm.add_custom_button(__("Asset Transfer"), () => {
                    create_asset_issue(frm);
                }, __("Create"));

                frm.add_custom_button(__("Material Transfer"), () => {
                    create_material_issue(frm);
                }, __("Create"));

                frm.add_custom_button(__("Maintenance Schedule"), () => {
                    create_maintenance_schedule(frm);
                }, __("Create"));
            }
            
            // Demo Installation buttons
            if (frm.doc.installation_type === "Demo Installation") {

                frm.add_custom_button(__("Asset Transfer"), () => {
                    create_asset_issue(frm);
                }, __("Create"));

                frm.add_custom_button(__("Material Transfer"), () => {
                    create_material_issue(frm);
                }, __("Create"));

                // Show "Submit to Company" only after Demo Uninstallation VL is submitted
                frappe.db.get_list("Visit Log", {
                    filters: {
                        machine_installation: frm.doc.name,
                        visit_type: "Demo Uninstallation",
                        docstatus: 1
                    },
                    fields: ["name"],
                    limit: 1
                }).then(res => {
                    if (res && res.length > 0) {
                        frm.add_custom_button(__("Submit to Company"), () => {
                            create_return_to_company(frm);
                        });
                    }
                });
            }

            frm.page.btn_secondary
                .find('[data-label="Create"]')
                .removeClass("btn-default")
                .addClass("btn-primary");
        }
    }
});

// ===============================
// Maintenance Schedule
// ===============================

// function create_maintenance_schedule(frm) {

//     // -------------------------------
//     // CHECK IF ALREADY EXISTS
//     // -------------------------------
//     frappe.call({
//         method: "frappe.client.get_list",
//         args: {
//             doctype: "Maintenance Schedule",
//             filters: {
//                 custom_machine_installation: frm.doc.name,
//                 docstatus: ["!=", 2]
//             },
//             fields: ["name"],
//             limit_page_length: 1
//         },
//         callback(res) {

//             if (res.message && res.message.length > 0) {

//                 let ms_name = res.message[0].name;

//                 frappe.msgprint({
//                     title: __("Already Created"),
//                     indicator: "orange",
//                     message: __(
//                         `Maintenance Schedule <a href="/app/maintenance-schedule/${ms_name}" target="_blank">${ms_name}</a> already exists.`
//                     )
//                 });
//                 return;
//             }

//             // -------------------------------
//             // FETCH DATA FROM SERVER
//             // -------------------------------
//             frappe.call({
//                 method: "get_asset_requirement_items",
//                 args: {
//                     machine_installation: frm.doc.name
//                 },
//                 callback(r) {

//                     let data = r.message || [];

//                     frappe.new_doc("Maintenance Schedule", {}, (doc) => {

//                         // -------------------------------
//                         // HEADER
//                         // -------------------------------
//                         doc.company                     = "AGVS ENTERPRISES PVT LTD";
//                         doc.contact_person              = frm.doc.contact_person;
//                         doc.address_display             = frm.doc.address;
//                         doc.contact_phone               = frm.doc.contact_mobile;
//                         doc.contact_email               = frm.doc.contact_email;
//                         doc.custom_machine_installation = frm.doc.name;
//                         doc.custom_sales_order          = frm.doc.sales_order;

//                         // -------------------------------
//                         // CHILD TABLE
//                         // -------------------------------
//                         data.forEach(d => {

//                             if (!d.item_code && !d.asset) return;

//                             let child = frappe.model.add_child(
//                                 doc,
//                                 "Maintenance Schedule Item",
//                                 "items"
//                             );

//                             child.custom_asset        = d.asset;
//                             child.custom_asset_name   = d.asset_name;
//                             child.item_code           = d.item_code;
//                             child.custom_capacity_qty = d.qty || 0;
//                         });

//                         // -------------------------------
//                         // OPEN FORM
//                         // -------------------------------
//                         frappe.set_route("Form", doc.doctype, doc.name);
//                     });
//                 }
//             });
//         }
//     });
// }

// function create_maintenance_schedule(frm) {

//     // -------------------------------
//     // AUTO SAVE (CRITICAL)
//     // -------------------------------
//     if (frm.is_dirty()) {
//         frm.save().then(() => {
//             create_maintenance_schedule(frm);
//         });
//         return;
//     }

//     // -------------------------------
//     // CHECK IF ALREADY EXISTS
//     // -------------------------------
//     frappe.call({
//         method: "frappe.client.get_list",
//         args: {
//             doctype: "Maintenance Schedule",
//             filters: {
//                 custom_machine_installation: frm.doc.name,
//                 docstatus: ["!=", 2]
//             },
//             fields: ["name"],
//             limit_page_length: 1
//         },
//         callback(res) {

//             if (res.message && res.message.length > 0) {

//                 let ms_name = res.message[0].name;

//                 frappe.msgprint({
//                     title: __("Already Created"),
//                     indicator: "orange",
//                     message:
//                         `Maintenance Schedule <a href="/app/maintenance-schedule/${ms_name}" target="_blank">${ms_name}</a> already exists.`
//                 });
//                 return;
//             }

//             // -------------------------------
//             // CALL API
//             // -------------------------------
//             frappe.call({
//                 method: "get_asset_requirement_items",
//                 args: {
//                     machine_installation: frm.doc.name
//                 },
//                 callback(r) {

//                     let data = r.message || [];

//                     // 🔥 DO NOT BLOCK IF EMPTY
//                     if (!data.length) {
//                         frappe.show_alert({
//                             message: "No data found, creating empty schedule",
//                             indicator: "orange"
//                         });
//                     }

//                     // -------------------------------
//                     // CREATE NEW DOC
//                     // -------------------------------
//                     frappe.new_doc("Maintenance Schedule");

//                     frappe.after_ajax(() => {

//                         let new_frm = cur_frm;

//                         // -------------------------------
//                         // HEADER
//                         // -------------------------------
//                         new_frm.set_value("company", "AGVS ENTERPRISES PVT LTD");
//                         new_frm.set_value("custom_machine_installation", frm.doc.name);

//                         // -------------------------------
//                         // CLEAR TABLE
//                         // -------------------------------
//                         new_frm.clear_table("items");

//                         // -------------------------------
//                         // ADD ROWS (SAFE LOGIC)
//                         // -------------------------------
//                         if (data.length) {

//                             data.forEach(d => {

//                                 let row = new_frm.add_child("items");

//                                 // Fill whatever is available
//                                 row.custom_asset = d.asset || "";
//                                 row.custom_asset_name = d.asset_name || "";
//                                 row.item_code = d.item_code || "";
//                                 row.custom_capacity_qty = d.qty || 0;

//                                 // Required defaults
//                                 row.start_date = frappe.datetime.nowdate();
//                                 row.end_date = frappe.datetime.add_months(frappe.datetime.nowdate(), 12);
//                                 row.no_of_visits = 12;
//                             });

//                         } else {
//                             // 🔥 CREATE ONE EMPTY ROW (optional but useful)
//                             let row = new_frm.add_child("items");

//                             row.start_date = frappe.datetime.nowdate();
//                             row.end_date = frappe.datetime.add_months(frappe.datetime.nowdate(), 12);
//                             row.no_of_visits = 12;
//                         }

//                         // -------------------------------
//                         // REFRESH TABLE
//                         // -------------------------------
//                         new_frm.refresh_field("items");
//                     });

//                 }
//             });
//         }
//     });
// }


function create_maintenance_schedule(frm) {

    if (frm.is_dirty()) {
        frm.save().then(() => create_maintenance_schedule(frm));
        return;
    }

    // Check if Maintenance Schedule already exists
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Maintenance Schedule",
            filters: { custom_machine_installation: frm.doc.name, docstatus: ["!=", 2] },
            fields: ["name"],
            limit_page_length: 1
        },
        callback(res) {
            if (res.message && res.message.length > 0) {
                let ms_name = res.message[0].name;
                frappe.msgprint({
                    title: __("Already Created"),
                    indicator: "orange",
                    message: `Maintenance Schedule <a href="/app/maintenance-schedule/${ms_name}" target="_blank">${ms_name}</a> already exists.`
                });
                return;
            }

            const machine_items = frm.doc.machine_items || [];
            if (!machine_items.length) {
                frappe.msgprint({ title: __("No Assets"), indicator: "red", message: __("Add assets in Machine Items first.") });
                return;
            }

            // Fetch contract dates from Sales Order, fall back to MI fields
            const proceed = (start_date, end_date) => {
                let pending = machine_items.length;
                let all_rows = [];

                machine_items.forEach(machine => {
                    if (!machine.asset) {
                        pending--;
                        if (pending === 0) open_ms(all_rows, start_date, end_date);
                        return;
                    }

                    frappe.db.get_doc("Asset", machine.asset).then(asset_doc => {
                        const req_items = asset_doc.custom_asset_requirement_item || [];

                        if (req_items.length) {
                            req_items.forEach(item => {
                                all_rows.push({
                                    asset:        machine.asset,
                                    asset_name:   machine.asset_name || machine.asset,
                                    item_code:    item.item_code || "",
                                    capacity_qty: item.capacity_qty || 0
                                });
                            });
                        } else {
                            all_rows.push({
                                asset: machine.asset, asset_name: machine.asset_name || machine.asset,
                                item_code: "", capacity_qty: 0
                            });
                        }

                        pending--;
                        if (pending === 0) open_ms(all_rows, start_date, end_date);
                    });
                });
            };

            const open_ms = (rows, start_date, end_date) => {
                frappe.new_doc("Maintenance Schedule", {}, (doc) => {
                    doc.company                     = frm.doc.company;
                    doc.custom_machine_installation = frm.doc.name;
                    doc.customer                    = frm.doc.customer || "";
                    doc.contact_person              = frm.doc.contact_person || "";

                    doc.items = [];
                    rows.forEach(r => {
                        let row               = frappe.model.add_child(doc, "Maintenance Schedule Item", "items");
                        row.custom_asset      = r.asset;
                        row.custom_asset_name = r.asset_name;
                        row.item_code         = r.item_code;
                        row.custom_capacity_qty = r.capacity_qty;
                        row.start_date        = start_date || "";
                        row.end_date          = end_date || "";
                        row.periodicity       = "Monthly";
                        row.no_of_visits      = frm.doc.no_of_visits || 12;
                    });

                    frappe.set_route("Form", "Maintenance Schedule", doc.name);
                });
            };

            if (frm.doc.sales_order) {
                frappe.db.get_doc("Sales Order", frm.doc.sales_order).then(so => {
                    proceed(
                        so.custom_contract_start_date || frm.doc.contract_start_date,
                        so.custom_contract_end_date   || frm.doc.contract_end_date
                    );
                });
            } else {
                proceed(frm.doc.contract_start_date, frm.doc.contract_end_date);
            }
        }
    });
}


// ===============================
// Material Request — check if exists, then create
// ===============================
function checkAndCreateMaterialRequest(frm) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Material Request",
            filters: {
                custom_machine_installation: frm.doc.name,
                docstatus: ["!=", 2]
            },
            fields: ["name"],
            limit_page_length: 1
        },
        callback(res) {
            if (res.message && res.message.length > 0) {
                let mr_name = res.message[0].name;
                frappe.msgprint({
                    title: __("Already Created"),
                    indicator: "orange",
                    message: __(
                        `Material Request <a href="/app/material-request/${mr_name}" target="_blank">${mr_name}</a> already exists for this Machine Installation.`
                    )
                });
                return;
            }
            createMaterialRequestFromMI(frm);
        }
    });
}

function createMaterialRequestFromMI(frm) {
    const today = frappe.datetime.get_today();
    const mi_rows = frm.doc.table_uuer || [];

    let items = mi_rows
        .filter(row => Number(row.issued_qty) > 0)
        .map(row => ({
            item_code: row.item_code || row.item,
            qty: Number(row.issued_qty),
            schedule_date: today,
            warehouse: frm.doc.material_warehouse
        }));

    if (!items.length) {
        frappe.msgprint({
            title: __("No Items"),
            indicator: "red",
            message: __("No item found with Issued Qty greater than 0.")
        });
        return;
    }

    const mr_doc = {
        doctype: "Material Request",
        material_request_type: "Material Transfer",
        purpose: "Material Transfer",
        company: frm.doc.company || frappe.defaults.get_default("company"),
        schedule_date: today,
        required_by: today,
        set_warehouse: frm.doc.material_warehouse,
        set_target_warehouse: frm.doc.material_warehouse,
        custom_machine_installation: frm.doc.name,
        items: items
    };

    frappe.call({
        method: "frappe.client.submit",
        args: { doc: mr_doc },
        freeze: true,
        freeze_message: __("Creating Material Request..."),
        callback(r) {
            if (r.message) {
                let mr = r.message.name;
                frappe.msgprint({
                    title: __("Created"),
                    indicator: "green",
                    message: __(
                        `Material Request <a href="/app/material-request/${mr}" target="_blank">${mr}</a> created successfully.`
                    )
                });
                frm.reload_doc();
            }
        },
        error(err) {
            console.error(err);
            frappe.msgprint({
                title: __("Error"),
                indicator: "red",
                message: __("Failed to create Material Request. Check console.")
            });
        }
    });
}

// ===============================
// Asset Movement (Issue for Installation, Transfer for Demo Installation)
// ===============================
function create_asset_issue(frm) {
    const is_demo = frm.doc.installation_type === "Demo Installation";
    const purpose = is_demo ? "Transfer" : "Transfer";

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Asset Movement",
            filters: {
                custom_machine_installation: frm.doc.name,
                purpose: purpose,
                docstatus: ["!=", 2]
            },
            fields: ["name"],
            limit_page_length: 1
        },
        callback(res) {
            if (res.message && res.message.length > 0) {
                let am_name = res.message[0].name;
                frappe.msgprint({
                    title: __("Already Created"),
                    indicator: "orange",
                    message: __(
                        `Asset Movement <a href="/app/asset-movement/${am_name}" target="_blank">${am_name}</a> already exists for this Machine Installation.`
                    )
                });
                return;
            }

            const machine_items = frm.doc.machine_items || [];

            if (!machine_items.length) {
                frappe.msgprint({
                    title: __("No Assets"),
                    indicator: "red",
                    message: __("No assets found in the Machine Items table.")
                });
                return;
            }

            // Fetch employee's Location via Location.custom_user = assigned_to
            frappe.db.get_list("Location", {
                filters: { custom_user: frm.doc.assigned_to },
                fields: ["name"],
                limit: 1
            }).then(loc_res => {
                const employee_location = (loc_res && loc_res[0]) ? loc_res[0].name : "";

                frappe.new_doc("Asset Movement", {}, async (doc) => {
                    doc.purpose                     = purpose;
                    doc.company                     = frm.doc.company;
                    doc.custom_machine_installation = frm.doc.name;
                    doc.assets = [];

                    for (let row of machine_items) {
                        if (!row.asset) continue;
                        let asset_doc = await frappe.db.get_doc("Asset", row.asset);
                        let child             = frappe.model.add_child(doc, "assets");
                        child.asset           = row.asset;
                        child.source_location = asset_doc.location || "";
                        child.target_location = employee_location;
                    }

                    frappe.set_route("Form", "Asset Movement", doc.name);
                });
            });
        }
    });
}

// ===============================
// Stock Entry (Material Issue)
// ===============================
function create_material_issue(frm) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Stock Entry",
            filters: {
                custom_machine_installation: frm.doc.name,
                stock_entry_type: "Material Transfer",
                docstatus: ["!=", 2]
            },
            fields: ["name"],
            limit_page_length: 1
        },
        callback(res) {
            if (res.message && res.message.length > 0) {
                let se_name = res.message[0].name;
                frappe.msgprint({
                    title: __("Already Created"),
                    indicator: "orange",
                    message: __(
                        `Stock Entry <a href="/app/stock-entry/${se_name}" target="_blank">${se_name}</a> already exists for this Machine Installation.`
                    )
                });
                return;
            }

            const mi_rows = frm.doc.table_uuer || [];
            const items   = mi_rows.filter(row => Number(row.issued_qty) > 0);

            if (!items.length) {
                frappe.msgprint({
                    title: __("No Items"),
                    indicator: "red",
                    message: __("No items found with Issued Qty greater than 0.")
                });
                return;
            }

            // Fetch employee warehouse via Warehouse.custom_user = assigned_to
            frappe.db.get_list("Warehouse", {
                filters: { custom_user: frm.doc.assigned_to },
                fields: ["name"],
                limit: 1
            }).then(wh_res => {
                const employee_warehouse = (wh_res && wh_res[0]) ? wh_res[0].name : "";

                frappe.new_doc("Stock Entry", {}, (doc) => {
                    doc.naming_series               = "MAT-STE-.YYYY.-";
                    doc.stock_entry_type            = "Material Transfer";
                    doc.purpose                     = "Material Transfer";
                    doc.company                     = frm.doc.company;
                    doc.custom_machine_installation = frm.doc.name;

                    doc.items = [];

                    let pending = items.length;

                    items.forEach(row => {
                        frappe.call({
                            method: "frappe.client.get",
                            args: { doctype: "Item", name: row.item_code || row.item },
                            callback(r) {
                                if (r.message) {
                                    let item_doc          = r.message;
                                    let uom               = item_doc.stock_uom;
                                    let conversion_factor = 1;

                                    if (item_doc.uoms && item_doc.uoms.length > 0) {
                                        uom               = item_doc.uoms[0].uom;
                                        conversion_factor = item_doc.uoms[0].conversion_factor;
                                    }

                                    let qty   = Number(row.issued_qty);
                                    let child = frappe.model.add_child(doc, "items");

                                    child.item_code         = row.item_code || row.item;
                                    child.qty               = qty;
                                    child.uom               = uom;
                                    child.stock_uom         = item_doc.stock_uom;
                                    child.conversion_factor = conversion_factor;
                                    child.transfer_qty      = qty * conversion_factor;
                                    child.s_warehouse       = frm.doc.material_warehouse;
                                    child.t_warehouse       = employee_warehouse;
                                }

                                pending--;
                                if (pending === 0) {
                                    frappe.set_route("Form", "Stock Entry", doc.name);
                                }
                            }
                        });
                    });
                });
            }); // end warehouse fetch
        }
    });
}

// ===============================
// Submit to Company — return asset + stock from employee back to company
// ===============================
function create_return_to_company(frm) {
    frappe.confirm(
        __("This will create an Asset Movement (Transfer) and a Stock Entry (Material Transfer) to return the demo asset and refill stock back to the company. Proceed?"),
        () => {
            frappe.call({
                method: "agvs_dev.agvs_dev.doctype.machine_installation_and_un_installation.machine_installation_and_un_installation.create_return_to_company",
                args: { mi_name: frm.doc.name },
                freeze: true,
                freeze_message: __("Creating return entries..."),
                callback(r) {
                    if (!r.exc && r.message) {
                        let links = [];
                        if (r.message.am) {
                            links.push(`Asset Movement: <a href="/app/asset-movement/${r.message.am}" target="_blank">${r.message.am}</a>`);
                        }
                        if (r.message.se) {
                            links.push(`Stock Entry: <a href="/app/stock-entry/${r.message.se}" target="_blank">${r.message.se}</a>`);
                        }
                        frappe.msgprint({
                            title: __("Submitted to Company"),
                            indicator: "green",
                            message: links.join("<br>") || __("No entries were created.")
                        });
                        frm.reload_doc();
                    }
                }
            });
        }
    );
}

// === Fetch Dates to Opportunity  ===
// // Client script on Machine Installation and Un-Installation doctype
// frappe.ui.form.on('Machine Installation and Un-Installation', {
//     actual_installation_date: function(frm) {
//         update_opportunity(frm);
//     },
//     actual_uninstallation_date: function(frm) {
//         update_opportunity(frm);
//     },
//     after_save: function(frm) {
//         update_opportunity(frm);
//     }
// });

// function update_opportunity(frm) {
//     if (frm.doc.hidden_opportunity_name) {
//         let values = {};

//         if (frm.doc.actual_installation_date) {
//             values['custom_actual_installation_date'] = frm.doc.actual_installation_date;
//         }
//         if (frm.doc.actual_uninstallation_date) {
//             values['custom_actual_uninstallation_date'] = frm.doc.actual_uninstallation_date;
//         }

//         if (Object.keys(values).length > 0) {
//             frappe.db.set_value('Opportunity', frm.doc.hidden_opportunity_name, values)
//                 .then(function() {
//                     frappe.show_alert({
//                         message: 'Opportunity dates updated successfully',
//                         indicator: 'green'
//                     });
//                 });
//         }
//     }
// }


frappe.ui.form.on('Machine Installation and Un-Installation', {
    after_save: function(frm) {
        update_opportunity(frm);
    }
});

function update_opportunity(frm) {
    if (!frm.doc.hidden_opportunity_name) return;

    let values = {};

    if (frm.doc.actual_installation_date) {
        values.custom_actual_installation_date = frm.doc.actual_installation_date;
    }

    if (frm.doc.actual_uninstallation_date) {
        values.custom_actual_uninstallation_date = frm.doc.actual_uninstallation_date;
    }

    if (Object.keys(values).length === 0) return;

    frappe.db.set_value(
        'Opportunity',
        frm.doc.hidden_opportunity_name,
        values
    ).then(() => {
        frappe.show_alert({
            message: 'Opportunity updated',
            indicator: 'green'
        });
    });
}

// === Strip HTML from address helper ===
function strip_address_html(val) {
    if (!val) return val;
    return val
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<[^>]+>/g, '')
        .trim();
}

// === Auto-set installation_type + fetch dates from Opportunity ===
frappe.ui.form.on('Machine Installation and Un-Installation', {
    sales_order(frm) {
        if (frm.doc.sales_order) {
            // Don't override if route_options already specifies installation_type (e.g. Uninstallation from SO button)
            const route_type = frappe.route_options && frappe.route_options.installation_type;
            if (!route_type && !frm.doc.installation_type) {
                frm.set_value('installation_type', 'Installation');
            }

            // Always fetch and clean address from Sales Order
            frappe.db.get_value('Sales Order', frm.doc.sales_order, 'address_display', function(r) {
                if (r && r.address_display) {
                    frm.set_value('address_display', strip_address_html(r.address_display));
                }
            });
        }
    },
    reference_name(frm) {
        if (frm.doc.reference_name) {
            frm.set_value('installation_type', 'Demo Installation');
        } else {
            frm.set_value('installation_type', '');
        }
    },
    refresh(frm) {
        // Strip <br> from address_display if present (happens when fetched from SO server-side)
        if (frm.doc.address_display && frm.doc.address_display.includes('<')) {
            const clean = strip_address_html(frm.doc.address_display);
            if (clean !== frm.doc.address_display) {
                frm.set_value('address_display', clean);
            }
        }

        // New MI from Opportunity — fetch planned dates directly from Opportunity
        if (frm.is_new() && frm.doc.reference_name && frm.doc.installation_type === "Demo Installation") {
            frappe.db.get_doc('Opportunity', frm.doc.reference_name).then(opp => {
                if (opp.custom_demo_installation_date && !frm.doc.planned_installation_date) {
                    frm.set_value('planned_installation_date', opp.custom_demo_installation_date);
                }
                if (opp.custom_demo_uninstallation_date_copy && !frm.doc.planned_uninstallation_date) {
                    frm.set_value('planned_uninstallation_date', opp.custom_demo_uninstallation_date_copy);
                }
            });
        }
    }
});

frappe.ui.form.on('Machine Installation and Un-Installation', {
    refresh(frm) {
        if (frm.doc.reference_name) {
            frm.set_df_property(
                'installation_type',
                'options',
                'Demo Installation'
            );
        }
    }
});



frappe.ui.form.on('Machine Installation and Un-Installation', {
    refresh(frm) {
        if (frm.doc.sales_order) {
            frm.set_df_property(
                'installation_type',
                'options',
                'Installation\nUninstallation'
            );

            // Force installation_type set via frappe.flags (route_options can't do this
            // reliably because the Select options aren't ready when route_options fires)
            if (frm.is_new() && frappe.flags.mi_force_installation_type) {
                const forced = frappe.flags.mi_force_installation_type;
                delete frappe.flags.mi_force_installation_type;
                frm.set_value('installation_type', forced);

                if (forced === 'Uninstallation') {
                    _copy_from_installation_mi(frm);
                }
            }
        }
    }
});

function _copy_from_installation_mi(frm) {
    frappe.db.get_list('Machine Installation and Un-Installation', {
        filters: {
            sales_order: frm.doc.sales_order,
            installation_type: 'Installation',
            docstatus: ['!=', 2]
        },
        fields: ['name'],
        limit: 1
    }).then(res => {
        if (!res || !res[0]) return;

        frappe.db.get_doc('Machine Installation and Un-Installation', res[0].name).then(inst => {
            if (inst.client_location)  frm.set_value('client_location',  inst.client_location);
            if (inst.client_warehouse) frm.set_value('client_warehouse', inst.client_warehouse);
            if (inst.contact_email)    frm.set_value('contact_email',    inst.contact_email);
            if (inst.contact_mobile)   frm.set_value('contact_mobile',   inst.contact_mobile);
            if (inst.address_display)  frm.set_value('address_display',  strip_address_html(inst.address_display));

            frm.clear_table('machine_items');
            (inst.machine_items || []).forEach(row => {
                let r = frm.add_child('machine_items');
                r.asset      = row.asset;
                r.asset_name = row.asset_name;
            });
            frm.refresh_field('machine_items');
        });
    });
}


// === Link material request to MI (removed) ===

// ===============================
// Check if MR already exists
// ===============================
function checkAndCreateMaterialRequest(frm) {

    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "Material Request",
            filters: {
                custom_machine_installation: frm.doc.name,
                docstatus: ["!=", 2]
            },
            fields: ["name"],
            limit_page_length: 1
        },
        callback: function (res) {

            // 🔒 MR already exists → show link only
            if (res.message && res.message.length > 0) {
                let mr_name = res.message[0].name;

                frappe.msgprint({
                    title: __("Already Created"),
                    indicator: "orange",
                    message: __(
                        `Material Request 
                        <a href="/app/material-request/${mr_name}" target="_blank">
                            ${mr_name}
                        </a> already exists for this Machine Installation.`
                    )
                });
                return;
            }

            // ❌ No MR → create new one
            createMaterialRequestFromMI(frm);
        }
    });
}

// ===============================
// Create Material Request
// ===============================
function createMaterialRequestFromMI(frm) {

    const today = frappe.datetime.get_today();
    const mi_rows = frm.doc.table_uuer || [];   // child table

    // 🔥 Use ONLY rows with issued_qty > 0
    let items = mi_rows
        .filter(row => Number(row.issued_qty) > 0)
        .map(row => ({
            item_code: row.item_code || row.item,
            qty: Number(row.issued_qty),
            schedule_date: today,
            warehouse: frm.doc.material_warehouse
        }));

    // ❌ Prevent empty MR
    if (!items.length) {
        frappe.msgprint({
            title: __("No Items"),
            indicator: "red",
            message: __("No item found with Issued Qty greater than 0.")
        });
        return;
    }

    const mr_doc = {
        doctype: "Material Request",
        material_request_type: "Material Transfer",
        purpose: "Material Transfer",
        company: frm.doc.company || frappe.defaults.get_default("company"),
        schedule_date: today,
        required_by: today,
        set_warehouse: frm.doc.material_warehouse,
        set_target_warehouse: frm.doc.material_warehouse,
        custom_machine_installation: frm.doc.name,
        items: items
    };

    frappe.call({
        method: "frappe.client.submit",
        args: { doc: mr_doc },
        freeze: true,
        freeze_message: __("Creating Material Request..."),
        callback: function (r) {
            if (r.message) {
                let mr = r.message.name;

                frappe.msgprint({
                    title: __("Created"),
                    indicator: "green",
                    message: __(
                        `Material Request 
                        <a href="/app/material-request/${mr}" target="_blank">
                            ${mr}
                        </a> created successfully.`
                    )
                });
            }
        },
        error: function (err) {
            console.error(err);
            frappe.msgprint({
                title: __("Error"),
                indicator: "red",
                message: __("Failed to create Material Request. Check console.")
            });
        }
    });
}


// === machine_items filter  ===
// frappe.ui.form.on("Machine Installation and Un-Installation", {
//     refresh(frm) {
//         frm.set_query("asset", "machine_items", () => ({
//             filters: {
//                 custom_machine_type: "Demo"
//             }
//         }));
//     }
// });


frappe.ui.form.on("Machine Installation and Un-Installation", {
    refresh(frm) {
        fetch_so_categories_and_set_query(frm);
    },

    installation_type(frm) {
        set_asset_query(frm);
    },

    sales_order(frm) {
        fetch_so_categories_and_set_query(frm);
    }
});

function fetch_so_categories_and_set_query(frm) {
    if (!frm.doc.sales_order) {
        frm._so_asset_categories = [];
        set_asset_query(frm);
        return;
    }
    frappe.db.get_doc('Sales Order', frm.doc.sales_order).then(so => {
        frm._so_asset_categories = (so.items || [])
            .map(r => r.custom_asset_category)
            .filter(Boolean);
        set_asset_query(frm);
    });
}

function set_asset_query(frm) {
    const is_demo = frm.doc.installation_type === "Demo Installation";
    const machine_type = is_demo ? "Demo" : "Regular";
    const filters = { custom_machine_type: machine_type, location: "Office" };

    // Category filter only applies for Sales/Service Agreement (Installation/Uninstallation),
    // not for Demo Installation which is linked via Opportunity, not Sales Order.
    if (!is_demo && frm._so_asset_categories && frm._so_asset_categories.length) {
        filters.asset_category = ["in", frm._so_asset_categories];
    }

    frm.set_query("asset", "machine_items", function() {
        return { filters: filters };
    });
}

// === Maintenance team  ===
// frappe.ui.form.on('Machine Installation and Un-Installation', {
//     refresh: set_user_filter,
//     maintenance_team: set_user_filter
// });

function set_user_filter(frm) {
    if (!frm.doc.maintenance_team) return;

    frappe.db.get_doc('Asset Maintenance Team', frm.doc.maintenance_team)
        .then(team => {
            let users = (team.maintenance_team_members || [])
                .map(r => r.team_member)
                .filter(Boolean);

            frm.set_query('assigned_to', () => ({
                filters: { name: ['in', users] }
            }));
        });
}


// === Mark as Completed Button ===
frappe.ui.form.on("Machine Installation and Un-Installation", {
    refresh(frm) {
        if (frm.is_new()) return;

        // Show for submitted docs that haven't been marked complete yet
        if (frm.doc.docstatus === 1 && !frm.doc.continue_with_subscription) {
            const needs_return = ["Uninstallation", "Demo Installation"].includes(frm.doc.installation_type);

            // For Uninstallation / Demo Installation: only allow after Submit to Company
            if (needs_return && !frm.doc.submitted_to_company) return;

            frm.add_custom_button(__("Mark as Completed"), () => {
                frappe.db.set_value(
                    "Machine Installation and Un-Installation",
                    frm.doc.name,
                    { status: "Completed", continue_with_subscription: 1 }
                ).then(() => frm.reload_doc());
            });
        }
    }
});


// === Material request item in MI  ===
// ---------------------------
// Child Table: Machine Items — prevent duplicate Asset
// ---------------------------
frappe.ui.form.on("Machine Item", {
    asset(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.asset) return;

        const duplicate = (frm.doc.machine_items || []).some(
            d => d.name !== cdn && d.asset === row.asset
        );

        if (duplicate) {
            frappe.model.set_value(cdt, cdn, "asset", "");
            frappe.model.set_value(cdt, cdn, "asset_name", "");
            frappe.msgprint({
                title: __("Duplicate Asset"),
                indicator: "red",
                message: __("Asset {0} is already added in another row.", [row.asset])
            });
        }
    }
});

// ---------------------------
// Child Table: Requirement Item(s) (table_uuer) — prevent duplicate Item Code
// ---------------------------
frappe.ui.form.on("Asset Material Request Item", {
    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

        const duplicate = (frm.doc.table_uuer || []).some(
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

// ---------------------------
// Helper: fill Requirement Items
// ---------------------------
function fill_requirement_items_from_assets(frm) {
    // 1) Material Warehouse must be selected
    if (!frm.doc.material_warehouse) {
        frappe.msgprint(__("Please select Material Warehouse first."));
        return;
    }

    // 2) Machine Items / Assets check
    if (!frm.doc.machine_items || frm.doc.machine_items.length === 0) {
        frappe.msgprint(__("Please add Machine Items with Asset first."));
        return;
    }

    const assets = frm.doc.machine_items
        .map(d => d.asset)
        .filter(Boolean);

    if (!assets.length) {
        frappe.msgprint(__("No Asset found in Machine Items."));
        return;
    }

    // 3) target child table on Machine Installation and Un-Installation
    const target_child_table = "table_uuer";   // Requirement Item(s) fieldname

    // Clear old rows
    frm.clear_table(target_child_table);

    let pending = assets.length;

    assets.forEach(asset_name => {
        // Get each Asset doc and read its custom_asset_requirement_item child table
        frappe.db.get_doc("Asset", asset_name).then(asset_doc => {

            // Asset child table: custom_asset_requirement_item
            (asset_doc.custom_asset_requirement_item || []).forEach(row => {
                if (!row.item_code) return;

                const child = frm.add_child(target_child_table);
                child.item_code    = row.item_code;

                // -----------------------------
                // REQUIRED CHANGE (as requested):
                // required_qty = capacity_qty
                // -----------------------------
                child.required_qty = row.capacity_qty || 0;

                // Track which asset / category this requirement item belongs to,
                // so the per-asset Demo Quantity limit can be validated.
                child.asset          = asset_name;
                child.asset_category = asset_doc.asset_category;

                // If your table_uuer has a warehouse field:
                // child.warehouse = frm.doc.material_warehouse;
            });

            pending--;
            if (pending === 0) {
                frm.refresh_field(target_child_table);
            }
        });
    });
}

// ---------------------------
// Main Doctype: Machine Installation
// ---------------------------
frappe.ui.form.on("Machine Installation and Un-Installation", {
    refresh(frm) {
    
    },

    // If the form already has a button field "get_materials_for_transfer"
    get_materials_for_transfer(frm) {
        fill_requirement_items_from_assets(frm);
    }
});


// === Office hide from client location  ===
frappe.ui.form.on("Machine Installation and Un-Installation", {
    refresh(frm) {
        frm.set_query("client_location", () => ({
            filters: { name: ["!=", "Office"] }
        }));
    }
});


// === Demo Quantity limit per Asset Category (instant feedback) ===
// For Demo Installation: per asset, the total "Quantity to Issue" of its requirement
// items must not exceed the asset's Asset Category "Demo Quantity".
// (Hard enforcement is done server-side in validate(); this is only for instant UX.)
frappe.ui.form.on('Asset Material Request Item', {
    issued_qty: function(frm, cdt, cdn) {
        if (frm.doc.installation_type !== "Demo Installation") return;

        const row = locals[cdt][cdn];
        const category = row.asset_category;
        if (!category) return;

        // Total issued_qty for all rows of the SAME asset
        const asset_total = (frm.doc.table_uuer || [])
            .filter(d => d.asset === row.asset)
            .reduce((sum, d) => sum + (Number(d.issued_qty) || 0), 0);

        frappe.db.get_value("Asset Category", category, "custom_demo_quantity").then(r => {
            const limit = (r && r.message) ? Number(r.message.custom_demo_quantity) || 0 : 0;
            if (limit && asset_total > limit) {
                frappe.msgprint({
                    title: __("Demo Quantity Exceeded"),
                    indicator: "red",
                    message: __(
                        "Asset {0} (Category {1}): total Quantity to Issue ({2}) exceeds the Demo Quantity limit ({3}).",
                        [row.asset, category, asset_total, limit]
                    )
                });
            }
        });
    }
});

// === Update status from visit log  ===
// frappe.ui.form.on('Machine Installation and Un-Installation', {
//     refresh: function(frm) {
//         if (!frm.doc.name || frm.is_new()) return;

//         frappe.db.get_list('Visit Log', {
//             filters: {
//                 machine_installation: frm.doc.name,
//                 maintenance_status: 'Completed'
//             },
//             fields: ['visit_type']
//         }).then(function(data) {
//             let installation_done = false;
//             let uninstallation_done = false;

//             data.forEach(function(row) {
//                 if (row.visit_type === 'Demo Installation') {
//                     installation_done = true;
//                 }
//                 if (row.visit_type === 'Demo Uninstallation') {
//                     uninstallation_done = true;
//                 }
//             });

//             let new_status = null;

//             if (uninstallation_done) {
//                 new_status = 'Demo Uninstallation Completed';
//             } else if (installation_done) {
//                 new_status = 'Demo Installation Completed';
//             }

//             // Save directly to DB without making form dirty
//             if (new_status && frm.doc.status !== new_status) {
//                 frappe.db.set_value(
//                     'Machine Installation and Un-Installation',
//                     frm.doc.name,
//                     'status',
//                     new_status
//                 ).then(function() {
//                     // frm.reload_doc(); // Reload to reflect the saved value
//                     frm.set_value('status', new_status);
//                 });
//             }
//         });
//     }
// });


frappe.ui.form.on('Machine Installation and Un-Installation', {
    refresh: function(frm) {

        // ✅ Run only once per load
        if (frm.__status_checked) return;
        frm.__status_checked = true;

        // ✅ Skip new docs
        if (!frm.doc.name || frm.is_new()) return;

        frappe.db.get_list('Visit Log', {
            filters: {
                machine_installation: frm.doc.name,
                maintenance_status: 'Completed'
            },
            fields: ['visit_type']
        }).then(function(data) {

            let installation_done = false;
            let uninstallation_done = false;

            data.forEach(function(row) {
                if (row.visit_type === 'Demo Installation') {
                    installation_done = true;
                }
                if (row.visit_type === 'Demo Uninstallation') {
                    uninstallation_done = true;
                }
            });

            let new_status = null;

            if (uninstallation_done) {
                new_status = 'Demo Uninstallation Completed';
            } else if (installation_done) {
                new_status = 'Demo Installation Completed';
            }

            // ✅ Only update if needed
            if (new_status && frm.doc.status !== new_status) {

                frappe.db.set_value(
                    'Machine Installation and Un-Installation',
                    frm.doc.name,
                    'status',
                    new_status
                ).then(() => {

                    // ✅ Fetch updated value WITHOUT making form dirty
                    frappe.db.get_value(
                        'Machine Installation and Un-Installation',
                        frm.doc.name,
                        'status'
                    ).then(r => {
                        if (r && r.message) {
                            frm.doc.status = r.message.status;

                            // ✅ Refresh field ONLY (no dirty flag)
                            frm.refresh_field('status');
                        }
                    });

                });
            }
        });
    }
});

// === Visit log dates to machine installation (disabled) ===
// frappe.ui.form.on('Machine Installation', {

//     refresh: function(frm) {

//         if (frm.doc.name) {

//             frappe.db.get_list('Visit Log', {
//                 filters: {
//                     machine_installation: frm.doc.name
//                 },
//                 fields: ['visit_type', 'completion_date_and_time'],
//                 order_by: 'completion_date_and_time desc'
//             }).then(function(data) {

//                 data.forEach(function(row) {

//                     if (row.visit_type === "Demo Installation" && row.completion_date_and_time) {
//                         frm.set_value('actual_installation_date', row.completion_date_and_time);
//                     }

//                     if (row.visit_type === "Demo Uninstallation" && row.completion_date_and_time) {
//                         frm.set_value('actual_uninstallation_date', row.completion_date_and_time);
//                     }

//                 });

//             });

//         }

//     }

// });






// frappe.ui.form.on('Machine Installation and Un-Installation', {
//     refresh: function(frm) {

//         if (frm.doc.name) {

//             frappe.db.get_list('Visit Log', {
//                 filters: {
//                     machine_installation: frm.doc.name
//                 },
//                 fields: ['visit_type', 'completion_date_and_time']
//             }).then(function(data) {

//                 data.forEach(function(row) {

//                     if (row.completion_date_and_time) {

//                         if (row.visit_type === "Demo Installation") {
//                             frm.set_value(
//                                 'actual_installation_date',
//                                 row.completion_date_and_time
//                             );
//                         }

//                         if (row.visit_type === "Demo Uninstallation") {
//                             frm.set_value(
//                                 'actual_uninstallation_date',
//                                 row.completion_date_and_time
//                             );
//                         }

//                     }

//                 });

//             });

//         }

//     }
// });



// frappe.ui.form.on('Visit Log', {
//     machine_installation: function(frm) {
//         if (frm.doc.machine_installation) {
//             frappe.db.get_value(
//                 'Machine Installation and Un-Installation',
//                 frm.doc.machine_installation,
//                 'address',
//                 function(r) {
//                     if (r && r.address) {
//                         frm.set_value('address', r.address);
//                         frm.refresh_field('address');
//                     }
//                 }
//             );
//         }
//     },

//     refresh: function(frm) {
//         // Auto-fetch address if machine_installation is set but address is empty
//         if (frm.doc.machine_installation && !frm.doc.address) {
//             frappe.db.get_value(
//                 'Machine Installation and Un-Installation',
//                 frm.doc.machine_installation,
//                 'address',
//                 function(r) {
//                     if (r && r.address) {
//                         frm.set_value('address', r.address);
//                         frm.refresh_field('address');
//                     }
//                 }
//             );
//         }
//     }
// });


frappe.ui.form.on('Machine Installation and Un-Installation', {
    refresh: function(frm) {

        if (!frm.doc.name || frm.is_new()) return;

        // ✅ prevent multiple calls
        if (frm._visit_log_fetched) return;
        frm._visit_log_fetched = true;

        frappe.db.get_list('Visit Log', {
            filters: {
                machine_installation: frm.doc.name
            },
            fields: ['visit_type', 'completion_date_and_time']
        }).then(function(data) {

            let installation_date = null;
            let uninstallation_date = null;

            data.forEach(function(row) {
                if (!row.completion_date_and_time) return;

                if (row.visit_type === "Demo Installation") {
                    installation_date = row.completion_date_and_time;
                }

                if (row.visit_type === "Demo Uninstallation") {
                    uninstallation_date = row.completion_date_and_time;
                }
            });

            // ✅ ONLY update if needed
            let updated = false;

            if (
                installation_date &&
                frm.doc.actual_installation_date !== installation_date
            ) {
                frm.doc.actual_installation_date = installation_date;
                updated = true;
            }

            if (
                uninstallation_date &&
                frm.doc.actual_uninstallation_date !== uninstallation_date
            ) {
                frm.doc.actual_uninstallation_date = uninstallation_date;
                updated = true;
            }

            // ✅ refresh UI WITHOUT dirty state
            if (updated) {
                frm.refresh_field('actual_installation_date');
                frm.refresh_field('actual_uninstallation_date');

                // 🔥 VERY IMPORTANT: reset dirty flag
                frm.dirty = false;
            }

        });
    }
});

// === VL dates to MI dates  ===
frappe.ui.form.on('Machine Installation and Un-Installation', {
    refresh: function(frm) {

        if (!frm.doc.name || frm.is_new()) return;

        frappe.db.get_list('Visit Log', {
            filters: {
                machine_installation: frm.doc.name   // 🔥 confirm fieldname
            },
            fields: ['visit_type', 'completion_date_and_time'],
            order_by: 'creation desc'
        }).then(data => {

            console.log("Visit Logs:", data);

            if (!data || !data.length) return;

            let install_date = null;
            let uninstall_date = null;

            data.forEach(row => {

                if (!row.completion_date_and_time) return;

                // ✅ Demo Installation CASE
                if (frm.doc.installation_type === "Demo Installation") {

                    if (row.visit_type === "Demo Installation") {
                        install_date = row.completion_date_and_time;
                    }

                    if (row.visit_type === "Demo Uninstallation") {
                        uninstall_date = row.completion_date_and_time;
                    }
                }

                // ✅ NORMAL INSTALLATION
                if (frm.doc.installation_type === "Installation") {

                    if (row.visit_type === "Installation") {
                        install_date = row.completion_date_and_time;
                    }
                }

                // ✅ NORMAL UNINSTALLATION
                if (frm.doc.installation_type === "Uninstallation") {

                    if (row.visit_type === "Uninstallation") {
                        uninstall_date = row.completion_date_and_time;
                    }
                }
            });

            // Set without making form dirty
            if (install_date && frm.doc.actual_installation_date !== install_date) {
                frm.doc.actual_installation_date = install_date;
                frm.refresh_field('actual_installation_date');
            }

            if (uninstall_date && frm.doc.actual_uninstallation_date !== uninstall_date) {
                frm.doc.actual_uninstallation_date = uninstall_date;
                frm.refresh_field('actual_uninstallation_date');
            }
        });
    }
});

