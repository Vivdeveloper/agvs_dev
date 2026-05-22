import frappe
from frappe.model.document import Document


class VisitLog(Document):

    # warehouse validation with stock for visit log
    def before_save(self):
        # Run this ONLY for Visit Log
        if self.doctype == "Visit Log":

            # Demo Uninstallation cannot be saved as Completed unless Demo Installation is submitted
            if self.maintenance_status == "Completed" and self.visit_type == "Demo Uninstallation" and self.machine_installation:
                install_submitted = frappe.db.exists("Visit Log", {
                    "machine_installation": self.machine_installation,
                    "visit_type": "Demo Installation",
                    "docstatus": 1
                })
                if not install_submitted:
                    frappe.throw(
                        "Cannot save Demo Uninstallation as <b>Completed</b>: "
                        "a submitted <b>Demo Installation</b> Visit Log must exist first."
                    )

            # These types don't need refill_qty validation — skip stock validation
            if self.visit_type in ("Demo Installation", "Demo Uninstallation", "Installation", "Uninstallation"):
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
        # Run all validations first — so maintenance_status is never set if validation fails
        self._ai_and_mi_in_demo()
        self._validation_for_ar_and_mr_uninstallation()
        self._validation_for_demo_machine_installation()
        self._validation_for_demo_machine_uninstallation()
        # After all validations pass, set status and create entries
        # self._checkbox_in_mi()
        self._fetch_today_date_from_custom_completion_date()
        self._fetch_value_to_asset_in_visit_log()
        self._stock_entry_auto_consumed_entry()
        self._update_maintenance_schedule_on_completion()
        self._auto_create_installation_entries()
        self._auto_create_delivery_note_for_installation()
        self._auto_create_demo_installation_entries()
        self._auto_create_uninstallation_entries()
        self._auto_create_demo_uninstallation_entries()

    # AI and MI in Demo
    def _ai_and_mi_in_demo(self):
        
        if self.visit_type == "Installation":
            if not self.machine_installation:
                frappe.throw("Machine Installation is not linked to this Visit Log.")

    

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
        # For Demo/Installation types: only process additional consumed items (main items handled elsewhere)
        if self.visit_type in ("Demo Installation", "Demo Uninstallation", "Installation", "Uninstallation"):
            additional_rows = [
                r for r in (self.visit_log_additional_consumed_items or [])
                if r.item_code and (r.consumed_qty or 0) > 0
            ]
            if not additional_rows:
                return
            if not self.warehouse:
                frappe.throw(
                    "Please select <b>Source Warehouse</b> to process Additional Consumed Items."
                )
            # Skip if already created
            if frappe.db.exists("Stock Entry", {
                "custom_visit_log": self.name,
                "stock_entry_type": "Material Issue",
                "docstatus": 1
            }):
                return
            items = []
            for r in additional_rows:
                items.append({
                    "item_code": r.item_code,
                    "qty": r.consumed_qty,
                    "uom": r.uom or "Nos",
                    "s_warehouse": self.warehouse,
                    "custom_visit_log": self.name
                })
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
            return

        # CREATE MATERIAL ISSUE STOCK ENTRY FROM VISIT LOG
        if self.maintenance_status == "Completed":
            if frappe.db.sql(
                """
                SELECT 1
                FROM `tabStock Entry Detail` d
                JOIN `tabStock Entry` s ON s.name = d.parent
                WHERE
                    d.custom_visit_log = %s
                    AND s.stock_entry_type = 'Material Transfer'
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
                    "stock_entry_type": "Material Transfer",
                    "company": self.company,
                    "from_warehouse": self.warehouse,
                    "custom_visit_log": self.name,
                    "items": items
                })
                se.insert(ignore_permissions=True)
                se.submit()

    # Validation for AR and MR uninstallation
    def _auto_create_uninstallation_entries(self):
        if self.visit_type != "Uninstallation":
            return

        if not self.asset:
            return

        # 1. AM (Receipt): asset returns from client site to employee location
        am_exists = frappe.db.exists("Asset Movement", {
            "custom_visit_log": self.name,
            "purpose": "Receipt",
            "docstatus": 1
        })
        if not am_exists:
            employee_location = self._get_employee_location() or ""
            # Use client_location from MI — target_location defaults to "Demo Location" which is wrong
            client_location = frappe.db.get_value(
                "Machine Installation and Un-Installation",
                self.machine_installation,
                "client_location"
            ) or ""
            am = frappe.get_doc({
                "doctype": "Asset Movement",
                "purpose": "Receipt",
                "company": self.company,
                "custom_visit_log": self.name,
                "custom_machine_installation": self.machine_installation,
                "assets": [{
                    "asset": self.asset,
                    "source_location": client_location,
                    "target_location": employee_location
                }]
            })
            am.insert(ignore_permissions=True)
            am.submit()

        # 2. SE (Material Transfer): client warehouse → employee warehouse
        se_exists = frappe.db.exists("Stock Entry", {
            "custom_visit_log": self.name,
            "stock_entry_type": "Material Transfer",
            "docstatus": 1
        })
        if not se_exists:
            employee_warehouse = self._get_employee_warehouse()
            client_warehouse = self.warehouse or None
            items = []
            for row in (self.custom_asset_maintenance_item or []):
                if row.item_code and (row.existing_qty or 0) > 0:
                    items.append({
                        "item_code": row.item_code,
                        "qty": row.existing_qty,
                        "uom": row.uom or "Nos",
                        "s_warehouse": client_warehouse,
                        "t_warehouse": employee_warehouse,
                        "custom_visit_log": self.name
                    })
            if items:
                se = frappe.get_doc({
                    "doctype": "Stock Entry",
                    "stock_entry_type": "Material Transfer",
                    "company": self.company,
                    "from_warehouse": client_warehouse,
                    "to_warehouse": employee_warehouse,
                    "custom_visit_log": self.name,
                    "custom_machine_installation": self.machine_installation,
                    "items": items
                })
                se.insert(ignore_permissions=True)
                se.submit()

    def _validation_for_ar_and_mr_uninstallation(self):
        if self.visit_type == "Uninstallation":
            if not self.machine_installation:
                frappe.throw("Machine Installation is not linked to this Visit Log.")

            # Find Installation MI with same Sales Order as this Uninstallation MI
            uninstall_mi = frappe.db.get_value(
                "Machine Installation and Un-Installation",
                self.machine_installation,
                ["sales_order", "name"],
                as_dict=True
            )

            install_submitted = False
            if uninstall_mi and uninstall_mi.sales_order:
                # Find Installation MI(s) for same Sales Order
                install_mi_list = frappe.get_all(
                    "Machine Installation and Un-Installation",
                    filters={
                        "sales_order": uninstall_mi.sales_order,
                        "installation_type": "Installation",
                        "docstatus": 1
                    },
                    pluck="name"
                )
                if install_mi_list:
                    install_submitted = frappe.db.exists("Visit Log", {
                        "machine_installation": ["in", install_mi_list],
                        "visit_type": "Installation",
                        "docstatus": 1
                    })

            if not install_submitted:
                frappe.throw(
                    "Cannot submit Uninstallation Visit Log: "
                    "a submitted <b>Installation</b> Visit Log must exist for this Sales Order first."
                )

    def _get_employee_warehouse(self, company=None):
        if not self.assign_to:
            return None
        filters = {"custom_user": self.assign_to}
        if company:
            filters["company"] = company
        return frappe.db.get_value("Warehouse", filters, "name")

    def _get_employee_location(self):
        if not self.assign_to:
            return None
        return frappe.db.get_value("Location", {"custom_user": self.assign_to}, "name")

    def _update_maintenance_schedule_on_completion(self):
        """Mark the nearest pending Maintenance Schedule Detail as Completed
        when a Regular Visit (non-installation) Visit Log is submitted."""
        if self.visit_type in ("Demo Installation", "Demo Uninstallation", "Installation", "Uninstallation"):
            return

        if not self.machine_installation:
            return

        # Find submitted Maintenance Schedule for this Machine Installation
        ms_name = frappe.db.get_value(
            "Maintenance Schedule",
            {"custom_machine_installation": self.machine_installation, "docstatus": 1},
            "name"
        )
        if not ms_name:
            return

        completion_date = (
            frappe.utils.getdate(self.completion_date_and_time)
            if self.completion_date_and_time
            else frappe.utils.today()
        )

        # Find the nearest Pending detail row by scheduled_date
        detail = frappe.db.sql("""
            SELECT name
            FROM `tabMaintenance Schedule Detail`
            WHERE parent = %s
              AND completion_status = 'Pending'
            ORDER BY ABS(DATEDIFF(scheduled_date, %s)) ASC
            LIMIT 1
        """, (ms_name, completion_date), as_dict=True)

        if not detail:
            return

        frappe.db.set_value(
            "Maintenance Schedule Detail",
            detail[0].name,
            {
                "completion_status": "Completed",
                "actual_date": completion_date
            }
        )

        # If all detail rows completed, mark the schedule itself as Completed
        pending_count = frappe.db.count(
            "Maintenance Schedule Detail",
            {"parent": ms_name, "completion_status": "Pending"}
        )
        if not pending_count:
            frappe.db.set_value("Maintenance Schedule", ms_name, "status", "Completed")

    def _auto_create_installation_entries(self):
        if self.visit_type != "Installation":
            return

        if not self.asset:
            return

        # 1. Asset Movement (Transfer): employee location → client location
        am_exists = frappe.db.exists("Asset Movement", {
            "custom_visit_log": self.name,
            "purpose": "Transfer",
            "docstatus": 1
        })
        if not am_exists:
            employee_location = self._get_employee_location() or ""
            # Use client_location from Machine Installation, not target_location
            # (target_location defaults to "Demo Location" which is wrong for Installation)
            client_location = frappe.db.get_value(
                "Machine Installation and Un-Installation",
                self.machine_installation,
                "client_location"
            ) or ""
            am = frappe.get_doc({
                "doctype": "Asset Movement",
                "purpose": "Transfer",
                "company": self.company,
                "custom_visit_log": self.name,
                "custom_machine_installation": self.machine_installation,
                "assets": [{
                    "asset": self.asset,
                    "source_location": employee_location,
                    "target_location": client_location
                }]
            })
            am.insert(ignore_permissions=True)
            am.submit()

        # 2. Stock Entry (Material Transfer): employee warehouse → client warehouse
        se_exists = frappe.db.exists("Stock Entry", {
            "custom_visit_log": self.name,
            "stock_entry_type": "Material Transfer",
            "docstatus": 1
        })
        if not se_exists:
            employee_warehouse = self._get_employee_warehouse()
            mi = frappe.get_doc("Machine Installation and Un-Installation", self.machine_installation) if self.machine_installation else None
            target_warehouse = (mi.get("client_warehouse") if mi else None) or None

            # Build items from VL maintenance table (refill_qty)
            items = []
            for row in (self.custom_asset_maintenance_item or []):
                if row.item_code and (row.refill_qty or 0) > 0:
                    items.append({
                        "item_code": row.item_code,
                        "qty": row.refill_qty,
                        "uom": row.uom or "Nos",
                        "s_warehouse": employee_warehouse,
                        "t_warehouse": target_warehouse,
                        "custom_visit_log": self.name
                    })

            # Fallback: if VL has no refill items, mirror the MI-level SE
            # (items transferred from stores → employee warehouse in the pre-submit step)
            if not items and self.machine_installation:
                prev_se_name = frappe.db.get_value(
                    "Stock Entry",
                    {
                        "custom_machine_installation": self.machine_installation,
                        "stock_entry_type": "Material Transfer",
                        "docstatus": 1
                    },
                    "name",
                    order_by="creation asc"
                )
                if prev_se_name:
                    for item in frappe.db.get_all(
                        "Stock Entry Detail",
                        filters={"parent": prev_se_name},
                        fields=["item_code", "qty", "uom", "t_warehouse"]
                    ):
                        items.append({
                            "item_code": item.item_code,
                            "qty": item.qty,
                            "uom": item.uom or "Nos",
                            "s_warehouse": item.t_warehouse or employee_warehouse,
                            "t_warehouse": target_warehouse,
                            "custom_visit_log": self.name
                        })

            if items:
                se = frappe.get_doc({
                    "doctype": "Stock Entry",
                    "stock_entry_type": "Material Transfer",
                    "company": self.company,
                    "from_warehouse": employee_warehouse,
                    "to_warehouse": target_warehouse,
                    "custom_visit_log": self.name,
                    "custom_machine_installation": self.machine_installation,
                    "items": items
                })
                se.insert(ignore_permissions=True)
                se.submit()

    def _auto_create_delivery_note_for_installation(self):
        """Auto-create and submit a Delivery Note when an Installation Visit Log is submitted.
        Source warehouse = employee's warehouse (looked up via assign_to → Warehouse.custom_user).
        Items are pulled from the linked Sales Order; falls back to maintenance items if no SO."""
        if self.visit_type != "Installation":
            return

        if not self.machine_installation:
            return

        # Skip if a DN already exists for this Visit Log
        if frappe.db.exists("Delivery Note", {"custom_visit_log": self.name, "docstatus": ["!=", 2]}):
            return

        mi = frappe.get_doc("Machine Installation and Un-Installation", self.machine_installation)

        company = self.company or ""
        customer = frappe.db.get_value("Sales Order", mi.sales_order, "customer") if mi.sales_order else None

        if not customer:
            # Try fetching customer from the asset
            customer = frappe.db.get_value("Asset", self.asset, "custodian") if self.asset else None

        if not customer:
            frappe.log_error(
                f"Visit Log {self.name}: could not determine customer for Delivery Note — skipping.",
                "DN Auto-Create"
            )
            return

        employee_warehouse = self._get_employee_warehouse()

        items = []

        # Build items from Sales Order
        if mi.sales_order:
            so_items = frappe.db.get_all(
                "Sales Order Item",
                filters={"parent": mi.sales_order},
                fields=["item_code", "item_name", "description", "qty", "uom", "rate", "name"]
            )
            for si in so_items:
                items.append({
                    "item_code": si.item_code,
                    "item_name": si.item_name,
                    "description": si.description or si.item_name,
                    "qty": si.qty,
                    "uom": si.uom,
                    "rate": si.rate,
                    "warehouse": employee_warehouse,
                    "against_sales_order": mi.sales_order,
                    "so_detail": si.name,
                    "custom_visit_log": self.name
                })

        # Fallback: use maintenance items (installed_qty / refill_qty)
        if not items:
            for row in (self.custom_asset_maintenance_item or []):
                qty = row.get("refill_qty") or 0
                if row.item_code and qty > 0:
                    items.append({
                        "item_code": row.item_code,
                        "qty": qty,
                        "uom": row.uom or "Nos",
                        "warehouse": employee_warehouse,
                        "custom_visit_log": self.name
                    })

        if not items:
            return

        dn = frappe.get_doc({
            "doctype": "Delivery Note",
            "customer": customer,
            "company": company,
            "posting_date": frappe.utils.today(),
            "set_warehouse": employee_warehouse,
            "custom_visit_log": self.name,
            "items": items
        })
        dn.insert(ignore_permissions=True)
        dn.submit()

    # Auto-create Asset Movement + Stock Entry when Demo Installation Visit Log is submitted
    def _auto_create_demo_installation_entries(self):
        print(f"Auto-create entries for Demo Installation: Visit Type = {self.visit_type}, Machine Installation = {self.machine_installation}")
        if self.visit_type != "Demo Installation":
            return

        if not self.machine_installation:
            frappe.throw("Machine Installation is not linked to this Visit Log.")

        mi = frappe.get_doc("Machine Installation and Un-Installation", self.machine_installation)
        demo_location = mi.get("client_location") or ""
        demo_warehouse = mi.get("client_warehouse") or None
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
        
        
        
        # AM/SE are auto-created by _auto_create_demo_installation_entries on submit — no pre-check needed
        pass

    # Auto-create Asset Movement (Transfer) + Stock Entry when Demo Uninstallation VL is submitted
    def _auto_create_demo_uninstallation_entries(self):
        if self.visit_type != "Demo Uninstallation":
            return

        if not self.machine_installation:
            frappe.throw("Machine Installation is not linked to this Visit Log.")

        mi = frappe.get_doc("Machine Installation and Un-Installation", self.machine_installation)
        demo_location = mi.get("client_location") or ""
        employee_location = self._get_employee_location() or ""
        demo_warehouse = mi.get("client_warehouse") or None

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
        # Use existing_qty from VL maintenance items (filled by user before submit)
        employee_warehouse = self._get_employee_warehouse()

        se_exists = frappe.db.exists("Stock Entry", {
            "custom_visit_log": self.name,
            "stock_entry_type": "Material Transfer",
            "docstatus": 1
        })
        if not se_exists:
            items = []
            for row in (self.custom_asset_maintenance_item or []):
                if row.item_code and (row.existing_qty or 0) > 0:
                    items.append({
                        "item_code": row.item_code,
                        "qty": row.existing_qty,
                        "uom": row.uom or "Nos",
                        "s_warehouse": demo_warehouse,
                        "t_warehouse": employee_warehouse,
                        "custom_visit_log": self.name
                    })

            if items:
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

            # Demo Installation VL must be submitted before Demo Uninstallation can be submitted
            install_submitted = frappe.db.exists("Visit Log", {
                "machine_installation": mi_name,
                "visit_type": "Demo Installation",
                "docstatus": 1
            })
            if not install_submitted:
                frappe.throw(
                    "Cannot submit Demo Uninstallation Visit Log: "
                    "a submitted <b>Demo Installation</b> Visit Log must exist for this Machine Installation first."
                )

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

    # Status Update — fires on submit (docstatus 0→1 triggers on_update after on_submit)
    def on_update(self):
        if self.docstatus != 1:
            return
        try:
            if not self.machine_installation:
                return

            new_status = None
            extra_fields = {}

            if self.visit_type == "Installation":
                new_status = "Installed"
                extra_fields["continue_with_subscription"] = 1

            # Uninstallation status → "Completed" only after Submit to Company (set there, not here)

            elif self.visit_type == "Demo Installation":
                uninstall_done = frappe.db.exists("Visit Log", {
                    "machine_installation": self.machine_installation,
                    "visit_type": "Demo Uninstallation",
                    "docstatus": 1
                })
                if not uninstall_done:
                    new_status = "Demo Installation Completed"

            elif self.visit_type == "Demo Uninstallation":
                new_status = "Demo Uninstallation Completed"

            if new_status:
                update_fields = {"status": new_status, **extra_fields}
                frappe.db.set_value(
                    "Machine Installation and Un-Installation",
                    self.machine_installation,
                    update_fields,
                    update_modified=False
                )

            # Auto-submit MI if still in Draft when Installation VL is submitted
            if self.visit_type == "Installation":
                mi_docstatus = frappe.db.get_value(
                    "Machine Installation and Un-Installation",
                    self.machine_installation,
                    "docstatus"
                )
                if mi_docstatus == 0:
                    mi_doc = frappe.get_doc(
                        "Machine Installation and Un-Installation",
                        self.machine_installation
                    )
                    mi_doc.submit()

        except Exception:
            frappe.log_error(frappe.get_traceback(), "Visit Log on_update Error")

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

