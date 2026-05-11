# Copyright (c) 2026, Sanket and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

COMPANY  = "AGVS ENTERPRISES PVT LTD"
ASSET    = "SW-00001"
ITEM     = "SO-scent-2"
WHOUSE   = "Stores - AEPL"
LOCATION = "demo2"


# ─────────────────────────────────────────────────────────────────────────────
# DEMO MACHINE FLOW
# ─────────────────────────────────────────────────────────────────────────────
class TestVisitLogDemoFlow(FrappeTestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.mi = frappe.get_doc({
            "doctype": "Machine Installation and Un-Installation",
            "installation_type": "Demo Installation",
            "maintenance_team": "new",
            "assigned_to": "Administrator",
            "client_location": LOCATION,
            "material_warehouse": WHOUSE,
            "planned_installation_date": "2026-06-01",
            "planned_uninstallation_date": "2026-07-01",
            "machine_items": [{"asset": ASSET}],
        })
        cls.mi.insert(ignore_permissions=True)
        frappe.db.commit()

    @classmethod
    def tearDownClass(cls):
        frappe.delete_doc(
            "Machine Installation and Un-Installation",
            cls.mi.name, force=True, ignore_permissions=True
        )
        frappe.db.commit()
        super().tearDownClass()

    # TC01 ─────────────────────────────────────────────────────────────────────
    def test_tc01_auto_create_throws_when_no_mi(self):
        """TC01 [Demo]: _auto_create_demo_installation_entries raises when MI not linked"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Demo Installation"
        vl.company = COMPANY
        with self.assertRaises(frappe.ValidationError):
            vl._auto_create_demo_installation_entries()

    # TC02 ─────────────────────────────────────────────────────────────────────
    def test_tc02_validation_throws_when_no_mi(self):
        """TC02 [Demo]: _validation_for_demo_machine_installation raises when MI not linked"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Demo Installation"
        vl.company = COMPANY
        with self.assertRaises(frappe.ValidationError):
            vl._validation_for_demo_machine_installation()

    # TC03 ─────────────────────────────────────────────────────────────────────
    def test_tc03_validation_error_says_material_transfer_not_issue(self):
        """TC03 [Demo]: Validation error must say 'Material Transfer', NOT 'Material Issue'"""
        vl = frappe.get_doc({
            "doctype": "Visit Log",
            "visit_type": "Demo Installation",
            "company": COMPANY,
            "machine_installation": self.mi.name,
            "maintenance_status": "Planned",
        })
        vl.insert(ignore_permissions=True)
        frappe.db.commit()
        try:
            with self.assertRaises(frappe.ValidationError) as ctx:
                vl._validation_for_demo_machine_installation()
            msg = str(ctx.exception)
            self.assertNotIn(
                "Material Issue", msg,
                "FAIL: Error says 'Material Issue' — should say 'Material Transfer'"
            )
            self.assertIn(
                "Material Transfer", msg,
                "FAIL: Error must mention 'Material Transfer'"
            )
        finally:
            frappe.delete_doc("Visit Log", vl.name, force=True, ignore_permissions=True)
            frappe.db.commit()

    # TC04 ─────────────────────────────────────────────────────────────────────
    def test_tc04_demo_uninstallation_requires_am_and_se_receipt(self):
        """TC04 [Demo]: Demo Uninstallation without AM Receipt + SE Receipt raises both errors"""
        vl = frappe.get_doc({
            "doctype": "Visit Log",
            "visit_type": "Demo Uninstallation",
            "company": COMPANY,
            "machine_installation": self.mi.name,
            "maintenance_status": "Planned",
        })
        vl.insert(ignore_permissions=True)
        frappe.db.commit()
        try:
            with self.assertRaises(frappe.ValidationError) as ctx:
                vl._validation_for_demo_machine_uninstallation()
            msg = str(ctx.exception)
            self.assertIn("Asset Receipt", msg)
            self.assertIn("Material Receipt", msg)
        finally:
            frappe.delete_doc("Visit Log", vl.name, force=True, ignore_permissions=True)
            frappe.db.commit()

    # TC05 ─────────────────────────────────────────────────────────────────────
    def test_tc05_non_demo_type_skips_demo_validation(self):
        """TC05 [Demo]: Maintenance visit type must NOT trigger demo validation"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Maintenance"
        vl.company = COMPANY
        try:
            vl._auto_create_demo_installation_entries()
            vl._validation_for_demo_machine_installation()
        except frappe.ValidationError:
            self.fail("TC05 FAIL: Non-demo type should skip demo validation entirely")

    # TC06 ─────────────────────────────────────────────────────────────────────
    def test_tc06_demo_qty_exceeds_capacity_fails(self):
        """TC06 [Demo]: demo_qty > capacity_qty must raise ValidationError"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Demo Installation"
        vl.company = COMPANY
        vl.append("custom_asset_maintenance_item", {
            "item_code": ITEM,
            "capacity_qty": 100.0,
            "demo_qty": 200.0,
        })
        with self.assertRaises(frappe.ValidationError):
            vl.validate()

    # TC07 ─────────────────────────────────────────────────────────────────────
    def test_tc07_demo_qty_within_capacity_passes(self):
        """TC07 [Demo]: demo_qty <= capacity_qty must pass validation"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Demo Installation"
        vl.company = COMPANY
        vl.append("custom_asset_maintenance_item", {
            "item_code": ITEM,
            "capacity_qty": 100.0,
            "demo_qty": 50.0,
        })
        try:
            vl.validate()
        except frappe.ValidationError:
            self.fail("TC07 FAIL: demo_qty within capacity should pass")

    # TC08 ─────────────────────────────────────────────────────────────────────
    def test_tc08_demo_installation_skips_stock_consume(self):
        """TC08 [Demo]: _stock_entry_auto_consumed_entry must return early for Demo Installation"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Demo Installation"
        vl.company = COMPANY
        vl.maintenance_status = "Completed"
        vl.warehouse = WHOUSE
        vl.append("custom_asset_maintenance_item", {
            "item_code": ITEM,
            "refill_qty": 10.0,
            "capacity_qty": 100.0,
        })
        # Should NOT raise — must skip silently for Demo Installation
        try:
            vl._stock_entry_auto_consumed_entry()
        except Exception as e:
            self.fail(f"TC08 FAIL: Demo Installation should skip stock entry creation — got: {e}")


# ─────────────────────────────────────────────────────────────────────────────
# ACTUAL INSTALLATION FLOW
# ─────────────────────────────────────────────────────────────────────────────
class TestVisitLogInstallationFlow(FrappeTestCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.mi = frappe.get_doc({
            "doctype": "Machine Installation and Un-Installation",
            "installation_type": "Installation",
            "maintenance_team": "new",
            "assigned_to": "Administrator",
            "material_warehouse": WHOUSE,
            "planned_installation_date": "2026-06-01",
            "machine_items": [{"asset": ASSET}],
        })
        cls.mi.insert(ignore_permissions=True)
        frappe.db.commit()

    @classmethod
    def tearDownClass(cls):
        frappe.delete_doc(
            "Machine Installation and Un-Installation",
            cls.mi.name, force=True, ignore_permissions=True
        )
        frappe.db.commit()
        super().tearDownClass()

    # TC09 ─────────────────────────────────────────────────────────────────────
    def test_tc09_installation_validation_throws_when_no_mi(self):
        """TC09 [Install]: _ai_and_mi_in_demo raises when MI not linked for Installation visit"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Installation"
        vl.company = COMPANY
        with self.assertRaises(frappe.ValidationError):
            vl._ai_and_mi_in_demo()

    # TC10 ─────────────────────────────────────────────────────────────────────
    def test_tc10_uninstallation_requires_am_and_se_receipt(self):
        """TC10 [Install]: Uninstallation VL without AM/SE Receipt raises both error messages"""
        vl = frappe.get_doc({
            "doctype": "Visit Log",
            "visit_type": "Uninstallation",
            "company": COMPANY,
            "machine_installation": self.mi.name,
            "maintenance_status": "Planned",
        })
        vl.insert(ignore_permissions=True)
        frappe.db.commit()
        try:
            with self.assertRaises(frappe.ValidationError) as ctx:
                vl._validation_for_ar_and_mr_uninstallation()
            msg = str(ctx.exception)
            self.assertIn("Asset Receipt", msg)
            self.assertIn("Material Receipt", msg)
        finally:
            frappe.delete_doc("Visit Log", vl.name, force=True, ignore_permissions=True)
            frappe.db.commit()

    # TC11 ─────────────────────────────────────────────────────────────────────
    def test_tc11_no_items_skips_stock_entry_creation(self):
        """TC11 [Install]: _stock_entry_auto_consumed_entry with no items creates nothing"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Maintenance"
        vl.company = COMPANY
        vl.maintenance_status = "Completed"
        vl.warehouse = WHOUSE
        # No items in custom_asset_maintenance_item
        try:
            vl._stock_entry_auto_consumed_entry()
        except Exception as e:
            self.fail(f"TC11 FAIL: Empty items should silently skip SE creation — got: {e}")

    # TC12 ─────────────────────────────────────────────────────────────────────
    def test_tc12_balance_qty_exceeds_capacity_fails(self):
        """TC12 [Install]: existing_qty + refill_qty > capacity_qty raises ValidationError"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Maintenance"
        vl.company = COMPANY
        vl.append("custom_asset_maintenance_item", {
            "item_code": ITEM,
            "capacity_qty": 100.0,
            "existing_qty": 80.0,
            "refill_qty": 30.0,   # 80+30=110 > 100
        })
        with self.assertRaises(frappe.ValidationError):
            vl.validate()

    # TC13 ─────────────────────────────────────────────────────────────────────
    def test_tc13_balance_qty_within_capacity_passes(self):
        """TC13 [Install]: existing_qty + refill_qty <= capacity_qty must pass"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Maintenance"
        vl.company = COMPANY
        vl.append("custom_asset_maintenance_item", {
            "item_code": ITEM,
            "capacity_qty": 100.0,
            "existing_qty": 50.0,
            "refill_qty": 30.0,   # 50+30=80 <= 100
        })
        try:
            vl.validate()
        except frappe.ValidationError:
            self.fail("TC13 FAIL: Balance within capacity should pass")

    # TC14 ─────────────────────────────────────────────────────────────────────
    def test_tc14_uninstallation_type_skips_installation_validation(self):
        """TC14 [Install]: Uninstallation visit type must NOT trigger Installation AM/SE check"""
        vl = frappe.new_doc("Visit Log")
        vl.visit_type = "Uninstallation"
        vl.company = COMPANY
        try:
            vl._ai_and_mi_in_demo()
        except frappe.ValidationError:
            self.fail("TC14 FAIL: Uninstallation type should skip Installation validation")
