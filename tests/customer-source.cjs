const fs=require('node:fs'),path=require('node:path');
// Existing focused source tests inspect the actual ordered script bodies,
// whether the page embeds them or references the extracted classic scripts.
module.exports=function customerSource(file){return fs.readFileSync(file,'utf8').replace(/<script src="\/(customer-(?:menu-basket|checkout)\.js)\?[^"\n]+"><\/script>/g,(_,name)=>'<script>'+fs.readFileSync(path.join(path.dirname(file),name),'utf8')+'</script>');};
