import frappe
from frappe.model.document import Document


class VisitLog(Document):

    # warehouse validation with stock for visit log
    def before_save(self):
        # Run this ONLY for Visit Log
        if self.doctype == "Visit Log":

            # Demo Installation uses demo_qty, not refill_qty — skip this validation
            if self.visit_type == "Demo Installation":
                return

            # get warehouse from the correct field
            warehouse = self.warehouse

            if not warehouse:
                pass
            else:
                # validate stock for each maintenance item
                for row in (self.custom_asset_maintenance_item or []):
                    item = row.item_code
                    req_qty = row.refill_qty or 0

                    # refill_qty cannot be zero
                    if req_qty == 0:
                        frappe.throw(
                            f"Refill Qty cannot be 0 for Item <b>{item}</b>. "
                            "Please enter a valid quantity."
                        )

                    # get available stock from Bin
                    bin_qty = frappe.db.get_value(
                        "Bin",
                        {"item_code": item, "warehouse": warehouse},
                        "actual_qty"
                    ) or 0

                    if bin_qty < req_qty:
                        frappe.throw(
                            f"Not enough stock for Item <b>{item}</b> in Warehouse <b>{warehouse}</b>.<br>"
                            f"Available: <b>{bin_qty}</b> | Required: <b>{req_qty}</b>"
                        )

    def before_submit(self):
        self._ai_and_mi_in_demo()
        self._checkbox_in_mi()
        self._fetch_today_date_from_custom_completion_date()
        self._fetch_value_to_asset_in_visit_log()
        self._stock_entry_auto_consumed_entry()
        self._auto_create_demo_installation_entries()
        self._auto_create_demo_uninstallation_entries()
        self._validation_for_ar_and_mr_uninstallation()
        self._validation_for_demo_machine_installation()
        self._validation_for_demo_machine_uninstallation()

    # AI and MI in Demo
    def _ai_and_mi_in_demo(self):
        # if doc.visit_type == "Installation":
        
        #     mi_name = doc.machine_installation
        
        #     if not mi_name:
        #         frappe.throw("Machine Installation is not linked to this Visit Log.")
        
        #     errors = []
        
        #     am_list = frappe.get_list("Asset Movement", filters={
        #         "custom_machine_installation": mi_name,
        #         "purpose": "Transfer",
        #         "docstatus": 1
        #     }, fields=["name"], limit_page_length=1)
        
        #     se_list = frappe.get_list("Stock Entry", filters={
        #         "custom_machine_installation": mi_name,
        #         "stock_entry_type": "Material Transfer",
        #         "docstatus": 1
        #     }, fields=["name"], limit_page_length=1)
        
        #     if not am_list:
        #         errors.append("Asset Transfer (Asset Movement) has not been created or submitted yet.")
        
        #     if not se_list:
        #         errors.append("Material Transfer (Stock Entry) has not been created or submitted yet.")
        
        #     if errors:
        #         frappe.throw("Cannot submit Visit Log. Complete the following first:<br><ul>" +
        #                      "".join(["<li>" + e + "</li>" for e in errors]) + "</ul>")
        
        
        if self.visit_type == "Installation":
        
            if not self.machine_installation:
                frappe.throw("Machine Installation is not linked to this Visit Log.")
        
            errors = []
        
            # ✅ Asset Movement check
            am_list = frappe.get_list(
                "Asset Movement",
                filters={
                    "custom_visit_log": self.name,
                    "purpose": "Issue",
                    "docstatus": 1
                },
                fields=["name"],
                limit_page_length=1
            )
        
            # ✅ Stock Entry check
            se_list = frappe.get_list(
                "Stock Entry",
                filters={
                    "custom_visit_log": self.name,
                    "stock_entry_type": "Material Issue",
                    "docstatus": 1
                },
                fields=["name"],
                limit_page_length=1
            )
        
            if not am_list:
                errors.append("Asset Transfer (Asset Movement) has not been created or submitted yet.")
        
            if not se_list:
                errors.append("Material Transfer (Stock Entry) has not been created or submitted yet.")
        
            if errors:
                frappe.throw(
                    "Cannot submit Visit Log. Complete the following first:<br><ul>" +
                    "".join([f"<li>{e}</li>" for e in errors]) +
                    "</ul>"
                )

    # DISABLED - Checkbox in MI
    def _checkbox_in_mi(self):
        # if doc.machine_installation:
        
        #     mi_name = doc.machine_installation
        #     mi_doc = frappe.get_doc("Machine Installation and Un-Installation", mi_name)
        
        #     # -------------------------------
        #     # INSTALLATION
        #     # -------------------------------
        #     if mi_doc.installation_type == "Installation":
        
        #         # Asset Issue → Asset Movement (Issue)
        #         asset_issue = frappe.get_list("Asset Movement", filters={
        #             "custom_machine_installation": mi_name,
        #             "purpose": "Transfer",
        #             "docstatus": 1
        #         }, limit_page_length=1)
        
        #         if asset_issue and not mi_doc.asset_issue_done:
        #             frappe.db.set_value(
        #                 "Machine Installation and Un-Installation",
        #                 mi_name,
        #                 "asset_issue_done",
        #                 1
        #             )
        
        #         # Material Issue → Stock Entry (Material Issue)
        #         material_issue = frappe.get_list("Stock Entry", filters={
        #             "custom_machine_installation": mi_name,
        #             "stock_entry_type": "Material Issue",
        #             "docstatus": 1
        #         }, limit_page_length=1)
        
        #         if material_issue and not mi_doc.material_issue_done:
        #             frappe.db.set_value(
        #                 "Machine Installation and Un-Installation",
        #                 mi_name,
        #                 "material_issue_done",
        #                 1
        #             )
        
        #     # -------------------------------
        #     # UNINSTALLATION
        #     # -------------------------------
        #     if mi_doc.installation_type == "Uninstallation":
        
        #         # Asset Transfer → Asset Movement (Transfer)
        #         asset_transfer = frappe.get_list("Asset Movement", filters={
        #             "custom_machine_installation": mi_name,
        #             "purpose": "Receipt",
        #             "docstatus": 1
        #         }, limit_page_length=1)
        
        #         if asset_transfer and not mi_doc.asset_transfer_done:
        #             frappe.db.set_value(
        #                 "Machine Installation and Un-Installation",
        #                 mi_name,
        #                 "asset_transfer_done",
        #                 1
        #             )
        
        #         # Material Transfer → Stock Entry (Material Transfer)
        #         material_transfer = frappe.get_list("Stock Entry", filters={
        #             "custom_machine_installation": mi_name,
        #             "stock_entry_type": "Material Receipt",
        #             "docstatus": 1
        #         }, limit_page_length=1)
        
        #         if material_transfer and not mi_doc.material_transfer_done:
        #             frappe.db.set_value(
        #                 "Machine Installation and Un-Installation",
        #                 mi_name,
        #                 "material_transfer_done",
        #                 1
        #             )
        
        
        if self.machine_installation:
        
            mi_name = self.machine_installation
            mi_doc = frappe.get_doc("Machine Installation and Un-Installation", mi_name)
        
            # -------------------------------
            # INSTALLATION
            # -------------------------------
            if mi_doc.installation_type == "Installation":
        
                # ✅ Asset Movement (Issue)
                asset_issue = frappe.get_list("Asset Movement", filters={
                    "custom_visit_log": self.name,
                    "purpose": "Issue",
                    "docstatus": 1
                }, limit_page_length=1)
        
                if asset_issue and not mi_doc.asset_issue_done:
                    frappe.db.set_value(mi_doc.doctype, mi_name, "asset_issue_done", 1)
        
                # ✅ Stock Entry (Material Issue)
                material_issue = frappe.get_list("Stock Entry", filters={
                    "custom_visit_log": self.name,
                    "stock_entry_type": "Material Issue",
                    "docstatus": 1
                }, limit_page_length=1)
        
                if material_issue and not mi_doc.material_issue_done:
                    frappe.db.set_value(mi_doc.doctype, mi_name, "material_issue_done", 1)
        
            # -------------------------------
            # UNINSTALLATION
            # -------------------------------
            if mi_doc.installation_type == "Uninstallation":
        
                # ✅ Asset Movement (Receipt)
                asset_transfer = frappe.get_list("Asset Movement", filters={
                    "custom_visit_log": self.name,
                    "purpose": "Receipt",
                    "docstatus": 1
                }, limit_page_length=1)
        
                if asset_transfer and not mi_doc.asset_transfer_done:
                    frappe.db.set_value(mi_doc.doctype, mi_name, "asset_transfer_done", 1)
        
                # ✅ Stock Entry (Material Receipt)
                material_transfer = frappe.get_list("Stock Entry", filters={
                    "custom_visit_log": self.name,
                    "stock_entry_type": "Material Receipt",
                    "docstatus": 1
                }, limit_page_length=1)
        
                if material_transfer and not mi_doc.material_transfer_done:
                    frappe.db.set_value(mi_doc.doctype, mi_name, "material_transfer_done", 1)
        
        
        # if doc.machine_installation:
        
        #     mi_name = doc.machine_installation
        
        #     mi_doc = frappe.get_doc("Machine Installation and Un-Installation", mi_name)
        
        #     # -------------------------------
        #     # INSTALLATION
        #     # -------------------------------
        #     if mi_doc.installation_type == "Installation":
        
        #         asset_issue_exists = frappe.db.exists("Asset Movement", {
        #             "custom_machine_installation": mi_name,
        #             "purpose": "Transfer",
        #             "docstatus": 1
        #         })
        
        #         if asset_issue_exists:
        #             frappe.db.set_value(
        #                 "Machine Installation and Un-Installation",
        #                 mi_name,
        #                 "asset_issue_done",
        #                 1
        #             )
        
        #         material_issue_exists = frappe.db.exists("Stock Entry", {
        #             "custom_machine_installation": mi_name,
        #             "stock_entry_type": "Material Issue",
        #             "docstatus": 1
        #         })
        
        #         if material_issue_exists:
        #             frappe.db.set_value(
        #                 "Machine Installation and Un-Installation",
        #                 mi_name,
        #                 "material_issue_done",
        #                 1
        #             )

    # fetch today date from custom completion date
    def _fetch_today_date_from_custom_completion_date(self):
        self.maintenance_status = "Completed"
        
        # ---------------------------------------
        # SET COMPLETION DATE & TIME
        # ---------------------------------------
        
        if not self.completion_date_and_time:
            self.completion_date_and_time = frappe.utils.now_datetime()
        
        # ---------------------------------------
        # VALIDATION: ACTIONS PERFORMED REQUIRED
        # ---------------------------------------
        
        if self.maintenance_status == "Completed" and not self.actions_performed:
            frappe.throw("Actions Performed is required when Maintenance Status is Completed.")

    # Fetch value to asset in Visit Log
    def _fetch_value_to_asset_in_visit_log(self):
        # Demo Installation does not sync refill quantities to the Asset
        if self.visit_type == "Demo Installation":
            return

        # Sync existing_qty, refill_qty & balance_qty from Asset Maintenance Log
        # to Asset -> custom_asset_requirement_item (matched by item_code)
        # Uses doc.asset as the Asset docname
        
        if self.asset and self.custom_asset_maintenance_item:
        
        
            asset = None
            try:
                asset = frappe.get_doc("Asset", self.asset)
            except Exception:
                asset = None
        
            if asset:
                # build map: item_code -> {existing_qty, refill_qty, balance_qty}
                item_map = {}
                for r in self.custom_asset_maintenance_item:
                    if r.item_code:
                        ex_qty = r.existing_qty or 0
                        ref_qty = r.refill_qty or 0
                        bal_qty = ex_qty + ref_qty
        
                        item_map[r.item_code] = {
                            "existing_qty": ex_qty,
                            "refill_qty": ref_qty,
                            "balance_qty": bal_qty
                        }
        
                if item_map:
                    # find child doctype for custom_asset_requirement_item
                    asset_meta = frappe.get_meta("Asset")
                    req_field = asset_meta.get_field("custom_asset_requirement_item")
        
                    if req_field and asset.custom_asset_requirement_item:
                        child_dt = req_field.options  # e.g., "Asset Requirement Item"
        
                        # update matching rows
                        for a in asset.custom_asset_requirement_item:
                            if not a.item_code:
                                continue
        
                            data = item_map.get(a.item_code)
                            if not data:
                                continue
        
                            # update existing_qty, refill_qty & balance_qty
                            frappe.db.set_value(
                                child_dt,
                                a.name,
                                {
                                    "existing_qty": data["existing_qty"],
                                    "refill_qty": data["refill_qty"],
                                    "balance_qty": data["balance_qty"]
                                }
                            )

    # Stock Entry auto consumed entry
    def _stock_entry_auto_consumed_entry(self):
        # Demo Installation creates its own entries via _auto_create_demo_installation_entries
        if self.visit_type == "Demo Installation":
            return

        # # CREATE MATERIAL ISSUE STOCK ENTRY FROM VISIT LOG
        
        # if doc.maintenance_status == "Completed":
        
        #     # if not doc.company or not doc.warehouse:
        #     #     frappe.throw("Company and Warehouse are required.")
        
        #     # PREVENT DUPLICATE (ROW LEVEL)
        #     if frappe.db.sql(
        #         """
        #         SELECT 1
        #         FROM `tabStock Entry Detail` d
        #         JOIN `tabStock Entry` s ON s.name = d.parent
        #         WHERE
        #             d.custom_visit_log = %s
        #             AND s.stock_entry_type = 'Material Issue'
        #             AND s.docstatus = 1
        #         LIMIT 1
        #         """,
        #         doc.name
        #     ):
        #         frappe.throw("Stock Entry already created for this Visit Log.")
        
        #     items = []
        
        #     for r in (doc.custom_asset_maintenance_item or []):
        #         if r.item_code and r.refill_qty > 0:
        #             items.append({
        #                 "item_code": r.item_code,
        #                 "qty": r.refill_qty,
        #                 "uom": r.uom or "Nos",
        #                 "s_warehouse": doc.warehouse,
        #                 "custom_visit_log": doc.name
        #             })
        
        #     # ---------------------------------------
        #     # Additional Consumed Items (Qty MUST > 0)
        #     # ---------------------------------------
        #     for r in doc.visit_log_additional_consumed_items or []:
        
        #         if not r.item_code:
        #             continue
        
        #         if not r.consumed_qty or r.consumed_qty <= 0:
        #             frappe.throw(
        #                 f"Consumed Qty must be greater than 0 for item {r.item_code} "
        #                 "in Additional Consumed Items."
        #             )
        
        #         items.append({
        #             "item_code": r.item_code,
        #             "qty": r.consumed_qty,
        #             "uom": r.uom or "Nos",
        #             "s_warehouse": doc.warehouse,
        #             "custom_visit_log": doc.name
        #         })
        
        
        #     if not items:
        #         frappe.throw("No items to issue.")
        
        #     se = frappe.get_doc({
        #         "doctype": "Stock Entry",
        #         "stock_entry_type": "Material Issue",
        #         "company": doc.company,
        #         "from_warehouse": doc.warehouse,
        #         "custom_visit_log": doc.name,
        #         "items": items
        #     })
        
        #     se.insert(ignore_permissions=True)
        #     se.submit()
        
        
        
        # CREATE MATERIAL ISSUE STOCK ENTRY FROM VISIT LOG
        if self.maintenance_status == "Completed":
            if frappe.db.sql(
                """
                SELECT 1
                FROM `tabStock Entry Detail` d
                JOIN `tabStock Entry` s ON s.name = d.parent
                WHERE
                    d.custom_visit_log = %s
                    AND s.stock_entry_type = 'Material Issue'
                    AND s.docstatus = 1
                LIMIT 1
                """,
                self.name
            ):
                frappe.throw("Stock Entry already created for this Visit Log.")
        
            items = []
            for r in (self.custom_asset_maintenance_item or []):
                if r.item_code and r.refill_qty > 0:
                    items.append({
                        "item_code": r.item_code,
                        "qty": r.refill_qty,
                        "uom": r.uom or "Nos",
                        "s_warehouse": self.warehouse,
                        "custom_visit_log": self.name
                    })
            for r in self.visit_log_additional_consumed_items or []:
                if not r.item_code:
                    continue
                if not r.consumed_qty or r.consumed_qty <= 0:
                    frappe.throw(
                        f"Consumed Qty must be greater than 0 for item {r.item_code} "
                        "in Additional Consumed Items."
                    )
                items.append({
                    "item_code": r.item_code,
                    "qty": r.consumed_qty,
                    "uom": r.uom or "Nos",
                    "s_warehouse": self.warehouse,
                    "custom_visit_log": self.name
                })
        
            # ✅ Only create Stock Entry if items exist — silently skip if none
            if items:
                se = frappe.get_doc({
                    "doctype": "Stock Entry",
                    "stock_entry_type": "Material Issue",
                    "company": self.company,
                    "from_warehouse": self.warehouse,
                    "custom_visit_log": self.name,
                    "items": items
                })
                se.insert(ignore_permissions=True)
                se.submit()

    # Validation for AR and MR uninstallation
    def _validation_for_ar_and_mr_uninstallation(self):
        if self.visit_type == "Uninstallation":
        
            mi_name = self.machine_installation
        
            if not mi_name:
                frappe.throw("Machine Installation is not linked to this Visit Log.")
        
            errors = []
        
            am_list = frappe.get_list("Asset Movement", filters={
                "custom_machine_installation": mi_name,
                "purpose": "Receipt",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)
        
            se_list = frappe.get_list("Stock Entry", filters={
                "custom_machine_installation": mi_name,
                "stock_entry_type": "Material Receipt",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)
        
            if not am_list:
                errors.append("Asset Receipt (Asset Movement) has not been created or submitted yet.")
        
            if not se_list:
                errors.append("Material Receipt (Stock Entry) has not been created or submitted yet.")
        
            if errors:
                frappe.throw("Cannot submit Visit Log. Complete the following first:<br><ul>" + "".join(["<li>" + e + "</li>" for e in errors]) + "</ul>")

    def _get_employee_warehouse(self):
        """Fetch the warehouse assigned to the Visit Log's assign_to user via Warehouse.custom_user."""
        if not self.assign_to:
            return None
        return frappe.db.get_value("Warehouse", {"custom_user": self.assign_to}, "name")

    # Auto-create Asset Movement + Stock Entry when Demo Installation Visit Log is submitted
    def _auto_create_demo_installation_entries(self):
        if self.visit_type != "Demo Installation":
            return

        if not self.machine_installation:
            frappe.throw("Machine Installation is not linked to this Visit Log.")

        mi = frappe.get_doc("Machine Installation and Un-Installation", self.machine_installation)
        demo_location = self.target_location or mi.get("client_location") or ""
        demo_warehouse = mi.get("material_warehouse") or None
        employee_warehouse = self._get_employee_warehouse()

        # 1. Asset Movement (Transfer) — asset goes from employee location to demo location
        if self.asset:
            am_exists = frappe.db.exists("Asset Movement", {
                "custom_visit_log": self.name,
                "purpose": "Transfer",
                "docstatus": 1
            })
            if not am_exists:
                am = frappe.get_doc({
                    "doctype": "Asset Movement",
                    "purpose": "Transfer",
                    "company": self.company,
                    "custom_visit_log": self.name,
                    "custom_machine_installation": self.machine_installation,
                    "assets": [{
                        "asset": self.asset,
                        "target_location": demo_location
                    }]
                })
                am.insert(ignore_permissions=True)
                am.submit()

        # 2. Stock Entry (Material Transfer) — from employee warehouse to demo warehouse
        items = []
        for row in (self.custom_asset_maintenance_item or []):
            if row.item_code and (row.demo_qty or 0) > 0:
                items.append({
                    "item_code": row.item_code,
                    "qty": row.demo_qty,
                    "uom": row.uom or "Nos",
                    "s_warehouse": employee_warehouse,
                    "t_warehouse": demo_warehouse,
                    "custom_visit_log": self.name
                })

        if items:
            se_exists = frappe.db.exists("Stock Entry", {
                "custom_visit_log": self.name,
                "stock_entry_type": "Material Transfer",
                "docstatus": 1
            })
            if not se_exists:
                se = frappe.get_doc({
                    "doctype": "Stock Entry",
                    "stock_entry_type": "Material Transfer",
                    "company": self.company,
                    "from_warehouse": employee_warehouse,
                    "to_warehouse": demo_warehouse,
                    "custom_visit_log": self.name,
                    "custom_machine_installation": self.machine_installation,
                    "items": items
                })
                se.insert(ignore_permissions=True)
                se.submit()

    # Validation for Demo Machine Installation
    def _validation_for_demo_machine_installation(self):
        # if doc.visit_type == "Demo Installation":
        
        #     mi_name = doc.machine_installation
        
        #     if not mi_name:
        #         frappe.throw("Machine Installation is not linked to this Visit Log.")
        
        #     errors = []
        
        #     am_list = frappe.get_list("Asset Movement", filters={
        #         "custom_machine_installation": mi_name,
        #         "purpose": "Transfer",
        #         "docstatus": 1
        #     }, fields=["name"], limit_page_length=1)
        
        #     se_list = frappe.get_list("Stock Entry", filters={
        #         "custom_machine_installation": mi_name,
        #         "stock_entry_type": "Material Transfer",
        #         "docstatus": 1
        #     }, fields=["name"], limit_page_length=1)
        
        #     if not am_list:
        #         errors.append("Asset Transfer (Asset Movement) has not been created or submitted yet.")
        
        #     if not se_list:
        #         errors.append("Material Transfer (Stock Entry) has not been created or submitted yet.")
        
        #     if errors:
        #         frappe.throw("Cannot submit Visit Log. Complete the following first:<br><ul>" +
        #                      "".join(["<li>" + e + "</li>" for e in errors]) + "</ul>")
        
        
        
        if self.visit_type == "Demo Installation":
        
            mi_name = self.machine_installation
        
            if not mi_name:
                frappe.throw("Machine Installation is not linked to this Visit Log.")
        
            errors = []
        
            # Asset Movement check (Transfer — created by _auto_create_demo_installation_entries)
            am_list = frappe.get_list("Asset Movement", filters={
                "custom_machine_installation": mi_name,
                "purpose": "Transfer",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)

            # Stock Entry check
            se_list = frappe.get_list("Stock Entry", filters={
                "custom_machine_installation": mi_name,
                "stock_entry_type": "Material Transfer",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)

            if not am_list:
                errors.append("Asset Transfer (Asset Movement) has not been created or submitted yet.")

            if not se_list:
                errors.append("Material Transfer (Stock Entry) has not been created or submitted yet.")
        
            if errors:
                frappe.throw(
                    "Cannot submit Visit Log. Complete the following first:<br><ul>" +
                    "".join(["<li>" + e + "</li>" for e in errors]) +
                    "</ul>"
                )

    # Auto-create Asset Movement (Transfer) + Stock Entry when Demo Uninstallation VL is submitted
    def _auto_create_demo_uninstallation_entries(self):
        if self.visit_type != "Demo Uninstallation":
            return

        if not self.machine_installation:
            frappe.throw("Machine Installation is not linked to this Visit Log.")

        mi = frappe.get_doc("Machine Installation and Un-Installation", self.machine_installation)
        demo_location = mi.get("client_location") or ""
        employee_location = self.target_location or ""
        demo_warehouse = mi.get("material_warehouse") or None

        # 1. Asset Movement (Transfer) — asset returns from demo location to employee location
        am_exists = frappe.db.exists("Asset Movement", {
            "custom_visit_log": self.name,
            "purpose": "Transfer",
            "docstatus": 1
        })
        if not am_exists:
            assets = []
            for row in (mi.machine_items or []):
                if row.asset:
                    assets.append({
                        "asset": row.asset,
                        "source_location": demo_location,
                        "target_location": employee_location
                    })

            if assets:
                am = frappe.get_doc({
                    "doctype": "Asset Movement",
                    "purpose": "Transfer",
                    "company": self.company,
                    "custom_visit_log": self.name,
                    "custom_machine_installation": self.machine_installation,
                    "assets": assets
                })
                am.insert(ignore_permissions=True)
                am.submit()

        # 2. Stock Entry (Material Transfer) — from demo warehouse to employee warehouse
        employee_warehouse = self._get_employee_warehouse()
        items = []
        for row in (self.custom_asset_maintenance_item or []):
            if row.item_code and (row.demo_qty or 0) > 0:
                items.append({
                    "item_code": row.item_code,
                    "qty": row.demo_qty,
                    "uom": row.uom or "Nos",
                    "s_warehouse": demo_warehouse,
                    "t_warehouse": employee_warehouse,
                    "custom_visit_log": self.name
                })

        if items:
            se_exists = frappe.db.exists("Stock Entry", {
                "custom_visit_log": self.name,
                "stock_entry_type": "Material Transfer",
                "docstatus": 1
            })
            if not se_exists:
                se = frappe.get_doc({
                    "doctype": "Stock Entry",
                    "stock_entry_type": "Material Transfer",
                    "company": self.company,
                    "from_warehouse": demo_warehouse,
                    "to_warehouse": employee_warehouse,
                    "custom_visit_log": self.name,
                    "custom_machine_installation": self.machine_installation,
                    "items": items
                })
                se.insert(ignore_permissions=True)
                se.submit()

    # Validation for Demo Machine Uninstallation
    def _validation_for_demo_machine_uninstallation(self):
        if self.visit_type == "Demo Uninstallation":

            mi_name = self.machine_installation

            if not mi_name:
                frappe.throw("Machine Installation is not linked to this Visit Log.")

            errors = []

            am_list = frappe.get_list("Asset Movement", filters={
                "custom_machine_installation": mi_name,
                "purpose": "Transfer",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)

            se_list = frappe.get_list("Stock Entry", filters={
                "custom_machine_installation": mi_name,
                "stock_entry_type": "Material Transfer",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)

            if not am_list:
                errors.append("Asset Transfer (Asset Movement) has not been created or submitted yet.")

            if not se_list:
                errors.append("Material Transfer (Stock Entry) has not been created or submitted yet.")

            if errors:
                frappe.throw(
                    "Cannot submit Visit Log. Complete the following first:<br><ul>" +
                    "".join([f"<li>{e}</li>" for e in errors]) +
                    "</ul>"
                )

    # Status Update
    def on_update(self):
        try:
            if self.machine_installation and self.maintenance_status == "Completed":
        
                mi_doc = frappe.get_doc("Machine Installation and Un-Installation", self.machine_installation)
        
                if self.visit_type == "Demo Installation":
                    uninstall_done = frappe.db.exists("Visit Log", {
                        "machine_installation": self.machine_installation,
                        "visit_type": "Demo Uninstallation",
                        "maintenance_status": "Completed"
                    })
                    if not uninstall_done and mi_doc.status != "Demo Installation Completed":
                        frappe.db.set_value(
                            "Machine Installation and Un-Installation",
                            self.machine_installation,
                            "status",
                            "Demo Installation Completed",
                            update_modified=False
                        )
        
                elif self.visit_type == "Demo Uninstallation":
                    if mi_doc.status != "Demo Uninstallation Completed":
                        frappe.db.set_value(
                            "Machine Installation and Un-Installation",
                            self.machine_installation,
                            "status",
                            "Demo Uninstallation Completed",
                            update_modified=False
                        )
        except Exception:
            pass

    # Balance and Capacity Validation Visit log
    def validate(self):
        rows = self.get("custom_asset_maintenance_item") or self.get("asset_maintenance_item") or []

        for row in rows:
            try:
                capacity = float(row.get("capacity_qty") or 0)
            except Exception:
                capacity = 0.0

            item = row.get("item_code") or row.get("item_name") or ""
            idx = row.get("idx") or "?"

            if self.visit_type == "Demo Installation":
                # For Demo Installation: validate demo_qty does not exceed capacity
                try:
                    demo_qty = float(row.get("demo_qty") or 0)
                except Exception:
                    demo_qty = 0.0

                if demo_qty > capacity:
                    frappe.throw(
                        f"Row {idx} (Item: {item}): Demo Qty ({demo_qty}) cannot exceed Capacity Qty ({capacity})."
                    )
            else:
                # Normal visit: validate existing + refill does not exceed capacity
                try:
                    existing = float(row.get("existing_qty") or 0)
                except Exception:
                    existing = 0.0
                try:
                    refill = float(row.get("refill_qty") or 0)
                except Exception:
                    refill = 0.0

                balance = existing + refill
                row.balance_qty = balance

                if balance > capacity:
                    frappe.throw(
                        f"Row {idx} (Item: {item}): Balance Qty ({balance}) cannot exceed Capacity Qty ({capacity})."
                    )

