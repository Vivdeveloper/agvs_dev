// === Sales @ (disabled) ===
frappe.ui.form.on('Sales Order', {
    refresh: function(frm) {
        // frm.add_custom_button(__('Machine Installation'), function() {

        //     frappe.new_doc('Machine Installation', {
        //         sales_order: frm.doc.name,
        //         planned_installation_date: frm.doc.planned_installation_date,
        //         planned_uninstallation_date: frm.doc.delivery_date,
        //         assigned_to: frappe.session.user,
        //         status: 'Open',
        //         installation_type: ''
        //     });

        //     // ✅ force set after form loads
        //     frappe.after_ajax(() => {
        //         if (cur_frm && cur_frm.doctype === "Machine Installation") {
        //             cur_frm.set_value(
        //                 "client_location",
        //                 frm.doc.shipping_address_name
        //             );
        //         }
        //     });

        // });
    }
});


// === sales order  ===
// // frappe.ui.form.on('Sales Order', {
// //     refresh: function(frm) {

// //         // Show button ONLY when document is submitted
// //         if (frm.doc.docstatus === 1) {

// //             frm.add_custom_button(__('Machine Installation and Un-Installation'), function() {
// //                 frappe.new_doc('Machine Installation and Un-Installation', {
// //                     sales_order: frm.doc.name,
// //                     planned_installation_date: frm.doc.planned_installation_date,
// //                     planned_uninstallation_date: frm.doc.delivery_date,
// //                     assigned_to: frappe.session.user,
// //                     status: 'To Deliver and Bill',
// //                     installation_type: ''
// //                 });
// //             });

// //         }
// //     }
// // });


// frappe.ui.form.on('Sales Order', {
//     refresh: function(frm) {
//         if (frm.doc.docstatus === 1) {
//             frm.add_custom_button(__('Machine Installation and Un-Installation'), function() {
//                 frappe.new_doc('Machine Installation and Un-Installation', {
//                     sales_order: frm.doc.name,
//                     planned_installation_date: frm.doc.planned_installation_date,
//                     planned_uninstallation_date: frm.doc.delivery_date,
//                     assigned_to: frappe.session.user,
//                     status: 'To Deliver and Bill',
//                     installation_type: 'Installation',
//                     contact_person: frm.doc.contact_person,
//                     address: frm.doc.address_display,
//                     contact_mobile: frm.doc.contact_phone,
//                     contact_email: frm.doc.contact_email,
//                     company: frm.doc.company,
//                 });
//             });
//         }
//     }
// });


// frappe.ui.form.on('Sales Order', {
//     refresh: function(frm) {
//         if (frm.doc.docstatus === 1) {
//             frm.add_custom_button(__('Machine Installation and Un-Installation'), function() {
//                 frappe.new_doc('Machine Installation and Un-Installation', {}, function(doc) {
//                     doc.sales_order                  = frm.doc.name;
//                     doc.planned_installation_date    = frm.doc.planned_installation_date;
//                     doc.planned_uninstallation_date  = frm.doc.delivery_date;
//                     doc.assigned_to                  = frappe.session.user;
//                     doc.status                       = 'To Deliver and Bill';
//                     doc.installation_type            = 'Installation';
//                     doc.contact_person               = frm.doc.contact_person;
//                     doc.address                      = frm.doc.address_display;
//                     doc.contact_mobile               = frm.doc.contact_phone;
//                     doc.contact_email                = frm.doc.contact_email;
//                     doc.company                      = frm.doc.company;

//                     frappe.set_route('Form', 'Machine Installation and Un-Installation', doc.name);
//                 });
//             });
//         }
//     }
// });



// frappe.ui.form.on('Sales Order', {
//     refresh: function(frm) {
//         if (frm.doc.docstatus === 1) {
//             frm.add_custom_button(__('Machine Installation and Un-Installation'), function() {

//                 frappe.new_doc('Machine Installation and Un-Installation', {}, function(doc) {

//                     // -------------------------------
//                     // Parent Fields
//                     // -------------------------------
//                     doc.sales_order                  = frm.doc.name;
//                     doc.planned_installation_date    = frm.doc.planned_installation_date;
//                     doc.planned_uninstallation_date  = frm.doc.delivery_date;
//                     // doc.assigned_to                  = frappe.session.user;
//                     doc.status                       = 'To Deliver and Bill';
//                     doc.installation_type            = 'Installation';
//                     doc.contact_person               = frm.doc.contact_person;
//                     doc.address                      = frm.doc.address_display;
//                     doc.contact_mobile               = frm.doc.contact_phone;
//                     doc.contact_email                = frm.doc.contact_email;
//                     doc.company                      = "AGVS ENTERPRISES PVT LTD";
                    

