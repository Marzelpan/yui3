YUI.add("controller",function(a){},"@VERSION@",{requires:["base-build"]});YUI.add("model",function(g){var c=YUI.namespace("Env.Model"),f=g.JSON||f,d=g.Lang,h=g.Object,a="change",b="error";function e(){e.superclass.constructor.apply(this,arguments);}g.Model=g.extend(e,g.Base,{idAttribute:"id",initializer:function(i){this.changed={};this.lastChange={};},"delete":function(j,k){var i=this;if(typeof j==="function"){k=j;j={};}this.sync("delete",j,function(l){if(!l&&i.list){i.list.remove(i);}k&&k.apply(null,arguments);});return this;},generateClientId:function(){c.lastId||(c.lastId=0);return"c"+(c.lastId+=1);},getAsHTML:function(i){var j=this.get(i);return g.Escape.html(d.isValue(j)?String(j):"");},getAsURL:function(i){var j=this.get(i);return encodeURIComponent(d.isValue(j)?String(j):"");},isModified:function(){return this.isNew()||!h.isEmpty(this.changed);},isNew:function(){return !d.isValue(this.get("id"));},load:function(j,k){var i=this;if(typeof j==="function"){k=j;j={};}this.sync("read",j,function(m,l){if(!m){i.setAttrs(i.parse(l),j);i.changed={};}k&&k.apply(null,arguments);});return this;},parse:function(i){if(typeof i==="string"){if(f){try{return f.parse(i);}catch(j){this.fire(b,{type:"parse",error:j});return null;}}else{this.fire(b,{type:"parse",error:"Unable to parse response."});g.error("Can't parse JSON response because the json-parse "+"module isn't loaded.");return null;}}return i;},save:function(j,k){var i=this;if(typeof j==="function"){k=j;j={};}this.sync(this.isNew()?"create":"update",j,function(m,l){if(!m&&l){i.setAttrs(i.parse(l),j);i.changed={};}k&&k.apply(null,arguments);});return this;},set:function(k,l,j){var i={};i[k]=l;return this.setAttrs(i);},setAttrs:function(i,j){var p=this.changed,m=this.idAttribute,n,k,l,o;if(!this._validate(i)){return this;}j||(j={});o=j._transaction={};if(m!=="id"){if(h.owns(i,m)){i.id=i[m];}else{if(h.owns(i,"id")){i[m]=i.id;}}}for(k in i){if(h.owns(i,k)){this._setAttr(k,i[k],j);}}if(!j.silent&&!g.Object.isEmpty(o)){l=this.lastChange={};for(k in o){if(h.owns(o,k)){n=o[k];p[k]=n.newVal;l[k]={newVal:n.newVal,prevVal:n.prevVal,src:n.src||null};}}if(!this._changeEvent){this._changeEvent=this.publish(a,{preventable:false});}this.fire(a,{changed:l});}return this;},sync:function(){var i=g.Array(arguments,0,true).pop();if(typeof i==="function"){i();}},toJSON:function(){var i=this.getAttrs();delete i.clientId;delete i.destroyed;delete i.initialized;if(this.idAttribute!=="id"){delete i.id;}return i;},undo:function(n,j){var m=this.lastChange,l=this.idAttribute,i={},k;n||(n=h.keys(m));g.Array.each(n,function(o){if(h.owns(m,o)){o=o===l?"id":o;k=true;i[o]=m[o].prevVal;}});if(k){return this.setAttrs(i,j);}return true;},url:function(){return"";},validate:function(){},_validate:function(i){var j=this.validate(i);if(d.isValue(j)){this.fire(b,{type:"validate",attributes:i,error:j});return false;}return true;},_defAttrChangeFn:function(i){if(!this._setAttrVal(i.attrName,i.subAttrName,i.prevVal,i.newVal)){i.stopImmediatePropagation();}else{i.newVal=this.get(i.attrName);if(i._transaction){i._transaction[i.attrName]=i;}}}},{NAME:"model",ATTRS:{clientId:{valueFn:"generateClientId",readOnly:true},id:{value:null}}});},"@VERSION@",{optional:["json-parse"],requires:["base-build","escape"]});YUI.add("model-list",function(h){var g=h.JSON||g,e=h.Lang,d=h.Array,c="add",f="refresh",a="remove";function b(){b.superclass.constructor.apply(this,arguments);}h.ModelList=h.extend(b,h.Base,{model:null,initializer:function(j){j||(j={});var i=this.model=j.model||this.model;this.publish(c,{defaultFn:this._defAddFn});this.publish(f,{defaultFn:this._defRefreshFn});this.publish(a,{defaultFn:this._defRemoveFn});if(i){this.after("*:idChange",this._afterIdChange);}else{}this._clear();},add:function(n,k){var m,l,j;if(e.isArray(n)){m=[];for(l=0,j=n.length;l<j;++l){m.push(this._add(n[l],k));}return m;}else{return this._add(n,k);}},create:function(k,j,l){var i=this;if(typeof j==="function"){l=j;j={};}if(!(k instanceof h.Model)){k=new this.model(k);}return k.save(j,function(m){if(!m){i.add(k,j);}l&&l.apply(null,arguments);});},getByClientId:function(i){return this._clientIdMap[i]||null;},getById:function(i){return this._idMap[i]||null;},invoke:function(i){return d.invoke(this._items,i,d(arguments,1,true));},load:function(j,k){var i=this;if(typeof j==="function"){k=j;j={};}this.sync("read",j,function(m,l){if(!m){i.refresh(i.parse(l),j);}k&&k.apply(null,arguments);});return this;},map:function(i,j){return d.map(this._items,i,j);},parse:function(i){if(typeof i==="string"){if(g){try{return g.parse(i)||[];}catch(j){h.error("Failed to parse JSON response.");return null;}}else{h.error("Can't parse JSON response because the json-parse "+"module isn't loaded.");return null;}}return i||[];},refresh:function(k,i){i||(i={});var j=h.merge(i,{src:"refresh",models:d.map(k,function(l){return l instanceof h.Model?l:new this.model(l);},this)});i.silent?this._defRefreshFn(j):this.fire(f,j);return this;},remove:function(n,k){var l,j,m;if(e.isArray(n)){m=[];for(l=0,j=n.length;l<j;++l){m.push(this._remove(n[l],k));}return m;}else{return this._remove(n,k);}},sort:function(j){var i=this.comparator,l=this._items.concat(),k;if(!i){return this;}j||(j={});l.sort(function(n,m){var p=i(n),o=i(m);return p<o?-1:(p>o?1:0);});k=h.merge(j,{models:l,src:"sort"});j.silent?this._defRefreshFn(k):this.fire(f,k);return this;},sync:function(){var i=d(arguments,0,true).pop();if(typeof i==="function"){i();}},toArray:function(){return this._items.concat();},toJSON:function(){return this.map(function(i){return i.toJSON();});},url:function(){return"";},_add:function(j,i){var k;i||(i={});if(!(j instanceof h.Model)){j=new this.model(j);}if(this._clientIdMap[j.get("clientId")]){h.error("Model already in list.");return;}k=h.merge(i,{index:this._findIndex(j),model:j});i.silent?this._defAddFn(k):this.fire(c,k);return j;},_attachList:function(i){if(i.list){i.list.remove(i);}i.list=this;i.addTarget(this);},_detachList:function(i){delete i.list;i.removeTarget(this);
},_clear:function(){d.each(this._items,this._detachList,this);this._clientIdMap={};this._idMap={};this._items=[];},_findIndex:function(m){if(!this._items.length){return 0;}if(!this.comparator){return this._items.length;}var j=this.comparator,k=this._items,i=k.length,n=0,p=j(m),o,l;while(n<i){l=(n+i)/2;o=k[l];if(o&&j(o)<p){n=l+1;}else{i=l;}}return n;},_remove:function(k,j){var i=this.indexOf(k),l;j||(j={});if(i===-1){h.error("Model not in list.");return;}l=h.merge(j,{index:i,model:k});j.silent?this._defRemoveFn(l):this.fire(a,l);return k;},_afterIdChange:function(i){i.prevVal&&delete this._idMap[i.prevVal];i.newVal&&(this._idMap[i.newVal]=i.target);},_defAddFn:function(j){var i=j.model,k=i.get("id");this._clientIdMap[i.get("clientId")]=i;if(k){this._idMap[k]=i;}this._attachList(i);this._items.splice(j.index,0,i);},_defRefreshFn:function(i){if(i.src==="sort"){this._items=i.models.concat();return;}this._clear();if(i.models.length){this.add(i.models,{silent:true});}},_defRemoveFn:function(j){var i=j.model,k=i.get("id");this._detachList(i);delete this._clientIdMap[i.get("clientId")];if(k){delete this._idMap[k];}this._items.splice(j.index,1);}},{NAME:"modelList"});h.augment(b,h.ArrayList);h.ArrayList.addMethod(b.prototype,["get","getAsHTML","getAsURL"]);},"@VERSION@",{requires:["array-extras","array-invoke","arraylist","base-build","model"]});YUI.add("view",function(b){function a(){a.superclass.constructor.apply(this,arguments);}b.View=b.extend(a,b.Base,{container:"<div/>",events:{},template:"",initializer:function(c){c||(c={});this.model=c.model;this.create(c.container||this.container);this.events=c.events?b.merge(this.events,c.events):this.events;this.attachEvents(this.events);},destructor:function(){this.container&&this.container.remove(true);},attachEvents:function(g){var d=this.container,i=b.Object.owns,h,e,f,c;for(c in g){if(!i(g,c)){continue;}e=g[c];for(f in e){if(!i(e,f)){continue;}h=e[f];if(typeof h==="string"){h=this[h];}d.delegate(f,h,c,this);}}},create:function(c){this.container=typeof c==="string"?b.Node.create(c):b.one(c);return this;},remove:function(){this.container.remove();return this;},render:function(){return this;}},{NAME:"view"});},"@VERSION@",{requires:["base-build","node-event-delegate"]});YUI.add("app",function(a){},"@VERSION@",{use:["controller","model","model-list","view"]});