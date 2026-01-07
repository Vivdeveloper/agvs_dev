frappe.pages['erpnext'].on_page_load = function (wrapper) {
  const page = frappe.ui.make_app_page({
    parent: wrapper,
    title: 'Asset List',
    single_column: true
  });

  // ---------------- UI: Filters ----------------
  const f = {};
  const $filters = $(`<div style="margin:10px 0;display:flex;gap:8px;flex-wrap:wrap;"></div>`).appendTo(page.body);

  function make(fieldtype, options, placeholder, fieldname) {
    const ctrl = frappe.ui.form.make_control({
      df: { fieldtype, options, placeholder, fieldname },
      parent: $filters,
      render_input: true
    });
    ctrl.$input.on('change keyup', () => loadAssets());
    return ctrl;
  }

  f.company  = make('Link', 'Company',        'Company',     'company');
  f.name     = make('Data', null,             'Asset Name',  'asset_name');
  f.category = make('Link', 'Asset Category', 'Category',    'asset_category');
  f.location = make('Link', 'Location',       'Location',    'location');
  f.owner    = make('Link', 'Employee',       'Owner',       'custodian');

  // ---------------- UI: Cards container ----------------
  const $cont = $(`<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:15px;"></div>`).appendTo(page.body);

  // ---------------- Helpers ----------------
  const barColor = (pct) => pct < 30 ? '#d9534f' : (pct < 70 ? '#f0ad4e' : '#5cb85c');
  const clamp0 = (n) => Math.max(0, Number(n) || 0);
  const pct = (cur, cap) => cap > 0 ? Math.round((cur / cap) * 100) : 0;

  // Detect the child-table field on the asset doc that holds capacity/current
  function findChildArrayWithQty(asset_doc) {
    // Prefer arrays (child tables) that have objects with both fields
    const keys = Object.keys(asset_doc || {});
    for (const k of keys) {
      const v = asset_doc[k];
      if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
        // check first row for fields
        const row = v[0] || {};
        if ('capacity_quantity' in row || 'current_quantity' in row) {
          return v; // this array is our child table
        }
      }
    }
    // fallback: return empty list
    return [];
  }

  // Render one asset card: overall first, then per row
  function renderAssetCard(asset, items) {
    // aggregate
    let totalCap = 0, totalCur = 0;
    for (const it of items) {
      totalCap += clamp0(it.capacity_quantity);
      totalCur += clamp0(it.current_quantity);
    }
    const overallPct = pct(totalCur, totalCap);

    // overall block
    const overallHTML = `
      <div style="margin-top:10px;text-align:left;">
        <div style="font-size:13px;margin-bottom:3px;">
          <b>Overall:</b> ${totalCur}/${totalCap} (${overallPct}%)
        </div>
        <div style="background:#ddd;border-radius:6px;overflow:hidden;height:14px;">
          <div style="width:${overallPct}%;background:${barColor(overallPct)};height:100%;"></div>
        </div>
      </div>
    `;

    // per-entry blocks
    let rowsHTML = '';
    for (const it of items) {
      const cap = clamp0(it.capacity_quantity);
      const cur = clamp0(it.current_quantity);
      const p   = pct(cur, cap);
      rowsHTML += `
        <div style="margin-top:8px;text-align:left;">
          <div style="font-size:12px;margin-bottom:2px;">
            <b>${(it.item_code || '(no code)')}</b>
            (${cur}/${cap} ${it.uom || ''}) - ${p}%
          </div>
          <div style="background:#eee;border-radius:6px;overflow:hidden;height:10px;">
            <div style="width:${p}%;background:${barColor(p)};height:100%;"></div>
          </div>
        </div>
      `;
    }

    // card
    $cont.append(`
      <div style="width:260px;border:1px solid #ddd;border-radius:8px;padding:10px;
                  text-align:center;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
        <img src="${asset.image || '/assets/frappe/images/default-img.png'}"
             style="width:100%;height:130px;object-fit:contain;border-radius:6px;margin-bottom:8px;">
        <h5 style="margin:4px 0;">${asset.asset_name || 'Unnamed'}</h5>
        <p style="margin:0;font-size:13px;color:#555;"><b>Code:</b> ${asset.name}</p>
        ${overallHTML}
        ${rowsHTML}
      </div>
    `);
  }

  // ---------------- Loader ----------------
  function loadAssets() {
    const filters = {};
    if (f.company.get_value())  filters.company        = f.company.get_value();
    if (f.name.get_value())     filters.asset_name     = ['like', `%${f.name.get_value()}%`];
    if (f.category.get_value()) filters.asset_category = f.category.get_value();
    if (f.location.get_value()) filters.location       = f.location.get_value();
    if (f.owner.get_value())    filters.custodian      = f.owner.get_value();

    frappe.call({
      method: 'frappe.client.get_list',
      args: {
        doctype: 'Asset',
        fields: ['name','asset_name','image'],
        filters,
        limit_page_length: 50
      },
      callback: (r) => {
        $cont.empty();
        const assets = r.message || [];
        if (!assets.length) {
          $cont.html(`<p style="color:#888;">No Assets Found</p>`);
          return;
        }

        assets.forEach(a => {
          // get full doc so we can read child rows
          frappe.call({
            method: 'frappe.client.get',
            args: { doctype: 'Asset', name: a.name },
            callback: (res) => {
              const doc   = res.message || {};
              const items = findChildArrayWithQty(doc); // auto-detect the right child table
              renderAssetCard(a, items);
            }
          });
        });
      }
    });
  }

  // initial load
  loadAssets();
};












// frappe.pages['erpnext'].on_page_load = function (wrapper) {
//   const page = frappe.ui.make_app_page({
//     parent: wrapper,
//     title: 'Asset List',
//     single_column: true
//   });

