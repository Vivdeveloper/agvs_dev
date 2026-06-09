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


// === Asset Requirement Item — prevent duplicate Item Code ===
frappe.ui.form.on('Asset Requirement Item', {
    item_code(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.item_code) return;

        const duplicate = (frm.doc.custom_asset_requirement_item || []).some(
            d => d.name !== cdn && d.item_code === row.item_code
        );

        if (duplicate) {
            frappe.model.set_value(cdt, cdn, 'item_code', '');
            frappe.msgprint({
                title: __('Duplicate Item'),
                indicator: 'red',
                message: __('Item {0} is already added in another row.', [row.item_code])
            });
        }
    }
});


