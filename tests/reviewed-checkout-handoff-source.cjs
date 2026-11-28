function removeCheckoutFocus(source) {
 return source
  .replace(/  let checkoutOpener;\n[\s\S]*?(?=\/\/ BEGIN extracted opening state)/, '')
  .replace('  checkoutOpener = document.activeElement;\n', '')
  .replace("      document.getElementById('checkout-close')?.focus?.();\n", '')
  .replace(/    if \(context\.checkoutModal\?\.style\.display !== 'flex'\) \{[\s\S]*?    \}\n/, '')
  .replace("  const wasOpen = context.checkoutModal?.style.display === 'flex';\n", '')
  .replace('  if (wasOpen) restoreCheckoutFocus();\n', '');
}
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
function evidence(root){return JSON.parse(fs.readFileSync(path.join(root,'REVIEWED-CHECKOUT-HANDOFF-EXTRACTION-2026-11-27.json'),'utf8'));}
function reconstructDialogModule(root=path.join(__dirname,'..')){const e=evidence(root);let source=fs.readFileSync(path.join(root,'customer-checkout-dialog.js'),'utf8');source=removeCheckoutFocus(source);assert.equal(hash(source),e.moduleSha256);for(const r of e.regions){assert.equal(r.after.replaceAll('context.',''),r.before);assert.ok(source.includes(r.after));}assert.equal(source.split(e.addition+e.newExport).length,2);source=source.replace(e.addition+e.newExport,e.oldExport);assert.equal(hash(source),e.oldModuleSha256);return source;}
function reconstructReviewedHandoff(root=path.join(__dirname,'..')){const e=evidence(root);reconstructDialogModule(root);let source=require('./checkout-validation-alerts-source.cjs').reconstructValidationAlerts(root);assert.equal(source.split(e.initialization).length,2);source=source.replace(e.initialization,'');for(const r of e.regions){assert.equal(source.split(r.wrapper).length,2);source=source.replace(r.wrapper,r.before);}assert.equal(hash(source),e.originalSha256);return source;}
module.exports={reconstructReviewedHandoff,reconstructDialogModule};

module.exports.removeCheckoutFocus = removeCheckoutFocus;
