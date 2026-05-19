// === Filter for machine list  ===
frappe.ui.form.on('Asset', {
    refresh(frm) {
        frm.set_query('custom_machine_model', () => ({
            filters: { machine: frm.doc.asset_category }
        }));
    },
    location(frm) {
        if (frm.doc.location) {
            frm.set_value('custom_asset_status', frm.doc.location === 'Office' ? 'Free' : 'Occupied');
        }
    }
});