//                     // -------------------------------
//                     // Child Table Mapping
//                     // -------------------------------
//                     // (frm.doc.items || []).forEach(function(item) {

//                     //     let row = frappe.model.add_child(doc, "machine_items");

//                     //     // Asset is not available yet → keep empty
//                     //     row.asset = "";

//                     //     // Use item details
//                     //     row.asset_name = item.item_name;

//                     //     // Optional (recommended if fields exist)
//                     //     row.asset = item.item_code;
//                     //     row.qty = item.qty;
//                     //     row.uom = item.uom;

//                     // });

//                     // -------------------------------
//                     // Open Form
//                     // -------------------------------
//                     frappe.set_route('Form', 'Machine Installation and Un-Installation', doc.name);
//                 });

//             });
//         }
//     }
// });




// frappe.ui.form.on('Sales Order', {
//     refresh: function(frm) {
//         if (frm.doc.docstatus === 1) {
//             frm.add_custom_button(__('Machine Installation and Un-Installation'), function() {
                
//                 frappe.new_doc('Machine Installation and Un-Installation', {
//                     sales_order: frm.doc.name,
//                     customer: frm.doc.customer,   // ✅ FIX
//                     planned_installation_date: frm.doc.planned_installation_date,
//                     planned_uninstallation_date: frm.doc.delivery_date,
//                     status: 'To Deliver and Bill',
//                     installation_type: 'Installation',
//                     contact_person: frm.doc.contact_person,
//                     contact_mobile: frm.doc.contact_phone,
//                     contact_email: frm.doc.contact_email,
//                     company: frm.doc.company,
//                     address: frm.doc.address_display
//                 });

//             });
//         }
//     }
// });


frappe.ui.form.on('Sales Order', {
    refresh: function(frm) {
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Machine Installation and Un-Installation'), function() {

                frappe.db.get_list('Machine Installation and Un-Installation', {
                    filters: [
                        ['sales_order', '=', frm.doc.name],
                        ['docstatus', '!=', 2]
                    ],
                    fields: ['name', 'installation_type'],
                    limit: 10
                }).then(mis => {
                    console.log('Existing MIs for this SO:', mis);
                    const has_installation   = mis.some(m => m.installation_type === 'Installation');
                    const has_uninstallation = mis.some(m => m.installation_type === 'Uninstallation');

                    if (has_installation && has_uninstallation) {
                        frappe.msgprint({
                            title: __('Already Created'),
                            indicator: 'orange',
                            message: __('Both Installation and Uninstallation records have already been created for this Sales Order.')
                        });
                        return;
                    }

                    let clean_address = (frm.doc.address_display || '')
                        .replace(/<br\s*\/?>/gi, '\n')
                        .replace(/<\/?[^>]+(>|$)/g, "");

                        
                    console.log(has_installation,"hasinstallation")
                    if (!has_installation) {
                        // Create Installation MI
                        frappe.route_options = {
                            sales_order:                frm.doc.name,
                            customer:                   frm.doc.customer,
                            planned_installation_date:  frm.doc.planned_installation_date,
                            planned_uninstallation_date: frm.doc.delivery_date,
                            installation_type:          'Installation',
                            contact_person:             frm.doc.contact_person,
                            contact_mobile:             frm.doc.contact_phone,
                            contact_email:              frm.doc.contact_email,
                            company:                    frm.doc.company,
                            no_of_visits:               frm.doc.qty,
                            address_display:            clean_address
                        };
                    } else {
                        // Installation exists → create Uninstallation MI
                        // Use frappe.flags to carry the type across the route change —
                        // route_options are nulled before triggers fire, and the Select field
                        // won't accept 'Uninstallation' until refresh sets its options.
                        frappe.flags.mi_force_installation_type = 'Uninstallation';
                        frappe.route_options = {
                            sales_order:       frm.doc.name,
                            customer:          frm.doc.customer,
                            contact_person:    frm.doc.contact_person,
                            contact_mobile:    frm.doc.contact_phone,
                            contact_email:     frm.doc.contact_email,
                            company:           frm.doc.company,
                            address_display:   clean_address
                        };
                    }

                    frappe.new_doc('Machine Installation and Un-Installation');
                });
            });
        }
    }
});

