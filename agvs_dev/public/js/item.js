// === item for custom_strength_level  ===
frappe.ui.form.on("Item", {
    refresh(frm) {
        if (
            !frm.is_new() &&
            frm.doc.item_group === "SO" &&
            frm.doc.custom_scent_family &&
            !frm.doc.custom_strength_level
        ) {
            frm.add_custom_button("Create Strength Level", () => {
                strength_dialog(frm);
            }).addClass("btn-primary");
        }
    }
});

function strength_dialog(frm) {
    const d = new frappe.ui.Dialog({
        title: "Select Strength Level",
        fields: [
            {
                fieldname: "strength",
                label: "Strength Level",
                fieldtype: "Link",
                options: "Strength Level",
                reqd: 1
            }
        ],
        primary_action_label: "Create",
        primary_action(values) {
            d.hide();
            frappe.call({
                method: "create_strength_item",
                args: {
                    item_name: frm.doc.name,
                    strength: values.strength
                },
                callback(r) {
                    let msg = r.message;
                    frappe.msgprint(
                        (msg.exists ? "Item already exists: " : "Created new Item: ") +
                        "<b>" + msg.name + "</b>"
                    );
                    frappe.set_route("Form", "Item", msg.name);
                }
            });
        }
    });

    d.show();
}


// === item name series (disabled) ===
frappe.ui.form.on('Item', {
	// optional: if user types/pastes an item code, normalize it immediately
	item_code: function(frm) {
		normalize_item_code(frm);
	},

	// ensure final format before save
	validate: function(frm) {
		normalize_item_code(frm);
	}
});

function normalize_item_code(frm) {
	if (!frm.doc.item_code) return;

	// split on dashes
	let parts = frm.doc.item_code.trim().split('-');

	// only transform codes with exactly 4 parts: A-B-C-D -> A-B-D-C
	if (parts.length === 4) {
		let new_code = [parts[0], parts[1], parts[3], parts[2]].join('-');

		// avoid infinite loops / unnecessary sets
		if (new_code !== frm.doc.item_code) {
			// set item_code
			frm.set_value('item_code', new_code);

			// if creating a new doc, also set name so saved doc uses the new code
			if (frm.doc.__islocal) {
				frm.set_value('name', new_code);
			}
		}
	}
}


// === item property set  ===
frappe.ui.form.on('Item', {
    refresh(frm) {
        toggle_fields(frm);
    },
    item_group(frm) {
        toggle_fields(frm);
    }
});

function toggle_fields(frm) {
    const group = frm.doc.item_group;

    const is_bt  = group === "BT";
    const is_st  = group === "ST";
    const is_so  = group === "SO";
    const is_inc = group === "INC";
    const is_hp  = group === "HP";

    const is_scent_group = ["SL", "FX", "SF"].includes(group);

    // ---------------- BT ----------------
    frm.set_df_property("custom_container_material", "reqd", is_bt);
    frm.set_df_property("custom_container_size", "reqd", is_bt);

    frm.set_df_property("custom_container_material", "hidden", !is_bt);
    frm.set_df_property("custom_container_size", "hidden", !is_bt);

    // ---------------- ST ----------------
    frm.set_df_property("custom_general_stickering_application", "reqd", is_st);
    frm.set_df_property("custom_sticker_material", "reqd", is_st);
    frm.set_df_property("custom_bt_item", "reqd", is_st);

    frm.set_df_property("custom_general_stickering_application", "hidden", !is_st);
    frm.set_df_property("custom_sticker_material", "hidden", !is_st);
    frm.set_df_property("custom_bt_item", "hidden", !is_st);

    // ---------------- SO ----------------
    frm.set_df_property("custom_scent_family", "reqd", is_so);
    frm.set_df_property("custom_scent_family", "hidden", !is_so);
    frm.set_df_property("custom_strength_level", "hidden", !is_so);

    // ---------------- SL / FX / SF ----------------
    frm.set_df_property("custom_scent_group", "reqd", is_scent_group);
    frm.set_df_property("custom_scent_group", "hidden", !is_scent_group);

    // ---------------- INC ----------------
    if (is_inc) {
        frm.set_df_property("custom_scent_family", "reqd", true);
        frm.set_df_property("custom_scent_family", "hidden", false);

        frm.set_df_property("custom_stick_size", "reqd", true);
        frm.set_df_property("custom_stick_size", "hidden", false);
    } else {
        if (!is_so) {  // do not disturb SO behaviour
            frm.set_df_property("custom_scent_family", "hidden", true);
            frm.set_df_property("custom_scent_family", "reqd", false);
        }
        frm.set_df_property("custom_stick_size", "hidden", true);
        frm.set_df_property("custom_stick_size", "reqd", false);
    }

    // ---------------- HP (NEW) ----------------
    if (is_hp) {
        frm.set_df_property("custom_scent_family", "reqd", true);
        frm.set_df_property("custom_scent_family", "hidden", false);

        frm.set_df_property("custom_hp_sub_category", "reqd", true);
        frm.set_df_property("custom_hp_sub_category", "hidden", false);

        frm.set_df_property("custom_dilution_category", "reqd", true);
        frm.set_df_property("custom_dilution_category", "hidden", false);
    } else {
        // Hide HP-specific fields only
        frm.set_df_property("custom_hp_sub_category", "hidden", true);
        frm.set_df_property("custom_hp_sub_category", "reqd", false);

        frm.set_df_property("custom_dilution_category", "hidden", true);
        frm.set_df_property("custom_dilution_category", "reqd", false);

        // For scent_family – only hide if not SO or INC
        if (!is_so && !is_inc) {
            frm.set_df_property("custom_scent_family", "hidden", true);
            frm.set_df_property("custom_scent_family", "reqd", false);
        }
    }
}


// === itemcode naming series set by groups  ===
frappe.ui.form.on("Item", {
    item_group: set_series,
    custom_scent_family: set_series,
    custom_scent_group: set_series,
    custom_container_material: set_series,
    custom_container_size: set_series,
    custom_general_stickering_application: set_series,
    custom_sticker_material: set_series,
    custom_stick_size: set_series,
    custom_hp_sub_category: set_series,
    custom_dilution_category: set_series
});

function set_series(frm) {
    const ig = frm.doc.item_group;
    if (!ig) return;

    let ns = "";

    // SO
    if (ig === "SO") {
        ns = `${ig}.-.${frm.doc.custom_scent_family || ""}.-.#.`;
    }

    // SL, FX, SF
    else if (ig === "SL" || ig === "FX" || ig === "SF") {
        ns = `${ig}.-.${frm.doc.custom_scent_group || ""}.-.#.`;
    }

    // BT
    else if (ig === "BT") {
        ns = `${ig}.-.${frm.doc.custom_container_material || ""}.-.${frm.doc.custom_container_size || ""}.-.#.`;
    }

    // ST
    else if (ig === "ST") {
        ns = `${ig}.-.${frm.doc.custom_general_stickering_application || ""}.-.${frm.doc.custom_sticker_material || ""}.-.#.`;
    }

    // INC
    else if (ig === "INC") {
        ns = `${ig}.-.${frm.doc.custom_stick_size || ""}.-.${frm.doc.custom_scent_family || ""}.-.#.`;
    }

    // HP  (NEW)
    else if (ig === "HP") {
        ns = `${ig}.-.${frm.doc.custom_hp_sub_category || ""}.-.${frm.doc.custom_scent_family || ""}.-.#.-.${frm.doc.custom_dilution_category || ""}.`;
    }

    if (ns) frm.set_value("naming_series", ns);
}


