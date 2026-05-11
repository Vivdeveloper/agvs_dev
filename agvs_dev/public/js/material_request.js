// === Hide Req Qty and Issued Qty  ===
// Material Request – hide Required / Issued Qty when NOT Material Transfer

frappe.ui.form.on("Material Request", {
    onload(frm) {
        toggle_custom_qty_columns(frm);
    },
    refresh(frm) {
        toggle_custom_qty_columns(frm);
    },
    material_request_type(frm) {
        toggle_custom_qty_columns(frm);
    }
});

function toggle_custom_qty_columns(frm) {
    // ✅ only show for Material Transfer
    const show = frm.doc.material_request_type === "Material Transfer";

    const grid = frm.get_field("items").grid;

    // 1️⃣ Hide/Show in the row edit dialog
    grid.update_docfield_property("custom_required_qty", "hidden", !show);
    grid.update_docfield_property("custom_issued_qty", "hidden", !show);

    // 2️⃣ Hide/Show as columns in the Items table
    if (grid && grid.grid_rows && grid.grid_rows.length) {
        grid.toggle_display_column("custom_required_qty", show);
        grid.toggle_display_column("custom_issued_qty", show);
    }

    // 3️⃣ Make sure list-view flags follow this
    grid.update_docfield_property("custom_required_qty", "in_list_view", show);
    grid.update_docfield_property("custom_issued_qty", "in_list_view", show);
    grid.update_docfield_property("custom_required_qty", "in_grid_view", show);
    grid.update_docfield_property("custom_issued_qty", "in_grid_view", show);

    frm.refresh_field("items");
}


