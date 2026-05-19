// === Auto-fetch address from Lead when Quotation is linked to a Lead ===
frappe.ui.form.on('Quotation', {
    onload: function(frm) {
        // Fires when Quotation opens pre-populated from Opportunity (party_name already set)
        if (frm.is_new() && frm.doc.quotation_to === 'Lead' && frm.doc.party_name && !frm.doc.customer_address) {
            fetch_lead_address_for_quotation(frm);
        }
    },
    party_name: function(frm) {
        if (frm.doc.quotation_to === 'Lead' && frm.doc.party_name) {
            fetch_lead_address_for_quotation(frm);
        }
    },
    quotation_to: function(frm) {
        if (frm.doc.quotation_to === 'Lead' && frm.doc.party_name) {
            fetch_lead_address_for_quotation(frm);
        }
    }
});

function fetch_lead_address_for_quotation(frm) {
    // Try to get a linked Address doctype record for this Lead first
    frappe.call({
        method: 'frappe.contacts.doctype.address.address.get_default_address',
        args: {
            doctype: 'Lead',
            name: frm.doc.party_name
        },
        callback: function(r) {
            if (r.message) {
                // Address doctype record exists — set it and let ERPNext populate address_display
                frm.set_value('customer_address', r.message);
            } else {
                // No linked Address record — build from Lead's inline address fields
                frappe.db.get_value(
                    'Lead',
                    frm.doc.party_name,
                    ['city', 'state', 'country', 'custom_address_link'],
                    function(lead) {
                        if (!lead) return;
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
                );
            }
        }
    });
}
