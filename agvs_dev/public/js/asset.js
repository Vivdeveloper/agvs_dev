// === Filter for machine list  ===
frappe.ui.form.on('Asset', {
    refresh(frm) {
        frm.set_query('custom_machine_model', () => ({
            filters: { machine: frm.doc.asset_category }
        }));
    }
});


