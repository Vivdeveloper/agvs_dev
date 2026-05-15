frappe.ui.form.on('Address', {
    refresh: function(frm) {
        if (!frm.is_new()) return;

        let opts = frappe.route_options || {};
        let title = opts.address_title
            || opts.customer_name
            || opts.contact_person
            || opts.lead_name;

        if (title && (!frm.doc.address_title || frm.doc.address_title === 'New Address')) {
            frm.set_value('address_title', title);
        }
    },

    before_save: function(frm) {
        if (!frm.doc.address_title || frm.doc.address_title === 'New Address') {
            let city = frm.doc.city || '';
            let type = frm.doc.address_type || 'Billing';
            frm.set_value('address_title', `${city}-${type}-${frappe.utils.get_random(4)}`);
        }
    }
});
