// === Target Location in AI  ===
frappe.ui.form.on('Asset Movement Item', {
    asset: function(frm, cdt, cdn) {

        if (!frm.doc.visit_log) return;

        frappe.model.set_value(
            cdt,
            cdn,
            'target_location',
            'Demo Location'
        );
    }
});

