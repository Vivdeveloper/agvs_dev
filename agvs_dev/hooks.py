app_name = "agvs_dev"
app_title = "agvs_dev"
app_publisher = "Sanket"
app_description = "agvs_dev"
app_email = "sanketkatkade782@gmail.com"
app_license = "mit"

fixtures = [
	# Custom Role
	{"dt": "Role", "filters": [["is_custom", "=", 1]]},
	# Notifications (no proper folder structure in Frappe)
	{"dt": "Notification", "filters": [["name", "!=", ""]]},
	# Email Templates
	{"dt": "Email Template", "filters": [["name", "!=", ""]]},
	# Letter Head
	{"dt": "Letter Head", "filters": [["name", "!=", ""]]},
	# Translations
	{"dt": "Translation", "filters": [["name", "!=", ""]]},
	# Sales Order "Order Type" options (Sales / Maintenance(AMC))
	{"dt": "Property Setter", "filters": [["name", "=", "Sales Order-order_type-options"]]},
]




# Client Scripts for standard ERPNext doctypes (custom doctypes have their own doctype JS files)
doctype_js = {
	"Address": "public/js/address.js",
	"Asset": "public/js/asset.js",
	"Asset Maintenance Log": "public/js/asset_maintenance_log.js",
	"Asset Movement": "public/js/asset_movement.js",
	"Item": "public/js/item.js",
	"Lead": "public/js/lead.js",
	"Maintenance Schedule": "public/js/maintenance_schedule.js",
	"Maintenance Visit": "public/js/maintenance_visit.js",
	"Material Request": "public/js/material_request.js",
	"Opportunity": "public/js/opportunity.js",
	"Quotation": "public/js/quotation.js",
	"Sales Order": "public/js/sales_order.js",
	"Stock Entry": "public/js/stock_entry.js",
}
# DocType Class
# ---------------
# Override standard doctype classes

override_doctype_class = {
	"Opportunity": "agvs_dev.agvs_dev.events.opportunity.CustomOpportunity"
}

# Server Script Events for standard ERPNext doctypes
# (custom doctypes handle events via their Python controller class)
doc_events = {
	"Asset": {
		"validate": "agvs_dev.agvs_dev.events.asset.validate",
		"before_submit": "agvs_dev.agvs_dev.events.asset.validate_mandatory_on_submit",
		"on_submit": "agvs_dev.agvs_dev.events.asset.fetch_existing_balance",
	},
	"Asset Maintenance Log": {
		"before_save": "agvs_dev.agvs_dev.events.asset_maintenance_log.asset_maintenance_log_call_from_asset_item",
		"on_submit": "agvs_dev.agvs_dev.events.asset_maintenance_log.autogenerate_asset_movement_from_visit",
	},
	"Asset Maintenance Team": {
		"on_update": "agvs_dev.agvs_dev.events.asset_maintenance_team.create_user_permissions_entry",
	},
	"Item": {
		"before_naming": "agvs_dev.agvs_dev.events.item.set_item_naming_series",
	},
	"Job Requisition": {
		"before_insert": "agvs_dev.agvs_dev.events.job_requisition.job_requistion",
	},
	"Opportunity": {
		"before_insert": "agvs_dev.agvs_dev.events.opportunity.lead_to_opportunity",
	},
	"Asset Movement": {
		"on_submit": "agvs_dev.agvs_dev.events.asset_movement.on_submit",
	},
	"Stock Entry": {
		"on_submit": "agvs_dev.agvs_dev.events.stock_entry.on_submit",
	},
	"Maintenance Visit": {
		"before_submit": "agvs_dev.agvs_dev.events.maintenance_visit.before_submit",
		"on_submit": "agvs_dev.agvs_dev.events.maintenance_visit.on_submit",
	},
}

# Scheduled Tasks
scheduler_events = {
	"daily": [
		"agvs_dev.agvs_dev.events.scheduled_tasks.overdue_installation_status_auto_update",
		"agvs_dev.agvs_dev.events.scheduled_tasks.overdue_uninstallation_status_auto_update",
	],
}

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "agvs_dev",
# 		"logo": "/assets/agvs_dev/logo.png",
# 		"title": "agvs_dev",
# 		"route": "/agvs_dev",
# 		"has_permission": "agvs_dev.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/agvs_dev/css/agvs_dev.css"
# app_include_js = "/assets/agvs_dev/js/agvs_dev.js"

# include js, css files in header of web template
# web_include_css = "/assets/agvs_dev/css/agvs_dev.css"
# web_include_js = "/assets/agvs_dev/js/agvs_dev.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "agvs_dev/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "agvs_dev/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "agvs_dev.utils.jinja_methods",
# 	"filters": "agvs_dev.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "agvs_dev.install.before_install"
# after_install = "agvs_dev.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "agvs_dev.uninstall.before_uninstall"
# after_uninstall = "agvs_dev.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "agvs_dev.utils.before_app_install"
# after_app_install = "agvs_dev.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "agvs_dev.utils.before_app_uninstall"
# after_app_uninstall = "agvs_dev.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "agvs_dev.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }


# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"agvs_dev.tasks.all"
# 	],
# 	"daily": [
# 		"agvs_dev.tasks.daily"
# 	],
# 	"hourly": [
# 		"agvs_dev.tasks.hourly"
# 	],
# 	"weekly": [
# 		"agvs_dev.tasks.weekly"
# 	],
# 	"monthly": [
# 		"agvs_dev.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "agvs_dev.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "agvs_dev.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "agvs_dev.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["agvs_dev.utils.before_request"]
# after_request = ["agvs_dev.utils.after_request"]

# Job Events
# ----------
# before_job = ["agvs_dev.utils.before_job"]
# after_job = ["agvs_dev.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"agvs_dev.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

