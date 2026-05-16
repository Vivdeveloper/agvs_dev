import frappe
from frappe.model.document import Document


class MachineInstallationandUnInstallation(Document):

    def before_save(self):
        self._machine_installation_before_save()
        self._machine_satatu_chnage_by_viv()
        self._checkboxes_in_mi()

    # machine installation before save
    def _machine_installation_before_save(self):
        for row in self.machine_items:
            if not row.asset:
                frappe.throw("Asset cannot be blank in Machine Items.")
            
        
        # Block only if BOTH dates are missing
        if not self.planned_installation_date and not self.planned_uninstallation_date:
            frappe.throw(
                "Please add at least one date: Planned Installation or Planned Uninstallation."
            )

    # machine satatu chnage by viv
    def _machine_satatu_chnage_by_viv(self):
        # if doc.actual_installation_date:
        #     doc.status = "Installed"
        
        
        if self.actual_installation_date and self.actual_uninstallation_date:
            self.status = "Completed"
        elif self.actual_installation_date:
            self.status = "Installed"

    def before_submit(self):
        self._ai_and_mi()
        self._auto_create_visit_log_for_demo()
        self._validation_for_demo_machine()

    # AI and MI
    def _ai_and_mi(self):
        # # # mi_name = doc.custom_machine_installation
        
        # # # if mi_name:
        # # #     mi = frappe.get_doc("Machine Installation and Un-Installation", mi_name)
        
        # # #     if mi.installation_type == "Installation":
        # # #         errors = []
        
        # # #         am_list = frappe.get_list("Asset Movement", filters={
        # # #             "custom_machine_installation": mi_name,
        # # #             "purpose": "Transfer",
        # # #             "docstatus": 1
        # # #         }, fields=["name"], limit_page_length=1)
        
        # # #         se_list = frappe.get_list("Stock Entry", filters={
        # # #             "custom_machine_installation": mi_name,
        # # #             "stock_entry_type": "Material Issue",
        # # #             "docstatus": 1
        # # #         }, fields=["name"], limit_page_length=1)
        
        # # #         if not am_list:
        # # #             errors.append("Asset Movement (Issue) has not been created or submitted yet.")
        
        # # #         if not se_list:
        # # #             errors.append("Stock Entry (Material Issue) has not been created or submitted yet.")
        
        # # #         if errors:
        # # #             frappe.throw("Cannot submit Visit Log. Complete the following first:<br><ul>" + "".join(["<li>" + e + "</li>" for e in errors]) + "</ul>")
        
        
        # # # #
        
        
        
        
        
        
        # # if doc.installation_type == "Installation":
        
        # #     errors = []
        
        # #     am_list = frappe.get_list("Asset Movement", filters={
        # #         "custom_machine_installation": doc.name,
        # #         "purpose": "Issue",
        # #         "docstatus": 1
        # #     }, fields=["name"], limit_page_length=1)
        
        # #     se_list = frappe.get_list("Stock Entry", filters={
        # #         "custom_machine_installation": doc.name,
        # #         "stock_entry_type": "Material Issue",
        # #         "docstatus": 1
        # #     }, fields=["name"], limit_page_length=1)
        
        # #     if not am_list:
        # #         errors.append("Asset Issue (Asset Movement) has not been created or submitted yet.")
        
        # #     if not se_list:
        # #         errors.append("Material Issue (Stock Entry) has not been created or submitted yet.")
        
        # #     if errors:
        # #         frappe.throw("Cannot submit. Complete the following first:<br><ul>" + "".join(["<li>" + e + "</li>" for e in errors]) + "</ul>")
        
        
        
        # # Save and clear address to bypass Frappe's link validation
        # saved_address = doc.address
        # doc.address = None
        
        # if doc.installation_type == "Installation":
        #     errors = []
        
        #     am_list = frappe.get_list("Asset Movement", filters={
        #         "custom_machine_installation": doc.name,
        #         "purpose": "Issue",
        #         "docstatus": 1
        #     }, fields=["name"], limit_page_length=1)
        
        #     se_list = frappe.get_list("Stock Entry", filters={
        #         "custom_machine_installation": doc.name,
        #         "stock_entry_type": "Material Issue",
        #         "docstatus": 1
        #     }, fields=["name"], limit_page_length=1)
        
        #     if not am_list:
        #         errors.append("Asset Issue (Asset Movement) has not been created or submitted yet.")
        
        #     if not se_list:
        #         errors.append("Material Issue (Stock Entry) has not been created or submitted yet.")
        
        #     if errors:
        #         doc.address = saved_address
        #         frappe.throw("Cannot submit. Complete the following first:<br><ul>" + "".join(["<li>" + e + "</li>" for e in errors]) + "</ul>")
        
        # # Restore address in DB after validation passes
        # frappe.db.set_value("Machine Installation and Un-Installation", doc.name, "address", saved_address)
        
        
        
        
        if self.installation_type == "Installation":
            errors = []

            am_list = frappe.get_list("Asset Movement", filters={
                "custom_machine_installation": self.name,
                "purpose": "Transfer",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)

            se_list = frappe.get_list("Stock Entry", filters={
                "custom_machine_installation": self.name,
                "stock_entry_type": "Material Issue",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)

            if not am_list:
                errors.append("Asset Issue (Asset Movement) has not been created or submitted yet.")

            if not se_list:
                errors.append("Material Issue (Stock Entry) has not been created or submitted yet.")

            if errors:
                frappe.throw("Cannot submit. Complete the following first:<br><ul>" + "".join(["<li>" + e + "</li>" for e in errors]) + "</ul>")

    # Auto Create Visit log for Demo
    def _get_se_target_warehouse(self):
        """Fetch t_warehouse from the submitted Stock Entry's items linked to this MI."""
        se_name = frappe.db.get_value(
            "Stock Entry",
            {"custom_machine_installation": self.name, "docstatus": 1},
            "name"
        )
        if not se_name:
            return None
        # Try header-level to_warehouse first
        wh = frappe.db.get_value("Stock Entry", se_name, "to_warehouse")
        if wh:
            return wh
        # Fall back to first item's t_warehouse (user fills this manually)
        wh = frappe.db.sql(
            "SELECT t_warehouse FROM `tabStock Entry Detail` WHERE parent=%s AND t_warehouse IS NOT NULL AND t_warehouse != '' LIMIT 1",
            se_name
        )
        return wh[0][0] if wh else None

    def _auto_create_visit_log_for_demo(self):
        # ---------------------------------------------------------
        # RUN ONLY FOR DEMO MACHINE
        # ---------------------------------------------------------
        if self.installation_type == "Demo Installation":
            # ❌ Block only if BOTH dates are missing
            if not self.planned_installation_date and not self.planned_uninstallation_date:
                frappe.throw(
                    "Please add at least one date: Planned Installation or Planned Uninstallation."
                )
            # Machine Items must exist
            if not self.machine_items:
                frappe.throw("Add at least one Machine Item with an Asset.")
            # ---------------------------------------------------------
            # LOOP MACHINE ITEMS
            # ---------------------------------------------------------
            for row in self.machine_items:
                if not row.asset:
                    frappe.throw("All Machine Items must have an Asset.")
                asset_id = row.asset
                # -----------------------------------------------------
                # 1️⃣ INSTALLATION VISIT (ONLY IF DATE EXISTS)
                # -----------------------------------------------------
                if self.planned_installation_date:
                    install_exists = frappe.db.exists(
                        "Visit Log",
                        {
                            "machine_installation": self.name,
                            "asset": asset_id,
                            "visit_type": "Demo Installation"
                        }
                    )
                    if not install_exists:
                        install_log = frappe.get_doc({
                            "doctype": "Visit Log",
                            "machine_installation": self.name,
                            "asset": asset_id,
                            "visit_type": "Demo Installation",
                            "maintenance_status": "Planned",
                            "maintenance_date": self.planned_installation_date,
                            "due_date": self.planned_installation_date,
                            "assign_to": self.assigned_to,
                            "warehouse": self._get_se_target_warehouse(),
                            "contact_email": self.contact_email,
                            "contact_mobile": self.contact_mobile,
                            "custom_address_display": self.address_display
                        })
                        install_log.insert(ignore_permissions=True)
                # -----------------------------------------------------
                # 2️⃣ UNINSTALLATION VISIT (ONLY IF DATE EXISTS)
                # -----------------------------------------------------
                if self.planned_uninstallation_date:
                    uninstall_exists = frappe.db.exists(
                        "Visit Log",
                        {
                            "machine_installation": self.name,
                            "asset": asset_id,
                            "visit_type": "Demo Uninstallation"
                        }
                    )
                    if not uninstall_exists:
                        uninstall_log = frappe.get_doc({
                            "doctype": "Visit Log",
                            "machine_installation": self.name,
                            "asset": asset_id,
                            "visit_type": "Demo Uninstallation",
                            "maintenance_status": "Planned",
                            "maintenance_date": self.planned_uninstallation_date,
                            "due_date": self.planned_uninstallation_date,
                            "assign_to": self.assigned_to,
                            "warehouse": self._get_se_target_warehouse(),
                            "contact_email": self.contact_email,
                            "contact_mobile": self.contact_mobile,
                            "custom_address_display": self.address_display
                        })
                        uninstall_log.insert(ignore_permissions=True)

    # Validation for demo machine
    def _validation_for_demo_machine(self):
        if self.installation_type == "Demo Installation":

            errors = []

            am_list = frappe.get_list("Asset Movement", filters={
                "custom_machine_installation": self.name,
                "purpose": "Transfer",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)
        
            se_list = frappe.get_list("Stock Entry", filters={
                "custom_machine_installation": self.name,
                "stock_entry_type": "Material Transfer",
                "docstatus": 1
            }, fields=["name"], limit_page_length=1)
        
            if not am_list:
                errors.append("Asset Issue (Asset Movement) has not been created or submitted yet.")
        
            if not se_list:
                errors.append("Material Issue (Stock Entry) has not been created or submitted yet.")
        
            if errors:
                frappe.throw(
                    "Cannot submit. Complete the following first:<br><ul>"
                    + "".join(["<li>" + e + "</li>" for e in errors])
                    + "</ul>"
                )

    def on_submit(self):
        self._auto_create_visit_logs_for_installation_and_uninstallation()
        self._auto_create_vl_after_save_for_uninstallation()
        self._checkboxes_in_mi()
        self._opportunity_update()

    # Auto create visit logs for Installation and Uninstallation
    def _auto_create_visit_logs_for_installation_and_uninstallation(self):
        # if doc.installation_type in ["Installation", "Uninstallation"]:
        
        #     if not doc.machine_items:
        #         frappe.throw("Add at least one Machine Item with an Asset.")
        
        #     for row in doc.machine_items:
        #         if not row.asset:
        #             frappe.throw("All Machine Items must have an Asset.")
        
        #         if doc.installation_type == "Installation":
        #             if not doc.planned_installation_date:
        #                 frappe.throw("Please add a Planned Installation Date.")
        
        #             visit_exists = frappe.db.exists("Visit Log", {
        #                 "machine_installation": doc.name,
        #                 "asset": row.asset,
        #                 "visit_type": "Installation"
        #             })
        
        #             if not visit_exists:
        #                 frappe.get_doc({
        #                     "doctype": "Visit Log",
        #                     "machine_installation": doc.name,
        #                     "asset": row.asset,
        #                     "visit_type": "Installation",
        #                     "maintenance_status": "Planned",
        #                     "maintenance_date": doc.planned_installation_date,
        #                     "due_date": doc.planned_installation_date,
        #                     "assign_to": doc.assigned_to,
        #                     "contact_email": doc.contact_email,
        #                     "contact_mobile": doc.contact_mobile
        #                 }).insert(ignore_permissions=True)
        
        #         elif doc.installation_type == "Uninstallation":
        #             if not doc.planned_uninstallation_date:
        #                 frappe.throw("Please add a Planned Uninstallation Date.")
        
        #             visit_exists = frappe.db.exists("Visit Log", {
        #                 "machine_installation": doc.name,
        #                 "asset": row.asset,
        #                 "visit_type": "Uninstallation"
        #             })
        
        #             if not visit_exists:
        #                 frappe.get_doc({
        #                     "doctype": "Visit Log",
        #                     "machine_installation": doc.name,
        #                     "asset": row.asset,
        #                     "visit_type": "Uninstallation",
        #                     "maintenance_status": "Planned",
        #                     "maintenance_date": doc.planned_uninstallation_date,
        #                     "due_date": doc.planned_uninstallation_date,
        #                     "assign_to": doc.assigned_to,
        #                     "contact_email": doc.contact_email,
        #                     "contact_mobile": doc.contact_mobile
        #                 }).insert(ignore_permissions=True)
        
        
        
        
        if self.installation_type == "Installation":
            if not self.machine_items:
                frappe.throw("Add at least one Machine Item with an Asset.")
            for row in self.machine_items:
                if not row.asset:
                    frappe.throw("All Machine Items must have an Asset.")
                if not self.planned_installation_date:
                    frappe.throw("Please add a Planned Installation Date.")
                visit_exists = frappe.db.exists("Visit Log", {
                    "machine_installation": self.name,
                    "asset": row.asset,
                    "visit_type": "Installation"
                })
                if not visit_exists:
                    frappe.get_doc({
                        "doctype": "Visit Log",
                        "machine_installation": self.name,
                        "asset": row.asset,
                        "visit_type": "Installation",
                        "maintenance_status": "Planned",
                        "maintenance_date": self.planned_installation_date,
                        "due_date": self.planned_installation_date,
                        "assign_to": self.assigned_to,
                        "warehouse": self._get_se_target_warehouse(),
                        "contact_email": self.contact_email,
                        "contact_mobile": self.contact_mobile,
                        "custom_address_display": self.address_display
                    }).insert(ignore_permissions=True)

    # Auto create VL after save for uninstallation
    def _auto_create_vl_after_save_for_uninstallation(self):
        if self.installation_type == "Uninstallation":
        
            if not self.machine_items:
                frappe.throw("Add at least one Machine Item with an Asset.")
        
            if not self.planned_uninstallation_date:
                frappe.throw("Please add a Planned Uninstallation Date.")
        
            for row in self.machine_items:
                if not row.asset:
                    frappe.throw("All Machine Items must have an Asset.")
        
                visit_exists = frappe.db.exists("Visit Log", {
                    "machine_installation": self.name,
                    "asset": row.asset,
                    "visit_type": "Uninstallation"
                })
        
                if not visit_exists:
                    frappe.get_doc({
                        "doctype": "Visit Log",
                        "machine_installation": self.name,
                        "asset": row.asset,
                        "visit_type": "Uninstallation",
                        "maintenance_status": "Planned",
                        "maintenance_date": self.planned_uninstallation_date,
                        "due_date": self.planned_uninstallation_date,
                        "assign_to": self.assigned_to,
                        "warehouse": self._get_se_target_warehouse(),
                        "contact_email": self.contact_email,
                        "contact_mobile": self.contact_mobile,
                        "custom_address_display": self.address_display
                    }).insert(ignore_permissions=True)

    # Checkboxes in MI
    def _checkboxes_in_mi(self):
        # This runs inside Machine Installation and Un-Installation
        
        # -------------------------------
        # INSTALLATION / UNINSTALLATION
        # -------------------------------
        if self.installation_type == "Installation":

            # ✅ Asset Movement (Issue)
            asset_issue = frappe.get_list("Asset Movement", filters={
                "custom_machine_installation": self.name,
                "purpose": "Issue",
                "docstatus": 1
            }, limit_page_length=1)

            self.asset_issue_done = 1 if asset_issue else 0
        
            # ✅ Stock Entry (Material Issue)
            material_issue = frappe.get_list("Stock Entry", filters={
                "custom_machine_installation": self.name,
                "stock_entry_type": "Material Transfer",
                "docstatus": 1
            }, limit_page_length=1)
        
            self.material_issue_done = 1 if material_issue else 0
        
            # -------------------------------
            # INSTALLATION
            # -------------------------------
            # if doc.installation_type == "Installation":
            
            #     # ✅ Get Visit Logs linked to this Machine Installation
            #     visit_logs = frappe.get_all("Visit Log", filters={
            #         "custom_machine_installation": doc.name
            #     }, pluck="name")
            
            #     # ✅ Asset Movement (Transfer)
            #     asset_issue = frappe.get_list("Asset Movement", filters={
            #         "custom_visit_log": ["in", visit_logs],
            #         "purpose": "Issue",
            #         "docstatus": 1
            #     }, limit_page_length=1)
            
            #     doc.asset_issue_done = 1 if asset_issue else 0
            
            #     # ✅ Stock Entry (Material Issue)
            #     material_issue = frappe.get_list("Stock Entry", filters={
            #         "custom_visit_log": ["in", visit_logs],
            #         "stock_entry_type": "Material Issue",
            #         "docstatus": 1
            #     }, limit_page_length=1)
            
            #     doc.material_issue_done = 1 if material_issue else 0
        
        elif self.installation_type == "Uninstallation":
        
            # ✅ Asset Movement (Receipt)
            asset_transfer = frappe.get_list("Asset Movement", filters={
                "custom_machine_installation": self.name,
                "purpose": "Receipt",
                "docstatus": 1
            }, limit_page_length=1)
        
            self.asset_transfer_done = 1 if asset_transfer else 0
        
            # ✅ Stock Entry (Material Receipt)
            material_transfer = frappe.get_list("Stock Entry", filters={
                "custom_machine_installation": self.name,
                "stock_entry_type": "Material Receipt",
                "docstatus": 1
            }, limit_page_length=1)
        
            self.material_transfer_done = 1 if material_transfer else 0
        
        
        elif self.installation_type == "Demo Installation":

            # Asset Movement (Issue) → asset_issue_done
            asset_issue = frappe.get_list("Asset Movement", filters={
                "custom_machine_installation": self.name,
                "purpose": "Issue",
                "docstatus": 1
            }, limit_page_length=1)

            self.asset_issue_done = 1 if asset_issue else 0

            # Stock Entry (Material Transfer) → material_issue_done
            material_issue = frappe.get_list("Stock Entry", filters={
                "custom_machine_installation": self.name,
                "stock_entry_type": "Material Transfer",
                "docstatus": 1
            }, limit_page_length=1)

            self.material_issue_done = 1 if material_issue else 0

        # else:
        #     # reset all flags if type is none of the above
        #     # self.asset_issue_done = 0
        #     self.material_issue_done = 0
        #     self.asset_transfer_done = 0
        #     self.material_transfer_done = 0

    # DISABLED - Opportunity update
    def _opportunity_update(self):
        if self.reference_name and self.installation_type == "Demo Installation":
            frappe.db.set_value(
                "Opportunity",
                self.reference_name,
                {
                    "sales_stage": "Demo Installation",
                    "custom_demo_installation_date": self.planned_installation_date
                }
            )


@frappe.whitelist()
def create_return_to_company(mi_name):
    mi = frappe.get_doc("Machine Installation and Un-Installation", mi_name)

    company = frappe.db.get_value(
        "Asset Movement",
        {"custom_machine_installation": mi_name, "docstatus": 1},
        "company"
    ) or frappe.db.get_value(
        "Stock Entry",
        {"custom_machine_installation": mi_name, "docstatus": 1},
        "company"
    )
    if not company:
        frappe.throw("Could not determine company from linked entries.")

    employee_location = frappe.db.get_value("Location", {"custom_user": mi.assigned_to}, "name") or ""
    employee_warehouse = frappe.db.get_value("Warehouse", {"custom_user": mi.assigned_to}, "name") or ""
    stores_warehouse = mi.material_warehouse or ""

    # Company location = source_location of the first Transfer AM for this MI
    # (the create_asset_issue AM which moved asset from company → employee before demo)
    company_loc_data = frappe.db.sql("""
        SELECT ami.source_location
        FROM `tabAsset Movement Item` ami
        JOIN `tabAsset Movement` am ON am.name = ami.parent
        WHERE am.custom_machine_installation = %s
          AND am.purpose = 'Transfer'
          AND am.docstatus = 1
        ORDER BY am.creation ASC
        LIMIT 1
    """, mi_name, as_dict=True)
    company_location = company_loc_data[0].source_location if company_loc_data else ""

    result = {}

    # 1. Asset Movement (Transfer): employee_location → company_location
    assets = []
    for row in (mi.machine_items or []):
        if row.asset:
            assets.append({
                "asset": row.asset,
                "source_location": employee_location,
                "target_location": company_location
            })

    if assets:
        am = frappe.get_doc({
            "doctype": "Asset Movement",
            "purpose": "Transfer",
            "company": company,
            "custom_machine_installation": mi_name,
            "assets": assets
        })
        am.insert(ignore_permissions=True)
        am.submit()
        result["am"] = am.name

    # 2. Stock Entry (Material Transfer): employee_warehouse → stores_warehouse
    # Use items/qty from the latest Material Transfer SE linked to this MI
    last_se = frappe.db.sql("""
        SELECT name FROM `tabStock Entry`
        WHERE custom_machine_installation = %s
          AND stock_entry_type = 'Material Transfer'
          AND docstatus = 1
        ORDER BY creation DESC
        LIMIT 1
    """, mi_name, as_dict=True)

    items = []
    if last_se:
        for item in frappe.db.get_all(
            "Stock Entry Detail",
            filters={"parent": last_se[0].name},
            fields=["item_code", "qty", "uom", "t_warehouse"]
        ):
            items.append({
                "item_code": item.item_code,
                "qty": item.qty,
                "uom": item.uom or "Nos",
                "s_warehouse": item.t_warehouse or employee_warehouse,
                "t_warehouse": stores_warehouse
            })
    else:
        for row in (mi.table_uuer or []):
            if row.item_code and (row.issued_qty or 0) > 0:
                items.append({
                    "item_code": row.item_code,
                    "qty": row.issued_qty,
                    "uom": row.uom or "Nos",
                    "s_warehouse": employee_warehouse,
                    "t_warehouse": stores_warehouse
                })

    if items:
        se = frappe.get_doc({
            "doctype": "Stock Entry",
            "stock_entry_type": "Material Transfer",
            "company": company,
            "from_warehouse": employee_warehouse,
            "to_warehouse": stores_warehouse,
            "custom_machine_installation": mi_name,
            "items": items
        })
        se.insert(ignore_permissions=True)
        se.submit()
        result["se"] = se.name

    return result

