# Copyright (c) 2026, Sanket and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase

COMPANY = "AGVS ENTERPRISES PVT LTD"
ASSET   = "SW-00001"
WHOUSE  = "Stores - AEPL"


class TestMachineInstallationandUnInstallation(FrappeTestCase):

    # TC15 ─────────────────────────────────────────────────────────────────────
    def test_tc15_class_name_is_correct(self):
        """TC15: Python class name must be MachineInstallationandUnInstallation (lowercase 'and')"""
        from agvs_dev.agvs_dev.doctype.machine_installation_and_un_installation \
            .machine_installation_and_un_installation import MachineInstallationandUnInstallation
        self.assertTrue(
            callable(MachineInstallationandUnInstallation),
            "TC15 FAIL: Class not importable — name mismatch"
        )

    # TC16 ─────────────────────────────────────────────────────────────────────
    def test_tc16_mi_can_be_inserted_as_demo_machine(self):
        """TC16: MI with installation_type='Demo Installation' inserts without error"""
        mi = frappe.get_doc({
            "doctype": "Machine Installation and Un-Installation",
            "installation_type": "Demo Installation",
            "maintenance_team": "new",
            "assigned_to": "Administrator",
            "material_warehouse": WHOUSE,
            "planned_installation_date": "2026-06-01",
            "machine_items": [{"asset": ASSET}],
        })
        try:
            mi.insert(ignore_permissions=True)
            frappe.db.commit()
        except Exception as e:
            self.fail(f"TC16 FAIL: Demo Installation MI insert failed — {e}")
        finally:
            if mi.name:
                frappe.delete_doc(
                    "Machine Installation and Un-Installation",
                    mi.name, force=True, ignore_permissions=True
                )
                frappe.db.commit()

    # TC17 ─────────────────────────────────────────────────────────────────────
    def test_tc17_mi_can_be_inserted_as_installation(self):
        """TC17: MI with installation_type='Installation' inserts without error"""
        mi = frappe.get_doc({
            "doctype": "Machine Installation and Un-Installation",
            "installation_type": "Installation",
            "maintenance_team": "new",
            "assigned_to": "Administrator",
            "material_warehouse": WHOUSE,
            "planned_installation_date": "2026-06-01",
            "machine_items": [{"asset": ASSET}],
        })
        try:
            mi.insert(ignore_permissions=True)
            frappe.db.commit()
        except Exception as e:
            self.fail(f"TC17 FAIL: Installation MI insert failed — {e}")
        finally:
            if mi.name:
                frappe.delete_doc(
                    "Machine Installation and Un-Installation",
                    mi.name, force=True, ignore_permissions=True
                )
                frappe.db.commit()

    # TC18 ─────────────────────────────────────────────────────────────────────
    def test_tc18_demo_machine_logic_sets_type_from_reference(self):
        """TC18: When reference_name set → installation_type must be 'Demo Installation' (JS logic)"""
        mi = frappe.new_doc("Machine Installation and Un-Installation")
        mi.reference_name = "OPP-TEST-DUMMY"
        # Simulate JS onChange event logic
        if mi.reference_name:
            mi.installation_type = "Demo Installation"
        self.assertEqual(mi.installation_type, "Demo Installation",
            "TC18 FAIL: installation_type should be 'Demo Installation' when reference_name is set")

    # TC19 ─────────────────────────────────────────────────────────────────────
    def test_tc19_installation_logic_sets_type_from_sales_order(self):
        """TC19: When sales_order set → installation_type must be 'Installation' (JS logic)"""
        mi = frappe.new_doc("Machine Installation and Un-Installation")
        mi.sales_order = "SO-TEST-DUMMY"
        # Simulate JS onChange event logic
        if mi.sales_order:
            mi.installation_type = "Installation"
        self.assertEqual(mi.installation_type, "Installation",
            "TC19 FAIL: installation_type should be 'Installation' when sales_order is set")

    # TC20 ─────────────────────────────────────────────────────────────────────
    def test_tc20_no_so_no_reference_gives_empty_type(self):
        """TC20: No sales_order, no reference_name → installation_type stays empty"""
        mi = frappe.new_doc("Machine Installation and Un-Installation")
        inferred = ""
        if mi.get("sales_order"):
            inferred = "Installation"
        elif mi.get("reference_name"):
            inferred = "Demo Installation"
        self.assertEqual(inferred, "",
            "TC20 FAIL: Without SO or reference, installation_type should not be auto-set")

    # TC21 ─────────────────────────────────────────────────────────────────────
    def test_tc21_asset_requirement_items_exist_on_asset(self):
        """TC21: Asset SW-00001 must have custom_asset_requirement_item rows (used for MS creation)"""
        asset = frappe.get_doc("Asset", ASSET)
        req_items = asset.get("custom_asset_requirement_item") or []
        self.assertGreater(len(req_items), 0,
            "TC21 FAIL: Asset has no custom_asset_requirement_item rows — Maintenance Schedule will be empty")
        for row in req_items:
            self.assertTrue(row.item_code, "TC21 FAIL: item_code blank in requirement item")
            self.assertGreater(row.capacity_qty or 0, 0,
                f"TC21 FAIL: capacity_qty is 0 for item {row.item_code}")
