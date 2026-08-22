// === Annual Revenue Calculation  ===
frappe.ui.form.on('Opportunity', {
    onload: function(frm) {
        if (frm.is_new()) {
            frm.set_value('opportunity_type', '');
        }
    },
    custom_months(frm) {
        calculate_opportunity_amount(frm);
    },
    custom_income(frm) {
        calculate_opportunity_amount(frm);
    }
});

function set_opportunity_dynamic_link(frm) {
    if (frm.is_new() || !frm.doc.name) {
        return;
    }

    frappe.dynamic_link = {
        doctype: frm.doc.doctype,
        doc: frm.doc,
        fieldname: "name",
    };
}

function calculate_opportunity_amount(frm) {
    const months = flt(frm.doc.custom_months);
    const income = flt(frm.doc.custom_income);

    frm.set_value(
        'opportunity_amount',
        months * income
    );
}

frappe.ui.form.on('Opportunity', {
    refresh(frm) {

        // remove default buttons
        frm.remove_custom_button('Supplier Quotation', 'Create');
        frm.remove_custom_button('Request For Quotation', 'Create');
        frm.remove_custom_button('Quotation', 'Create');
        frm.remove_custom_button('Customer', 'Create');

        // clear create menu
        // frm.page.clear_menu();

        // hide create button for these stages
        if (["1. Qualify", "2. Introduction Meeting"].includes(frm.doc.sales_stage)) {
            return;
        }

        // show only Customer when Won
        if (frm.doc.sales_stage === "7. Won") {
            frm.add_custom_button(__('Customer'), function () {
                frappe.model.open_mapped_doc({
                    method: "erpnext.crm.doctype.lead.lead.make_customer",
                    frm: frm
                });
            }, __('Create'));
        }

        // show Quotation for other stages
        else {
            frm.add_custom_button(__('Quotation'), function () {
                frappe.model.open_mapped_doc({
                    method: "erpnext.crm.doctype.opportunity.opportunity.make_quotation",
                    frm: frm
                });
            }, __('Create'));
        }

        // Address button — always visible on saved docs
        if (!frm.is_new()) {
            frm.add_custom_button(__('Address'), function () {
                set_opportunity_dynamic_link(frm);
                frappe.route_options = {
                    address_title: frm.doc.customer_name || frm.doc.contact_person || frm.doc.name,
                    address_type: 'Billing'
                };
                frappe.new_doc('Address');
            }, __('Create'));
        }

        set_opportunity_dynamic_link(frm);
    }
});

// === From Lead to Opportunity  ===
frappe.ui.form.on('Opportunity', {
    lead: function(frm) {
        if (frm.doc.lead) {
            frappe.call({
                method: "frappe.client.get",
                args: {
                    doctype: "Lead",
                    name: frm.doc.lead
                },
                callback: function(r) {
                    if (r.message) {
                        const lead = r.message;

                        // Map fields from Lead → Opportunity
                        frm.set_value('contact_person', lead.first_name);
                        frm.set_value('contact_email', lead.email_id || lead.email);
                        frm.set_value('customer_name', lead.company_name || lead.organization_name);
                        frm.set_value('contact_mobile', lead.mobile_no);
                        frm.set_value('phone', lead.phone);
                        frm.set_value('segment', lead.segment);
                        frm.set_value('territory', lead.territory);
                        frm.set_value('website', lead.website);
                        frm.set_value('type', lead.type);
                        frm.set_value('no_of_employees', lead.no_of_employees);
                        frm.set_value('annual_revenue', lead.annual_revenue);
                        frm.set_value('priority', lead.priority);
                        frm.set_value('purchasing_model', lead.purchasing_model);
                        frm.set_value('partnership_potential', lead.partnership_potential);
                        frm.set_value('payment_reliability_score', lead.payment_reliability_score);
                        frm.set_value('brand_visibility_potential', lead.brand_visibility_potential);
                        frm.set_value('referenceable', lead.referenceable);
                        frm.set_value('request_type', lead.request_type);
                        frm.set_value('industry', lead.industry);

                        // Auto-fetch address from Lead
                        frappe.call({
                            method: 'frappe.contacts.doctype.address.address.get_default_address',
                            args: { doctype: 'Lead', name: frm.doc.lead },
                            callback: function(addr_r) {
                                if (addr_r.message) {
                                    frm.set_value('customer_address', addr_r.message);
                                } else {
                                    let parts = [
                                        lead.custom_address_link,
                                        lead.city,
                                        lead.state,
                                        lead.country
                                    ].filter(Boolean);
                                    if (parts.length) {
                                        frm.set_value('address_display', parts.join('\n'));
                                    }
                                }
                            }
                        });
                    }
                }
            });
        }
    }
});


// === Machine Installation Dates to Opportunity  ===
frappe.ui.form.on('Opportunity', {
    refresh: function(frm) {

        if (frm.doc.name) {

            frappe.db.get_list('Machine Installation and Un-Installation', {
                filters: {
                    reference_name: frm.doc.name
                },
                fields: ['actual_installation_date', 'actual_uninstallation_date']
            }).then(function(data) {

                console.log("Machine Installation and Un-Installation:", data);

                data.forEach(function(row) {

                    if (row.actual_installation_date) {
                        frm.set_value(
                            'custom_actual_installation_date',
                            row.actual_installation_date
                        );
                    }

                    if (row.actual_uninstallation_date) {
                        frm.set_value(
                            'custom_actual_uninstallation_date',
                            row.actual_uninstallation_date
                        );
                    }

                });

            });

        }

    }
});


