// frappe.pages["erpnext"].on_page_load = function (wrapper) {
//   const page = frappe.ui.make_app_page({
//     parent: wrapper,
//     title: "New Asset (UI)",
//     single_column: true,
//   });

//   // --- styles (scoped) ---
//   const css = `
//     #asset-ui { display:flex; gap:18px; align-items:flex-start; }
//     #asset-left { width:280px; position:sticky; top:70px; }
//     #asset-preview {
//       width:100%; height:220px; border:1px dashed #ccc; border-radius:8px;
//       display:flex; align-items:center; justify-content:center;
//       background:#1f2937; cursor:pointer; overflow:hidden;
//     }
//     #asset-preview span { color:#9ca3af; }
//     #asset-name-display { margin-top:10px; text-align:center; font-size:16px; font-weight:600; }
//     #asset-right { flex:1; }
//     #asset-right .field { margin-bottom:12px; }
//     #asset-right input { width:100%; padding:10px 12px; border:1px solid #374151; border-radius:8px; background:#111827; color:#e5e7eb; }
//   `;
//   $(wrapper).find("#page-erpnext-style").remove();
//   $('<style id="page-erpnext-style">').text(css).appendTo(document.head);

//   // --- layout ---
//   const $ui = $(`
//     <div id="asset-ui">
//       <div id="asset-left">
//         <div id="asset-preview"><span>Click to upload image</span></div>
//         <div id="asset-name-display"></div>
//       </div>
//       <div id="asset-right">
//         <div class="field">
//           <label>Asset Name</label>
//           <input type="text" id="asset-name-input" placeholder="Type asset name..." />
//         </div>
//       </div>
//     </div>
//   `);

//   $(page.body).empty().append($ui);

//   // --- image uploader ---
//   $("#asset-preview").on("click", function () {
//     frappe.ui.FileUploader.show({
//       allow_multiple: false,
//       folder: "Home/Assets",
//       on_success(file) {
//         setPreview(file.file_url);
//       },
//     });
//   });

//   // --- live name under image ---
//   $("#asset-name-input").on("input", function () {
//     $("#asset-name-display").text($(this).val());
//   });

//   function setPreview(url) {
//     const $box = $("#asset-preview");
//     $box.css({
//       "background-image": `url(${url})`,
//       "background-size": "cover",
//       "background-position": "center",
//     });
//     $box.empty();
//   }
// };
