import frappe

# create user permissions entry
def create_user_permissions_entry(doc, method=None):
    # ---------------------------------------
    # Collect current team members
    # ---------------------------------------
    current_members = []
    for row in doc.maintenance_team_members:
        if row.team_member:
            current_members.append(row.team_member)
    
    current_manager = doc.maintenance_manager
    
    
    # ---------------------------------------
    # 1. ENSURE team member self permissions
    # ---------------------------------------
    for user in current_members:
        exists = frappe.db.exists(
            "User Permission",
            {
                "user": user,
                "allow": "User",
                "for_value": user
            }
        )
    
        if not exists:
            frappe.get_doc({
                "doctype": "User Permission",
                "user": user,
                "allow": "User",
                "for_value": user,
                "apply_to_all_doctypes": 1
            }).insert(ignore_permissions=True)
    
    
    # ---------------------------------------
    # 2. ENSURE manager permissions (if exists)
    # ---------------------------------------
    if current_manager:
        # manager self
        if not frappe.db.exists(
            "User Permission",
            {
                "user": current_manager,
                "allow": "User",
                "for_value": current_manager
            }
        ):
            frappe.get_doc({
                "doctype": "User Permission",
                "user": current_manager,
                "allow": "User",
                "for_value": current_manager,
                "apply_to_all_doctypes": 1
            }).insert(ignore_permissions=True)
    
        # manager → members
        for user in current_members:
            if not frappe.db.exists(
                "User Permission",
                {
                    "user": current_manager,
                    "allow": "User",
                    "for_value": user
                }
            ):
                frappe.get_doc({
                    "doctype": "User Permission",
                    "user": current_manager,
                    "allow": "User",
                    "for_value": user,
                    "apply_to_all_doctypes": 1
                }).insert(ignore_permissions=True)
    
    
    # ---------------------------------------
    # 3. CLEANUP INVALID PERMISSIONS
    # ---------------------------------------
    valid_users = list(current_members)
    if current_manager:
        valid_users.append(current_manager)
    
    existing_perms = frappe.get_all(
        "User Permission",
        filters={
            "allow": "User",
            "apply_to_all_doctypes": 1
        },
        fields=["name", "user", "for_value"]
    )
    
    for perm in existing_perms:
    
        # A. Self permission removed (user not in team/manager)
        if perm.user == perm.for_value:
            if perm.user not in valid_users:
                frappe.delete_doc(
                    "User Permission",
                    perm.name,
                    ignore_permissions=True
                )
    
        # B. OLD manager permissions (manager removed)
        if perm.user != perm.for_value:
            if perm.for_value in current_members:
                # only allow manager → member
                if perm.user != current_manager:
                    frappe.delete_doc(
                        "User Permission",
                        perm.name,
                        ignore_permissions=True
                    )