// === Menu in Opportunity (disabled) ===
frappe.ui.form.on('Opportunity', {
    refresh(frm) {

        // Avoid duplicate menu items on refresh
        frm.page.clear_menu();

        // ---- Default Menu Items (like Lead) ----

        // Print
        frm.page.add_menu_item(__('Print'), () => {
            frappe.ui.form.print_doc(frm);
        });

        // Email
        frm.page.add_menu_item(__('Email'), () => {
            frm.email_doc();
        });

        // Jump to field
        frm.page.add_menu_item(__('Jump to field'), () => {
            frappe.ui.keys.show_keyboard_shortcuts();
        });

        // Links
        frm.page.add_menu_item(__('Links'), () => {
            frappe.utils.show_links_doc(frm.doc);
        });

        // Duplicate
        frm.page.add_menu_item(__('Duplicate'), () => {
            frappe.model.copy_doc(frm.doc);
        });

        // Copy to Clipboard
        frm.page.add_menu_item(__('Copy to Clipboard'), () => {
            frappe.utils.copy_to_clipboard(JSON.stringify(frm.doc));
            frappe.msgprint("Copied to clipboard");
        });

        // Rename
        frm.page.add_menu_item(__('Rename'), () => {
            frappe.model.rename_doc(frm.doctype, frm.docname);
        });

        // Reload
        frm.page.add_menu_item(__('Reload'), () => {
            frm.reload_doc();
        });

        // Delete
        frm.page.add_menu_item(__('Delete'), () => {
            frappe.call({
                method: "frappe.client.delete",
                args: {
                    doctype: frm.doc.doctype,
                    name: frm.doc.name
                },
                callback: () => {
                    frappe.set_route('List', 'Opportunity');
                }
            });
        });

        // Remind Me
        frm.page.add_menu_item(__('Remind Me'), () => {
            new frappe.ui.form.AssignToDialog({
                doc: frm.doc,
                method: "frappe.desk.form.utils.add_reminder"
            });
        });

        // Undo
        frm.page.add_menu_item(__('Undo'), () => {
            frappe.ui.undo_manager.undo();
        });

        // Redo
        frm.page.add_menu_item(__('Redo'), () => {
            frappe.ui.undo_manager.redo();
        });

        // Customize
        frm.page.add_menu_item(__('Customize'), () => {
            frappe.set_route('Form', 'Customize Form', frm.doctype);
        });

    }
});

frappe.ui.form.on('Opportunity', {
    refresh(frm) {
        if (frm.doc.sales_stage === "3. Demo") {

            frm.add_custom_button(__('Create Demo Installation'), async () => {

                let formatted_address = '';

                if (frm.doc.customer_address) {
                    try {
                        let addr = await frappe.db.get_doc('Address', frm.doc.customer_address);
                        formatted_address = [
                            addr.address_line1,
                            addr.address_line2,
                            addr.city,
                            addr.state,
                            addr.pincode,
                            addr.country
                        ].filter(Boolean).join(',\n');
                    } catch (err) {
                        console.warn("Could not fetch Address doc:", err);
                    }
                }

                frappe.route_options = {
                    opportunity: frm.doc.name,
                    reference_name: frm.doc.name,
                    contact_person: frm.doc.contact_person,
                    contact_email: frm.doc.contact_email,
                    contact_mobile: frm.doc.contact_mobile,
                    address_display: formatted_address
                };

                frappe.new_doc('Machine Installation and Un-Installation');

            });
        }
    }
});

// === Opportunity testing1 (disabled) ===
frappe.ui.form.on('Opportunity', {
    validate: function(frm) {
        update_lead(frm);
    }
});

function update_lead(frm) {
    if (frm.doc.party_name && frm.doc.opportunity_from === "Lead") {
        frappe.call({
            method: "frappe.client.set_value",
            args: {
                doctype: "Lead",
                name: frm.doc.party_name,
                fieldname: {
                    phone: frm.doc.phone,
                    first_name : frm.doc.contact_person,
                    industry : frm.doc.industry,
                    website : frm.doc.website,
                    source : frm.doc.source,
                    mobile_no : frm.doc.contact_mobile,
                    lead_owner : frm.doc.lead_owner,
                    first_name : frm.doc.contact_person,
                    email_id : frm.doc.contact_email,
                    request_type : frm.doc.request_type,
                    status: frm.doc.status
                }
            }
        });
    }
}

frappe.ui.form.on('Opportunity', {
    refresh: function(frm) {
        if (frm.doc.sales_stage !== "3. Demo") {
            frm.set_df_property('custom_actual_installation_date', 'read_only', 1);
            frm.set_df_property('custom_actual_uninstallation_date', 'read_only', 1);
        } else {
            frm.set_df_property('custom_actual_installation_date', 'read_only', 1);
        
            frm.set_df_property('custom_actual_uninstallation_date', 'read_only', 1);
        }
    }
});