


frappe.ui.form.on('Lead', {
    refresh(frm) {
        if (!frm.is_new()) {
            frappe.contacts.render_address_and_contact(frm);
        }
        // Hide Create Button for Customer and Prospect
        // Hide Create Button for Quotation
        setTimeout(() => {
            frm.remove_custom_button('Customer', 'Create');
            frm.remove_custom_button('Prospect', 'Create');
            frm.remove_custom_button('Quotation', 'Create');
            hide_create_buttons(frm);
        }, 100);
    },

    qualification_status(frm) {
        frm.page && hide_create_buttons(frm);
    }
});

function hide_create_buttons(frm) {
    if (['Unqualified', 'In Process'].includes(frm.doc.qualification_status)) {
        frm.page?.remove_inner_button('Opportunity', 'Create');
        frm.page?.remove_inner_button('Customer', 'Create');
    }
}
