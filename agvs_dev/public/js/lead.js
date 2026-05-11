// === Hide Create Button in Lead When unqualified  ===
frappe.ui.form.on('Lead', {
    refresh(frm) {
        hide_create_buttons(frm);
    },

    qualification_status(frm) {
        hide_create_buttons(frm);
    }
});

function hide_create_buttons(frm) {
    if (
        frm.doc.qualification_status === "Unqualified" ||
        frm.doc.qualification_status === "In Process"
    ) {
        frm.page.remove_menu_item(__('Opportunity'), __('Create'));
        frm.page.remove_menu_item(__('Customer'), __('Create'));
    }
}


// === Lead Hide Button  ===

frappe.ui.form.on('Lead', {
    refresh(frm) {
        setTimeout(() => {
            frm.remove_custom_button('Customer', 'Create');
            frm.remove_custom_button('Prospect', 'Create');
        }, 10);
    }
});




// === Remove Quotation from lead  ===
frappe.ui.form.on('Lead', {
    refresh: function(frm) {
        setTimeout(() => {
            frm.remove_custom_button('Quotation', 'Create');
        }, 100);
    }
});

