frappe.provide("frappe.ui.form");

if (frappe.ui.form.AddressQuickEntryForm) {
	const BaseAddressQuickEntryForm = frappe.ui.form.AddressQuickEntryForm;

	frappe.ui.form.AddressQuickEntryForm = class AgvsAddressQuickEntryForm extends (
		BaseAddressQuickEntryForm
	) {
		guess_default_party() {
			const result = super.guess_default_party();
			if (result) {
				return result;
			}

			const dynamic_link = frappe.dynamic_link;
			const source_doc = cur_frm && cur_frm.doc;

			if (
				!dynamic_link?.doc ||
				!source_doc ||
				dynamic_link.doc.name !== source_doc.name
			) {
				return;
			}

			return {
				party_type: dynamic_link.doctype,
				party: dynamic_link.doc[dynamic_link.fieldname],
			};
		}
	};
}