//   // ---------------- UI: Filters ----------------
//   const f = {};
//   const $filters = $(`<div style="margin:10px 0;display:flex;gap:8px;flex-wrap:wrap;"></div>`).appendTo(page.body);

//   function make(fieldtype, options, placeholder, fieldname) {
//     const ctrl = frappe.ui.form.make_control({
//       df: { fieldtype, options, placeholder, fieldname },
//       parent: $filters,
//       render_input: true
//     });
//     ctrl.$input.on('change keyup', () => loadAssets());
//     return ctrl;
//   }

//   f.company  = make('Link', 'Company',        'Company',     'company');
//   f.name     = make('Data', null,             'Asset Name',  'asset_name');
//   f.category = make('Link', 'Asset Category', 'Category',    'asset_category');
//   f.location = make('Link', 'Location',       'Location',    'location');
//   f.owner    = make('Link', 'Employee',       'Owner',       'custodian');

//   // ---------------- UI: Cards container ----------------
//   const $cont = $(`<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:15px;"></div>`).appendTo(page.body);

//   // ---------------- Helpers ----------------
//   // ✅ Better color logic for progress bar
//   const barColor = (pctRaw) => {
//     const pct = Math.max(0, Math.min(100, Number(pctRaw) || 0));
//     if (pct >= 90) return '#28a745';   // Green - full/high
//     if (pct >= 60) return '#ffc107';   // Amber - mid
//     return '#dc3545';                  // Red - low
//   };

//   const clamp0 = (n) => Math.max(0, Number(n) || 0);
//   const pct = (cur, cap) => cap > 0 ? Math.round((cur / cap) * 100) : 0;

//   // Detect the child-table field on the asset doc that holds capacity/current
//   function findChildArrayWithQty(asset_doc) {
//     const keys = Object.keys(asset_doc || {});
//     for (const k of keys) {
//       const v = asset_doc[k];
//       if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
//         const row = v[0] || {};
//         if ('capacity_quantity' in row || 'current_quantity' in row) {
//           return v; // this array is our child table
//         }
//       }
//     }
//     return [];
//   }

//   // Render one asset card: overall first, then per row
//   function renderAssetCard(asset, items) {
//     // aggregate
//     let totalCap = 0, totalCur = 0;
//     for (const it of items) {
//       totalCap += clamp0(it.capacity_quantity);
//       totalCur += clamp0(it.current_quantity);
//     }
//     const overallPct = pct(totalCur, totalCap);

//     // overall block
//     const overallHTML = `
//       <div style="margin-top:10px;text-align:left;">
//         <div style="font-size:13px;margin-bottom:3px;">
//           <b>Overall:</b> ${totalCur}/${totalCap} (${overallPct}%)
//         </div>
//         <div style="background:#ddd;border-radius:6px;overflow:hidden;height:14px;">
//           <div style="width:${overallPct}%;background:${barColor(overallPct)};height:100%;"></div>
//         </div>
//       </div>
//     `;

//     // per-entry blocks
//     let rowsHTML = '';
//     for (const it of items) {
//       const cap = clamp0(it.capacity_quantity);
//       const cur = clamp0(it.current_quantity);
//       const p   = pct(cur, cap);
//       rowsHTML += `
//         <div style="margin-top:8px;text-align:left;">
//           <div style="font-size:12px;margin-bottom:2px;">
//             <b>${(it.item_code || '(no code)')}</b>
//             (${cur}/${cap} ${it.uom || ''}) - ${p}%
//           </div>
//           <div style="background:#eee;border-radius:6px;overflow:hidden;height:10px;">
//             <div style="width:${p}%;background:${barColor(p)};height:100%;"></div>
//           </div>
//         </div>
//       `;
//     }

//     // card
//     $cont.append(`
//       <div style="width:260px;border:1px solid #ddd;border-radius:8px;padding:10px;
//                   text-align:center;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,0.1);">
//         <img src="${asset.image || '/assets/frappe/images/default-img.png'}"
//              style="width:100%;height:130px;object-fit:contain;border-radius:6px;margin-bottom:8px;">
//         <h5 style="margin:4px 0;">${asset.asset_name || 'Unnamed'}</h5>
//         <p style="margin:0;font-size:13px;color:#555;"><b>Code:</b> ${asset.name}</p>
//         ${overallHTML}
//         ${rowsHTML}
//       </div>
//     `);
//   }

//   // ---------------- Loader ----------------
//   function loadAssets() {
//     const filters = {};
//     if (f.company.get_value())  filters.company        = f.company.get_value();
//     if (f.name.get_value())     filters.asset_name     = ['like', `%${f.name.get_value()}%`];
//     if (f.category.get_value()) filters.asset_category = f.category.get_value();
//     if (f.location.get_value()) filters.location       = f.location.get_value();
//     if (f.owner.get_value())    filters.custodian      = f.owner.get_value();

//     frappe.call({
//       method: 'frappe.client.get_list',
//       args: {
//         doctype: 'Asset',
//         fields: ['name','asset_name','image'],
//         filters,
//         limit_page_length: 50
//       },
//       callback: (r) => {
//         $cont.empty();
//         const assets = r.message || [];
//         if (!assets.length) {
//           $cont.html(`<p style="color:#888;">No Assets Found</p>`);
//           return;
//         }

//         assets.forEach(a => {
//           frappe.call({
//             method: 'frappe.client.get',
//             args: { doctype: 'Asset', name: a.name },
//             callback: (res) => {
//               const doc   = res.message || {};
//               const items = findChildArrayWithQty(doc);
//               renderAssetCard(a, items);
//             }
//           });
//         });
//       }
//     });
//   }

//   // initial load
//   loadAssets();
// };
